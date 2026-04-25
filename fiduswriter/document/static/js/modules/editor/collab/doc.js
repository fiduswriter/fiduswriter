import {receiveTransaction, sendableSteps} from "prosemirror-collab"
import {EditorState} from "prosemirror-state"
import {Step} from "prosemirror-transform"
import {Dialog, activateWait, deactivateWait, makeWorker} from "../../common"
import {SchemaExport} from "../../schema/export"
import {E2EEEncryptor} from "../e2ee/encryptor"
import {E2EEKeyManager} from "../e2ee/key-manager"
import {enterPasswordDialog} from "../e2ee/password-dialog"
import {
    getSelectionUpdate,
    removeCollaboratorSelection,
    updateCollaboratorSelection
} from "../state_plugins"
import {Merge} from "./merge"

export class ModCollabDoc {
    constructor(mod) {
        mod.doc = this
        this.mod = mod
        this.merge = new Merge(mod)
        this.unconfirmedDiffs = {}
        this.confirmStepsRequestCounter = 0
        this.awaitingDiffResponse = false
        this.receiving = false
        this.currentlyCheckingVersion = false
        this.footnoteRender = false // If the offline user edited a footnote , it needs to be rendered properly to connected users too!
        this.initialVersionConfirmed = false
        this.initialDocLoaded = false
        this.templateAdjustmentPending = false
    }

    cancelCurrentlyCheckingVersion() {
        this.currentlyCheckingVersion = false
        window.clearTimeout(this.enableCheckVersion)
    }

    checkVersion(offline = false) {
        // Guard: WebSocket may not be initialized yet (e.g. during
        // loadDocument before the WS connector is created).
        if (!this.mod.editor.ws) {
            return
        }
        this.mod.editor.ws.send(() => {
            if (
                this.currentlyCheckingVersion ||
                this.mod.editor.docInfo.version === undefined
            ) {
                return
            }
            this.currentlyCheckingVersion = true
            this.enableCheckVersion = window.setTimeout(() => {
                this.currentlyCheckingVersion = false
            }, 1000)
            if (this.mod.editor.ws.connected) {
                this.disableDiffSending()
            }

            const msg = {
                type: "check_version",
                v: this.mod.editor.docInfo.version
            }
            if (offline) {
                msg.offline = true
            }
            return msg
        })
    }

    disableDiffSending() {
        this.awaitingDiffResponse = true
        // If no answer has been received from the server within 2 seconds,
        // check the version
        this.sendNextDiffTimer = window.setTimeout(() => {
            this.awaitingDiffResponse = false
            this.sendToCollaborators()
        }, 8000)
    }

    enableDiffSending() {
        window.clearTimeout(this.sendNextDiffTimer)
        this.awaitingDiffResponse = false
        this.sendToCollaborators()
    }

    receiveDocument(data) {
        this.cancelCurrentlyCheckingVersion()
        if (
            this.mod.editor.docInfo.confirmedDoc &&
            !this.mod.editor.e2ee?.encrypted
        ) {
            this.merge.adjustDocument(data)
        } else {
            this.loadDocument(data)
        }
    }

    finishInitialLoad() {
        if (
            this.initialDocLoaded &&
            this.initialVersionConfirmed &&
            !this.templateAdjustmentPending
        ) {
            deactivateWait()
            this.mod.editor.waitingForDocument = false
        }
    }

    confirmVersion(version) {
        if (!this.mod.editor.docInfo.confirmedDoc) {
            return
        }
        if (!this.initialVersionConfirmed) {
            this.initialVersionConfirmed = true
            if (version === this.mod.editor.docInfo.version) {
                this.finishInitialLoad()
            }
        }
    }

    loadDocument({doc, time, doc_info}) {
        const isInitialLoad = !this.mod.editor.docInfo.confirmedDoc
        // Reset collaboration
        this.unconfirmedDiffs = {}
        if (this.awaitingDiffResponse) {
            this.enableDiffSending()
        }

        this.mod.editor.clientTimeAdjustment = Date.now() - time

        const token = this.mod.editor.docInfo.token
        this.mod.editor.docInfo = doc_info
        this.mod.editor.docInfo.token = token
        // For guests, update user object with the token UUID (stable identity)
        // and session_id (for display). Token UUID persists across reconnections.
        // session_id may not be present when loading from REST (it comes via
        // the session_info WebSocket message). Only update if available.
        if (
            !this.mod.editor.user.is_authenticated &&
            doc_info.session_id !== undefined
        ) {
            const sessionId = doc_info.session_id
            this.mod.editor.user = {
                id: token, // stable — same token UUID even after reconnect
                username: `guest${sessionId}`, // display name per session
                name: `Guest ${sessionId}`,
                is_authenticated: false
            }
        }
        this.mod.editor.docInfo.token = token
        this.mod.editor.docInfo.version = doc.v
        this.mod.editor.docInfo.updated = new Date()

        // Check if this is an E2EE document. If so, we need to decrypt
        // the content before loading it into ProseMirror.
        const isE2EE = doc_info.e2ee === true
        if (isE2EE) {
            this._loadE2EEDocument(doc, doc_info, isInitialLoad)
        } else {
            this.mod.editor.e2ee = {encrypted: false}
            this._loadUnencryptedDocument(doc, isInitialLoad)
        }
    }

    /**
     * Load an E2EE document: prompt for password, decrypt, then load.
     * @private
     */
    async _loadE2EEDocument(doc, doc_info, isInitialLoad) {
        // Extract password from URL fragment if present (share link format:
        // https://example.com/share/TOKEN/#target?password=PASSWORD). The fragment is never
        // sent to the server, so this is safe.
        const locationHash = window.location.hash
        let urlFragmentPassword = ""
        if (locationHash && locationHash.includes("?")) {
            urlFragmentPassword = decodeURIComponent(
                new URLSearchParams(locationHash.split("?")[1]).get(
                    "password"
                ) || ""
            )
        }

        // Get the salt and iterations. These may come from the REST response
        // (doc_info) or from the WebSocket session_info message (already
        // stored in this.mod.editor.e2ee).
        let salt, iterations
        if (this.mod.editor.e2ee) {
            salt = this.mod.editor.e2ee.encryptionSalt
            iterations = this.mod.editor.e2ee.encryptionIterations
        }
        if (doc_info.e2ee_salt) {
            salt = doc_info.e2ee_salt
        }
        if (doc_info.e2ee_iterations) {
            iterations = doc_info.e2ee_iterations
        }

        // If the key is already available (e.g. from _createE2EEDocument),
        // skip the password dialog and decrypt directly. This avoids
        // double-prompting when creating a new E2EE document.
        const existingKey = this.mod.editor.e2ee?.key
        if (existingKey) {
            try {
                await this._decryptAndLoadDoc(
                    doc,
                    existingKey,
                    salt,
                    iterations,
                    isInitialLoad,
                    urlFragmentPassword
                )
            } catch (error) {
                console.error(
                    "E2EE: Decryption failed with existing key",
                    error
                )
                // The existing key didn't work — fall through to password
                // prompt. Clear the stale key first.
                if (this.mod.editor.e2ee) {
                    this.mod.editor.e2ee.key = null
                }
                await this._promptPasswordAndDecrypt(
                    doc,
                    doc_info,
                    salt,
                    iterations,
                    isInitialLoad,
                    urlFragmentPassword
                )
            }
            return
        }

        // No key available — prompt for the password
        await this._promptPasswordAndDecrypt(
            doc,
            doc_info,
            salt,
            iterations,
            isInitialLoad,
            urlFragmentPassword
        )
    }

    /**
     * Prompt for a password, derive the key, and decrypt/load the document.
     * @private
     */
    async _promptPasswordAndDecrypt(
        doc,
        doc_info,
        salt,
        iterations,
        isInitialLoad,
        urlFragmentPassword
    ) {
        // Decode the salt from Base64 to Uint8Array
        let saltBytes = null
        if (salt) {
            const binary = atob(salt)
            saltBytes = new Uint8Array(binary.length)
            for (let i = 0; i < binary.length; i++) {
                saltBytes[i] = binary.charCodeAt(i)
            }
        }

        const goBack = () => {
            const folderPath = this.mod.editor.docInfo.path.slice(
                0,
                this.mod.editor.docInfo.path.lastIndexOf("/")
            )
            if (this.mod.editor.app && this.mod.editor.app.goTo) {
                if (!folderPath.length) {
                    this.mod.editor.app.goTo("/")
                } else {
                    this.mod.editor.app.goTo(`/documents${folderPath}/`)
                }
            } else {
                window.location.href = "/"
            }
        }

        await enterPasswordDialog(
            async password => {
                try {
                    const key = await E2EEKeyManager.deriveKey(
                        password,
                        saltBytes,
                        iterations || 600000
                    )
                    await this._decryptAndLoadDoc(
                        doc,
                        key,
                        salt,
                        iterations,
                        isInitialLoad,
                        urlFragmentPassword
                    )
                } catch (_error) {
                    console.error("E2EE DECRYPT ERROR:", _error)
                    if (typeof window !== "undefined") {
                        window.lastE2EEDecryptError =
                            _error?.message || String(_error)
                    }
                    const errorDialog = new Dialog({
                        title: gettext("Decryption Failed"),
                        id: "e2ee-decryption-failed",
                        body: gettext(
                            "The password you entered is incorrect, or the document data is corrupted. Please try again."
                        ),
                        buttons: [
                            {
                                text: gettext("Retry"),
                                classes: "fw-dark",
                                click: () => {
                                    this._promptPasswordAndDecrypt(
                                        doc,
                                        doc_info,
                                        salt,
                                        iterations,
                                        isInitialLoad,
                                        ""
                                    )
                                }
                            },
                            {
                                text: gettext("Cancel"),
                                classes: "fw-light",
                                click: () => {
                                    errorDialog.close()
                                    goBack()
                                }
                            }
                        ],
                        canClose: false
                    })
                    errorDialog.open()
                }
            },
            urlFragmentPassword,
            goBack
        )
    }

    /**
     * Decrypt document content/comments/bibliography with the given key
     * and load into ProseMirror.
     *
     * For a newly created E2EE document, no encrypted snapshot has been
     * saved yet, so the content/comments/bibliography are still plaintext
     * JSON objects (the template content). We detect this by checking
     * whether the value is a string (encrypted = Base64 ciphertext) or
     * an object (plaintext).
     *
     * @private
     */
    async _decryptAndLoadDoc(
        doc,
        key,
        salt,
        iterations,
        isInitialLoad,
        urlFragmentPassword
    ) {
        let decryptedContent = doc.content
        if (typeof doc.content === "string") {
            decryptedContent = await E2EEEncryptor.decryptObject(
                doc.content,
                key
            )
        }

        let decryptedComments = doc.comments
        if (typeof doc.comments === "string") {
            decryptedComments = await E2EEEncryptor.decryptObject(
                doc.comments,
                key
            )
        }

        let decryptedBibliography = doc.bibliography
        if (typeof doc.bibliography === "string") {
            decryptedBibliography = await E2EEEncryptor.decryptObject(
                doc.bibliography,
                key
            )
        }

        // Store the E2EE state on the editor
        this.mod.editor.e2ee = {
            encrypted: true,
            encryptionSalt: salt,
            encryptionIterations: iterations || 600000,
            key: key,
            snapshotManager: this.mod.editor.e2ee?.snapshotManager || null
        }
        // Initialize snapshot manager now that we have the key
        if (!this.mod.editor.e2ee.snapshotManager) {
            const {E2EESnapshotManager} = await import(
                "../e2ee/snapshot-manager"
            )
            this.mod.editor.e2ee.snapshotManager = new E2EESnapshotManager(
                this.mod.editor
            )
        }
        this.mod.editor.e2ee.snapshotManager.setKey(key)

        // Remove the password from the URL fragment to avoid
        // leaving it in the address bar or browser history.
        if (urlFragmentPassword && window.history.replaceState) {
            const hash = window.location.hash // "#title?password=fish&targetting=true"
            const [anchor, queryString] = hash.split("?") // ["#title", "password=fish&targetting=true"]

            const params = new URLSearchParams(queryString || "")
            params.delete("password") // Removes "password" if it exists

            const newQueryString = params.toString()
            const newHash = newQueryString
                ? `${anchor}?${newQueryString}`
                : anchor

            window.history.replaceState(null, "", newHash)
        }

        // Decrypt image copyright metadata for E2EE documents.
        // The server stores it as an opaque encrypted string; we decrypt
        // it here so the image DB receives plaintext objects.
        let decryptedImages = doc.images
        if (doc.images) {
            decryptedImages = {}
            const {E2EEEncryptor} = await import("../e2ee/encryptor")
            for (const [id, image] of Object.entries(doc.images)) {
                decryptedImages[id] = image
                if (typeof image.copyright === "string") {
                    try {
                        decryptedImages[id].copyright =
                            await E2EEEncryptor.decryptObject(
                                image.copyright,
                                key
                            )
                    } catch (_e) {
                        // If decryption fails, leave as-is (legacy plaintext)
                    }
                }
            }
        }

        // Now load the decrypted document using the standard path
        const decryptedDoc = {
            ...doc,
            content: decryptedContent,
            comments: decryptedComments,
            bibliography: decryptedBibliography,
            images: decryptedImages
        }
        this._loadUnencryptedDocument(decryptedDoc, isInitialLoad)

        // For newly created E2EE documents, the initial content is still
        // plaintext (it came from the template). We need to send an initial
        // encrypted snapshot so the server stores encrypted content.
        // We detect a new document by checking if the content was plaintext
        // (not a Base64 string) and this is the initial load.
        const isNewE2EEDocument =
            isInitialLoad && typeof doc.content !== "string"
        if (isNewE2EEDocument && this.mod.editor.e2ee.snapshotManager) {
            this.mod.editor.e2ee.snapshotManager.sendInitialSnapshot(
                decryptedContent,
                decryptedComments,
                decryptedBibliography,
                this.mod.editor.docInfo.version
            )
        }

        // Now that the key is available and the document is loaded, open the
        // WebSocket connection. This ensures encrypted catch-up diffs (ep)
        // from the server can be decrypted as soon as they arrive.
        if (this.mod.editor.ws && !this.mod.editor.ws.connected) {
            this.mod.editor.startWebSocket()
        }
    }

    /**
     * Load an unencrypted (or already decrypted) document into ProseMirror.
     * This is the original loadDocument logic, extracted for reuse.
     * @private
     */
    _loadUnencryptedDocument(doc, isInitialLoad) {
        // Remember location hash to scroll there subsequently.
        const [locationHash, _queryString] = window.location.hash.split("?")
        this.mod.editor.mod.db.bibDB.setDB(doc.bibliography)
        this.mod.editor.mod.db.imageDB.setDB(doc.images)
        const stateDoc = this.mod.editor.schema.nodeFromJSON(doc.content)
        const plugins = this.mod.editor.statePlugins.map(plugin => {
            if (plugin[1]) {
                return plugin[0](plugin[1](doc))
            } else {
                return plugin[0]()
            }
        })

        const stateConfig = {
            schema: this.mod.editor.schema,
            doc: stateDoc,
            plugins
        }

        // Set document in prosemirror
        this.mod.editor.view.setProps({state: EditorState.create(stateConfig)})
        this.mod.editor.view.setProps({nodeViews: {}}) // Needed to initialize nodeViews in plugins
        // Set initial confirmed doc
        this.mod.editor.docInfo.confirmedDoc = this.mod.editor.view.state.doc

        // Render footnotes based on main doc
        this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()

        //  Setup comment handling
        this.mod.editor.mod.comments.store.reset()
        this.mod.editor.mod.comments.store.loadComments(doc.comments)
        this.mod.editor.mod.marginboxes.view(this.mod.editor.view)
        if (locationHash && locationHash.length) {
            this.mod.editor.scrollIdIntoView(locationHash.slice(1))
        }
        // Update the header bar to reflect the loaded document's title.
        // This is needed because setStyles() (which calls headerView.update())
        // runs before loadDocument(), so the header still shows "Untitled"
        // from the empty initial document.
        if (this.mod.editor.menu.headerView) {
            this.mod.editor.menu.headerView.update()
        }
        if (isInitialLoad) {
            this.initialDocLoaded = true
        } else {
            deactivateWait()
            this.mod.editor.waitingForDocument = false
        }
        if (doc.template) {
            // We received the template. That means we are the first user present with write access.
            // We will adjust the document to the template if necessary.
            // For E2EE documents, the content has already been decrypted
            // by this point, so template adjustment works normally.
            if (isInitialLoad) {
                this.templateAdjustmentPending = true
            }
            activateWait(true, gettext("Updating document. Please wait..."))
            const activateWaitTimer = setTimeout(() => {
                activateWait(
                    true,
                    gettext(
                        "It's taking a bit longer than usual, but it should be ready soon. Please wait..."
                    )
                )
            }, 60000)
            const adjustWorker = makeWorker(
                staticUrl("js/adjust_doc_to_template_worker.js")
            )
            adjustWorker.onmessage = message => {
                if (message.data.type === "result") {
                    if (message.data.steps.length) {
                        const tr = this.mod.editor.view.state.tr
                        message.data.steps.forEach(step =>
                            tr.step(Step.fromJSON(this.mod.editor.schema, step))
                        )
                        tr.setMeta("remote", true)
                        this.mod.editor.view.dispatch(tr)
                    }
                    // clearing timer for updating message since operation is completed
                    clearTimeout(activateWaitTimer)
                    if (isInitialLoad) {
                        this.templateAdjustmentPending = false
                        this.finishInitialLoad()
                    } else {
                        deactivateWait()
                    }
                    this.setDocSettings()
                }
            }
            adjustWorker.onerror = error => console.error(error)
            const schemaExporter = new SchemaExport()
            adjustWorker.postMessage({
                schemaSpec: JSON.parse(schemaExporter.init()),
                doc: doc.content,
                template: doc.template.content,
                documentStyleSlugs:
                    this.mod.editor.mod.documentTemplate.documentStyles.map(
                        style => style.slug
                    )
            })
        } else {
            this.setDocSettings()
            if (isInitialLoad) {
                this.finishInitialLoad()
            }
        }
    }

    setDocSettings() {
        // Set part specific settings
        this.mod.editor.mod.documentTemplate.addDocPartSettings()
        this.mod.editor.mod.documentTemplate.addCitationStylesMenuEntries()
    }

    sendToCollaborators() {
        // Guard: WebSocket may not be initialized yet (e.g. during
        // loadDocument before the WS connector is created).
        if (!this.mod.editor.ws) {
            return
        }

        // For E2EE documents, we need to encrypt diffs before sending.
        // Since encryption is async, we use a separate code path.
        const isE2EE =
            this.mod.editor.e2ee &&
            this.mod.editor.e2ee.encrypted &&
            this.mod.editor.e2ee.key

        if (isE2EE) {
            this._sendE2EEDiff()
            return
        }

        // Handle either doc change and comment updates OR caret update. Priority
        // for doc change/comment update.
        this.mod.editor.ws.send(() => {
            if (
                this.awaitingDiffResponse ||
                this.mod.editor.waitingForDocument ||
                this.receiving
            ) {
                return false
            } else if (
                sendableSteps(this.mod.editor.view.state) ||
                this.mod.editor.mod.comments.store.unsentEvents().length ||
                this.mod.editor.mod.db.bibDB.unsentEvents().length ||
                this.mod.editor.mod.db.imageDB.unsentEvents().length
            ) {
                this.disableDiffSending()
                const stepsToSend = sendableSteps(this.mod.editor.view.state),
                    fnStepsToSend = sendableSteps(
                        this.mod.editor.mod.footnotes.fnEditor.view.state
                    ),
                    commentUpdates =
                        this.mod.editor.mod.comments.store.unsentEvents(),
                    bibliographyUpdates =
                        this.mod.editor.mod.db.bibDB.unsentEvents(),
                    imageUpdates = this.mod.editor.mod.db.imageDB.unsentEvents()

                if (
                    !stepsToSend &&
                    !fnStepsToSend &&
                    !commentUpdates.length &&
                    !bibliographyUpdates.length &&
                    !imageUpdates.length
                ) {
                    // no diff. abandon operation
                    return
                }
                const rid = this.confirmStepsRequestCounter++,
                    unconfirmedDiff = {
                        type: "diff",
                        v: this.mod.editor.docInfo.version,
                        rid
                    }

                unconfirmedDiff["cid"] = this.mod.editor.client_id

                if (stepsToSend) {
                    unconfirmedDiff["ds"] = stepsToSend.steps.map(s =>
                        s.toJSON()
                    )
                    // In case the title changed, we also add a title field to
                    // update the title field instantly - important for the
                    // document overview page.
                    let newTitle = ""
                    this.mod.editor.view.state.doc.firstChild.forEach(child => {
                        if (
                            !child.marks.find(
                                mark => mark.type.name === "deletion"
                            )
                        ) {
                            newTitle += child.textContent
                        }
                    })
                    newTitle = newTitle.slice(0, 255)
                    let oldTitle = ""
                    this.mod.editor.docInfo.confirmedDoc.firstChild.forEach(
                        child => {
                            if (
                                !child.marks.find(
                                    mark => mark.type.name === "deletion"
                                )
                            ) {
                                oldTitle += child.textContent
                            }
                        }
                    )
                    oldTitle = oldTitle.slice(0, 255)
                    if (newTitle !== oldTitle) {
                        unconfirmedDiff["ti"] = newTitle
                    }
                }

                if (fnStepsToSend) {
                    // We add the client ID to every single step
                    unconfirmedDiff["fs"] = fnStepsToSend.steps.map(s =>
                        s.toJSON()
                    )
                }
                if (this.footnoteRender) {
                    unconfirmedDiff["footnoterender"] = true
                    this.footnoteRender = false
                }
                if (commentUpdates.length) {
                    unconfirmedDiff["cu"] = commentUpdates
                }
                if (bibliographyUpdates.length) {
                    unconfirmedDiff["bu"] = bibliographyUpdates
                }
                if (imageUpdates.length) {
                    unconfirmedDiff["iu"] = imageUpdates
                }

                this.unconfirmedDiffs[rid] = Object.assign(
                    {doc: this.mod.editor.view.state.doc},
                    unconfirmedDiff
                )
                return unconfirmedDiff
            } else if (
                this.mod.editor.currentView?.state &&
                getSelectionUpdate(this.mod.editor.currentView.state)
            ) {
                const currentView = this.mod.editor.currentView

                if (this.lastSelectionUpdateState === currentView.state) {
                    // Selection update has been sent for this state already. Skip
                    return false
                }
                this.lastSelectionUpdateState = currentView.state
                // Create a new caret as the current user
                const selectionUpdate = getSelectionUpdate(currentView.state)
                return {
                    type: "selection_change",
                    id: this.mod.editor.user.id,
                    v: this.mod.editor.docInfo.version,
                    session_id: this.mod.editor.docInfo.session_id,
                    anchor: selectionUpdate.anchor,
                    head: selectionUpdate.head,
                    // Whether the selection is in the footnote or the main editor
                    editor:
                        currentView === this.mod.editor.view
                            ? "main"
                            : "footnotes"
                }
            } else {
                return false
            }
        })
    }

    /**
     * Send an encrypted diff for an E2EE document.
     *
     * For E2EE documents, the diff payload (steps, comments, bibliography,
     * image updates) is encrypted as a single blob before sending. The
     * server relays the encrypted diff to other clients without being able
     * to read the content.
     *
     * The unencrypted diff is stored locally in `unconfirmedDiffs` for
     * confirmation/rejection handling. Only the wire format is encrypted.
     *
     * @private
     */
    async _sendE2EEDiff() {
        // Check if there's anything to send
        if (
            this.awaitingDiffResponse ||
            this.mod.editor.waitingForDocument ||
            this.receiving
        ) {
            // No diff to send, but check for selection update.
            // Guard: the editor view may not be initialized yet
            // (e.g. during loadDocument before ProseMirror is set up).
            if (this.mod.editor.view) {
                this._sendE2EESelectionChange()
            }
            return
        }

        if (
            !sendableSteps(this.mod.editor.view.state) &&
            !this.mod.editor.mod.comments.store.unsentEvents().length &&
            !this.mod.editor.mod.db.bibDB.unsentEvents().length &&
            !this.mod.editor.mod.db.imageDB.unsentEvents().length
        ) {
            // No diff, check for selection update
            if (this.mod.editor.view) {
                this._sendE2EESelectionChange()
            }
            return
        }

        this.disableDiffSending()

        const stepsToSend = sendableSteps(this.mod.editor.view.state),
            fnStepsToSend = sendableSteps(
                this.mod.editor.mod.footnotes.fnEditor.view.state
            ),
            commentUpdates = this.mod.editor.mod.comments.store.unsentEvents(),
            bibliographyUpdates = this.mod.editor.mod.db.bibDB.unsentEvents(),
            imageUpdates = this.mod.editor.mod.db.imageDB.unsentEvents()

        if (
            !stepsToSend &&
            !fnStepsToSend &&
            !commentUpdates.length &&
            !bibliographyUpdates.length &&
            !imageUpdates.length
        ) {
            // no diff. abandon operation
            this.enableDiffSending()
            return
        }

        const rid = this.confirmStepsRequestCounter++,
            unconfirmedDiff = {
                type: "diff",
                v: this.mod.editor.docInfo.version,
                rid
            }

        unconfirmedDiff["cid"] = this.mod.editor.client_id

        // Collect the payload fields that need encryption
        const encryptedPayload = {}

        if (stepsToSend) {
            encryptedPayload["ds"] = stepsToSend.steps.map(s => s.toJSON())
            // Track title changes for the document overview
            let newTitle = ""
            this.mod.editor.view.state.doc.firstChild.forEach(child => {
                if (!child.marks.find(mark => mark.type.name === "deletion")) {
                    newTitle += child.textContent
                }
            })
            newTitle = newTitle.slice(0, 255)
            let oldTitle = ""
            this.mod.editor.docInfo.confirmedDoc.firstChild.forEach(child => {
                if (!child.marks.find(mark => mark.type.name === "deletion")) {
                    oldTitle += child.textContent
                }
            })
            oldTitle = oldTitle.slice(0, 255)
            if (newTitle !== oldTitle) {
                // For E2EE documents, the title is encrypted too.
                // We don't send "ti" in plaintext; it goes in the
                // encrypted payload.
                encryptedPayload["ti"] = newTitle
            }
        }

        if (fnStepsToSend) {
            encryptedPayload["fs"] = fnStepsToSend.steps.map(s => s.toJSON())
        }
        if (this.footnoteRender) {
            unconfirmedDiff["footnoterender"] = true
            this.footnoteRender = false
        }
        if (commentUpdates.length) {
            encryptedPayload["cu"] = commentUpdates
        }
        if (bibliographyUpdates.length) {
            encryptedPayload["bu"] = bibliographyUpdates
        }
        if (imageUpdates.length) {
            encryptedPayload["iu"] = imageUpdates
        }

        // Store the unencrypted diff locally for confirmation handling.
        // We keep the plaintext steps so confirmDiff can apply them.
        this.unconfirmedDiffs[rid] = Object.assign(
            {doc: this.mod.editor.view.state.doc},
            unconfirmedDiff,
            encryptedPayload
        )

        try {
            // Encrypt the payload fields as a single blob
            const key = this.mod.editor.e2ee.key
            const ep = await E2EEEncryptor.encryptObject(encryptedPayload, key)

            // Build the wire-format diff: metadata in plaintext,
            // payload encrypted
            const wireDiff = {
                type: "diff",
                v: unconfirmedDiff.v,
                rid: unconfirmedDiff.rid,
                cid: unconfirmedDiff.cid,
                ep // encrypted payload
            }
            if (unconfirmedDiff.footnoterender) {
                wireDiff.footnoterender = true
            }

            // Send the encrypted diff
            this.mod.editor.ws.send(() => wireDiff)
        } catch (error) {
            console.error("E2EE: Failed to encrypt diff", error)
            // Re-enable diff sending so we can try again
            this.enableDiffSending()
        }
    }

    /**
     * Send a selection change for an E2EE document.
     * Selection changes are not encrypted (they only contain cursor position).
     *
     * @private
     */
    _sendE2EESelectionChange() {
        if (
            !this.mod.editor.currentView ||
            !this.mod.editor.currentView.state
        ) {
            return
        }
        if (!getSelectionUpdate(this.mod.editor.currentView.state)) {
            return
        }
        const currentView = this.mod.editor.currentView
        if (this.lastSelectionUpdateState === currentView.state) {
            return
        }
        this.lastSelectionUpdateState = currentView.state
        const selectionUpdate = getSelectionUpdate(currentView.state)
        this.mod.editor.ws.send(() => ({
            type: "selection_change",
            id: this.mod.editor.user.id,
            v: this.mod.editor.docInfo.version,
            session_id: this.mod.editor.docInfo.session_id,
            anchor: selectionUpdate.anchor,
            head: selectionUpdate.head,
            editor: currentView === this.mod.editor.view ? "main" : "footnotes"
        }))
    }

    receiveSelectionChange(data) {
        const participant = this.mod.participants.find(
            par => par.id === data.id
        )
        let tr, fnTr
        if (!participant) {
            // participant is still unknown to us. Ignore
            return
        }
        if (data.editor === "footnotes") {
            fnTr = updateCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                participant,
                data
            )
            tr = removeCollaboratorSelection(this.mod.editor.view.state, data)
        } else {
            tr = updateCollaboratorSelection(
                this.mod.editor.view.state,
                participant,
                data
            )
            fnTr = removeCollaboratorSelection(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                data
            )
        }
        if (tr) {
            this.mod.editor.view.dispatch(tr)
        }
        if (fnTr) {
            this.mod.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
        }
    }

    receiveDiff(data, serverFix = false) {
        // Check if this is an encrypted diff for an E2EE document.
        // Encrypted diffs have an "ep" (encrypted payload) field instead
        // of plaintext ds/fs/cu/bu/iu fields. We decrypt the payload
        // first, then process the diff normally.
        if (data["ep"] && this.mod.editor.e2ee && this.mod.editor.e2ee.key) {
            this._receiveE2EEDiff(data, serverFix)
            return
        }
        this._processDiff(data, serverFix)
    }

    /**
     * Process a diff (unencrypted or already decrypted).
     * @private
     */
    _processDiff(data, serverFix = false) {
        this.mod.editor.docInfo.version++
        if (data["bu"]) {
            // bibliography updates
            this.mod.editor.mod.db.bibDB.receive(data["bu"])
        }
        if (data["iu"]) {
            // images updates
            this.mod.editor.mod.db.imageDB.receive(data["iu"])
        }
        if (data["cu"]) {
            // comment updates
            this.mod.editor.mod.comments.store.receive(data["cu"])
        }
        if (data["ds"]) {
            // document steps
            this.applyDiffs(data["ds"], data["cid"])
        }
        if (data["fs"]) {
            // footnote steps
            this.mod.editor.mod.footnotes.fnEditor.applyDiffs(
                data["fs"],
                data["cid"]
            )
        }
        if (data["footnoterender"]) {
            // re-render footnotes properly
            this.mod.editor.mod.footnotes.fnEditor.renderAllFootnotes()
        }

        if (serverFix) {
            // Diff is a fix created by server due to missing diffs.
            if ("reject_request_id" in data) {
                delete this.unconfirmedDiffs[data.reject_request_id]
            }
            this.cancelCurrentlyCheckingVersion()

            // There may be unsent local changes. Send them now after .5 seconds,
            // in case collaborators want to send something first.
            this.enableDiffSending()
            window.setTimeout(() => this.sendToCollaborators(), 500)
        }
    }

    /**
     * Receive and decrypt an E2EE diff from another client.
     *
     * For E2EE documents, diffs arrive with an "ep" (encrypted payload)
     * field containing the encrypted steps, comments, bibliography, and
     * image updates. This method decrypts the payload and then processes
     * the diff using the standard _processDiff path.
     *
     * @param {Object} data - The diff message with "ep" field
     * @param {boolean} serverFix - Whether this is a server-generated fix
     * @private
     */
    async _receiveE2EEDiff(data, serverFix = false) {
        try {
            const key = this.mod.editor.e2ee.key
            const decryptedPayload = await E2EEEncryptor.decryptObject(
                data["ep"],
                key
            )

            // Merge the decrypted payload with the metadata fields
            // that were sent in plaintext (cid, rid, footnoterender)
            const mergedData = {
                cid: data["cid"],
                rid: data["rid"],
                footnoterender: data["footnoterender"],
                reject_request_id: data["reject_request_id"],
                ...decryptedPayload
            }

            // Process the decrypted diff normally
            this._processDiff(mergedData, serverFix)
        } catch (error) {
            console.error("E2EE: Failed to decrypt incoming diff", error)
            // If decryption fails, we still need to increment the version
            // to stay in sync with the server, but we skip applying the
            // diff content.
            this.mod.editor.docInfo.version++
        }
    }

    setConfirmedDoc(tr, stepsLength) {
        // Find the latest version of the doc without any unconfirmed local changes

        const rebased = tr.getMeta("rebased"),
            docNumber = rebased + stepsLength

        this.mod.editor.docInfo.confirmedDoc =
            docNumber === tr.docs.length ? tr.doc : tr.docs[docNumber]
    }

    confirmDiff(request_id) {
        const unconfirmedDiffs = this.unconfirmedDiffs[request_id]
        if (!unconfirmedDiffs) {
            return
        }
        this.mod.editor.docInfo.version++

        const sentSteps = unconfirmedDiffs["ds"] // document steps
        if (sentSteps) {
            const ourIds = sentSteps.map(_step => this.mod.editor.client_id)
            const tr = receiveTransaction(
                this.mod.editor.view.state,
                sentSteps,
                ourIds
            )
            this.mod.editor.view.dispatch(tr)
            this.mod.editor.docInfo.confirmedDoc = unconfirmedDiffs["doc"]
        }

        const sentFnSteps = unconfirmedDiffs["fs"] // footnote steps
        if (sentFnSteps) {
            const fnTr = receiveTransaction(
                this.mod.editor.mod.footnotes.fnEditor.view.state,
                sentFnSteps,
                sentFnSteps.map(_step => this.mod.editor.client_id)
            )
            this.mod.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
        }

        const sentComments = unconfirmedDiffs["cu"] // comment updates
        if (sentComments) {
            this.mod.editor.mod.comments.store.eventsSent(sentComments)
        }

        const sentBibliographyUpdates = unconfirmedDiffs["bu"] // bibliography updates
        if (sentBibliographyUpdates) {
            this.mod.editor.mod.db.bibDB.eventsSent(sentBibliographyUpdates)
        }

        const sentImageUpdates = unconfirmedDiffs["iu"] // image updates
        if (sentImageUpdates) {
            this.mod.editor.mod.db.imageDB.eventsSent(sentImageUpdates)
        }

        delete this.unconfirmedDiffs[request_id]
        this.enableDiffSending()
    }

    rejectDiff(request_id) {
        delete this.unconfirmedDiffs[request_id]
        this.enableDiffSending()
    }

    applyDiffs(diffs, cid) {
        this.receiving = true
        const steps = diffs.map(j => Step.fromJSON(this.mod.editor.schema, j))
        const clientIds = diffs.map(_ => cid)
        const tr = receiveTransaction(
            this.mod.editor.view.state,
            steps,
            clientIds
        )
        tr.setMeta("remote", true)
        this.mod.editor.view.dispatch(tr)
        this.setConfirmedDoc(tr, steps.length)
        this.receiving = false
        this.sendToCollaborators()
    }
}

import {collab, sendableSteps} from "prosemirror-collab"
import {baseKeymap} from "prosemirror-commands"
import {dropCursor} from "prosemirror-dropcursor"
import {buildKeymap} from "prosemirror-example-setup"
import {gapCursor} from "prosemirror-gapcursor"
import {history} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {EditorState, TextSelection} from "prosemirror-state"
import {tableEditing} from "prosemirror-tables"
import {EditorView} from "prosemirror-view"
import {
    Dialog,
    WebSocketConnector,
    activateWait,
    addAlert,
    deactivateWait,
    ensureCSS,
    postJson,
    showSystemMessage,
    whenReady
} from "../common"
import {FeedbackTab} from "../feedback"

import * as plugins from "../../plugins/editor"
import {getSettings} from "../schema/convert"
import {docSchema} from "../schema/document"
import {ModCitations} from "./citations"
import {ModCollab} from "./collab"
import {ModComments} from "./comments"
import {ModDB} from "./databases"
import {ModDocumentTemplate} from "./document_template"
import {ModFootnotes} from "./footnotes"
import {ModMarginboxes} from "./marginboxes"
import {
    codeBlockMenuModel,
    figureMenuModel,
    figureWidthMenuModel,
    headerbarModel,
    imageMenuModel,
    navigatorFilterModel,
    orderedListMenuModel,
    selectionMenuModel,
    tableMenuModel,
    toolbarModel
} from "./menus"
import {ModNavigator} from "./navigator"
import {ModTrack, acceptAllNoInsertions, amendTransaction} from "./track"

import {ExportFidusFile} from "../exporter/native/file"
import {imageEditModel} from "../images/edit_dialog/model"
import {buildEditorKeymap} from "./keymap"
import {
    accessRightsPlugin,
    citationRenderPlugin,
    clipboardPlugin,
    codeBlockPlugin,
    collabCaretsPlugin,
    commentsPlugin,
    contributorInputPlugin,
    documentTemplatePlugin,
    figurePlugin,
    footnoteMarkersPlugin,
    headerbarPlugin,
    jumpHiddenNodesPlugin,
    linksPlugin,
    marginboxesPlugin,
    orderedListMenuPlugin,
    placeholdersPlugin,
    searchPlugin,
    selectionMenuPlugin,
    settingsPlugin,
    tablePlugin,
    tagInputPlugin,
    tocRenderPlugin,
    toolbarPlugin,
    trackPlugin
} from "./state_plugins"

// UUID v4 pattern for share tokens
const uuid4Pattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export const COMMENT_ONLY_ROLES = ["review", "comment"]
export const READ_ONLY_ROLES = ["read", "read-without-comments"]
export const REVIEW_ROLES = ["review", "review-tracked"]
export const WRITE_ROLES = ["write", "write-tracked", "review-tracked"]

export class Editor {
    // A class that contains everything that happens on the editor page.
    // It is currently not possible to initialize more than one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor({app, user}, path, idString) {
        this.app = app
        // For unauthenticated guests, replace the bare config object with a
        // proper placeholder that has all the fields templates expect.
        this.user = user.is_authenticated
            ? user
            : {id: undefined, username: "", name: "", is_authenticated: false}
        this.mod = {}
        // Whether the editor is currently waiting for a document update. Set to true
        // initially so that diffs that arrive before document has been loaded are not
        // dealt with.
        this.waitingForDocument = true

        this.docInfo = {
            rights: "",
            owner: undefined,
            is_owner: false,
            confirmedDoc: false, // The latest doc as confirmed by the server.
            updated: false, // Latest update time stamp
            dir: "ltr", // standard direction, used in input fields, etc.
            path // Default doc path.
        }
        if (uuid4Pattern.test(idString)) {
            // Share token — store the raw UUID; init() will resolve it to a real doc id
            this.docInfo.id = idString
            this.docInfo.token = idString
        } else {
            let id = Number.parseInt(idString)
            if (isNaN(id)) {
                id = 0
                let templateId = Number.parseInt(idString.slice(1))
                if (isNaN(templateId)) {
                    templateId = 1
                }
                this.docInfo.templateId = templateId
            }
            this.docInfo.id = id
        }
        this.schema = docSchema

        this.menu = {
            headerbarModel: headerbarModel(),
            imageMenuModel: imageMenuModel(),
            navigatorFilterModel: navigatorFilterModel(),
            orderedListMenuModel: orderedListMenuModel(),
            selectionMenuModel: selectionMenuModel(),
            imageEditModel: imageEditModel(),
            tableMenuModel: tableMenuModel(),
            figureMenuModel: figureMenuModel(),
            toolbarModel: toolbarModel(),
            figureWidthMenuModel: figureWidthMenuModel(),
            codeBlockMenuModel: codeBlockMenuModel()
        }
        this.client_id = Math.floor(Math.random() * 0xffffffff)
        this.clientTimeAdjustment = 0

        this.pathEditable = true // Set to false through plugin to disable path editing.

        this.statePlugins = [
            [keymap, () => buildEditorKeymap(this.schema)],
            [keymap, () => buildKeymap(this.schema)],
            [keymap, () => baseKeymap],
            [collab, () => ({clientID: this.client_id})],
            [linksPlugin, () => ({editor: this})],
            [history],
            [dropCursor],
            [gapCursor],
            [tableEditing],
            [jumpHiddenNodesPlugin],
            [placeholdersPlugin, () => ({editor: this})],
            [citationRenderPlugin, () => ({editor: this})],
            [headerbarPlugin, () => ({editor: this})],
            [toolbarPlugin, () => ({editor: this})],
            [selectionMenuPlugin, () => ({editor: this})],
            [collabCaretsPlugin, () => ({editor: this})],
            [footnoteMarkersPlugin, () => ({editor: this})],
            [commentsPlugin, () => ({editor: this})],
            [marginboxesPlugin, () => ({editor: this})],
            [tagInputPlugin, () => ({editor: this})],
            [contributorInputPlugin, () => ({editor: this})],
            [clipboardPlugin, () => ({editor: this, viewType: "main"})],
            [accessRightsPlugin, () => ({editor: this})],
            [settingsPlugin, () => ({editor: this})],
            [documentTemplatePlugin, () => ({editor: this})],
            [trackPlugin, () => ({editor: this})],
            [tablePlugin, () => ({editor: this})],
            [orderedListMenuPlugin, () => ({editor: this})],
            [figurePlugin, () => ({editor: this})],
            [codeBlockPlugin, () => ({editor: this})],
            [tocRenderPlugin, () => ({editor: this})],
            [searchPlugin]
        ]
    }

    init() {
        ensureCSS([
            staticUrl("css/mathlive.css"),
            staticUrl("css/editor.css"),
            staticUrl("css/tags.css"),
            staticUrl("css/contributors.css"),
            staticUrl("css/document.css"),
            staticUrl("css/carets.css"),
            staticUrl("css/tracking.css"),
            staticUrl("css/margin_boxes.css"),
            staticUrl("css/prosemirror.css"),
            staticUrl("css/footnotes.css"),
            staticUrl("css/chat.css"),
            staticUrl("css/access_rights_dialog.css"),
            staticUrl("css/citation_dialog.css"),
            staticUrl("css/review.css"),
            staticUrl("css/add_remove_dialog.css"),
            staticUrl("css/bibliography.css"),
            staticUrl("css/dot_menu.css"),
            staticUrl("css/cropper.min.css"),
            staticUrl("css/inline_tools.css")
        ])
        new ModDocumentTemplate(this)
        const initPromises = [
            whenReady(),
            this.mod.documentTemplate.getCitationStyles()
        ]
        if (this.docInfo.hasOwnProperty("templateId")) {
            initPromises.push(
                postJson("/api/document/create_doc/", {
                    template_id: this.docInfo.templateId,
                    path: this.docInfo.path
                }).then(({json}) => {
                    this.docInfo.id = json.id
                    window.history.replaceState(
                        "",
                        "",
                        `/document/${this.docInfo.id}/`
                    )
                    delete this.docInfo.templateId
                    return Promise.resolve()
                })
            )
        }
        // Handle token-based access (share links)
        if (uuid4Pattern.test(this.docInfo.id)) {
            this.docInfo.token = this.docInfo.id
            initPromises.push(
                postJson(
                    `/api/document/share_token/validate/${this.docInfo.token}/`
                ).then(({json, status}) => {
                    if (status === 200 && json.document_id) {
                        this.docInfo.id = json.document_id
                        this.docInfo.access_rights = json.rights
                        this.docInfo.wsBase = json.ws_base
                        return Promise.resolve()
                    } else {
                        // Token is invalid or expired
                        return Promise.reject(
                            new Error("Invalid or expired share link")
                        )
                    }
                })
            )
        }
        return Promise.all(initPromises)
            .then(() => {
                new ModCitations(this)
                new ModFootnotes(this)
                return this.activateFidusPlugins()
            })
            .then(() => {
                // Render and initialize editor before fetching REST data
                // (the ProseMirror view must exist for receiveDocument to work)
                this.render()
                activateWait(true)
                this.initEditor()
                // Fetch document data via REST before WebSocket connects
                const stylesPayload = {id: this.docInfo.id}
                if (this.docInfo.token) {
                    stylesPayload.token = this.docInfo.token
                }
                const stylesPromise = postJson(
                    "/api/document/get_doc_styles/",
                    stylesPayload
                )
                const docDataPromise = postJson(
                    "/api/document/get_doc_data/",
                    stylesPayload
                )
                return Promise.all([stylesPromise, docDataPromise])
            })
            .then(([stylesResult, docResult]) => {
                // Apply styles
                this.mod.documentTemplate.setStyles(stylesResult.json)
                // Load document from REST data
                this.mod.collab.doc.receiveDocument(docResult.json)
                return Promise.resolve()
            })
            .catch(error => {
                // Only show "Invalid Share Link" for token validation errors.
                // Other errors (REST failures, etc.) should not show this dialog.
                if (error.message === "Invalid or expired share link") {
                    deactivateWait()
                    const errorDialog = new Dialog({
                        title: gettext("Invalid Share Link"),
                        id: "invalid_share_link_dialog",
                        body: gettext(
                            "This share link has expired or is invalid. Please ask the document owner for a new link."
                        ),
                        buttons: [
                            {
                                text: gettext("OK"),
                                classes: "fw-dark",
                                click: () => {
                                    window.location.href = "/"
                                }
                            }
                        ],
                        canClose: false
                    })
                    errorDialog.open()
                } else {
                    deactivateWait()
                    console.error("Editor initialization failed:", error)
                }
                return Promise.reject(error)
            })
            .then(() => {
                const wsBasePromise = this.docInfo.wsBase
                    ? Promise.resolve({json: {ws_base: this.docInfo.wsBase}})
                    : postJson("/api/document/get_ws_base/", {
                          id: this.docInfo.id
                      })
                return wsBasePromise
            })
            .then(({json}) => {
                let resubScribed = false
                // Include token in WebSocket path if present
                let wsPath = `/document/${this.docInfo.id}/`
                if (this.docInfo.token) {
                    wsPath += `?token=${this.docInfo.token}`
                }
                this.ws = new WebSocketConnector({
                    base: json.ws_base,
                    path: wsPath,
                    appLoaded: () => this.view.state.plugins.length,
                    anythingToSend: () => sendableSteps(this.view.state),
                    initialMessage: () => {
                        const message = {
                            type: "subscribe"
                        }

                        if (this.ws.connectionCount) {
                            message.connection = this.ws.connectionCount
                        }
                        // Send the document version so the server can reconcile
                        // (skip diffs we already have from the REST response)
                        if (this.docInfo.version) {
                            message.v = this.docInfo.version
                        }
                        return message
                    },
                    resubScribed: () => {
                        if (
                            sendableSteps(
                                this.mod.footnotes.fnEditor.view.state
                            )
                        ) {
                            this.mod.collab.doc.footnoteRender = true
                        }
                        resubScribed = true
                        this.mod.footnotes.fnEditor.renderAllFootnotes()
                        this.mod.collab.doc.awaitingDiffResponse = true // wait sending diffs till the version is confirmed
                    },
                    restartMessage: () => {
                        // Too many messages have been lost. Re-subscribe with
                        // current version so the server can reconcile.
                        const message = {
                            type: "subscribe"
                        }
                        if (this.ws.connectionCount) {
                            message.connection = this.ws.connectionCount
                        }
                        if (this.docInfo.version) {
                            message.v = this.docInfo.version
                        }
                        return message
                    },
                    messagesElement: () =>
                        this.dom.querySelector("#unobtrusive-messages"),
                    warningNotAllSent: gettext(
                        "Warning! Not all your changes have been saved! You could suffer data loss. Attempting to reconnect..."
                    ),
                    infoDisconnected: gettext(
                        "Disconnected. Attempting to reconnect..."
                    ),
                    receiveData: data => {
                        if (document.body !== this.dom) {
                            return // user navigated away.
                        }
                        switch (data.type) {
                            case "chat":
                                this.mod.collab.chat.newMessage(data)
                                break
                            case "connections":
                                this.mod.collab.updateParticipantList(
                                    data.participant_list
                                )
                                if (resubScribed) {
                                    // check version if only reconnected after being offline
                                    this.mod.collab.doc.checkVersion() // check version to sync the doc
                                    resubScribed = false
                                }
                                break
                            case "session_info":
                                this.docInfo.session_id = data.session_id
                                // Update access rights from server
                                if (data.access_right) {
                                    this.docInfo.access_rights =
                                        data.access_right
                                }
                                // Update guest user identity with session_id
                                if (!this.user.is_authenticated) {
                                    this.user = {
                                        id: this.docInfo.token,
                                        username: `guest${data.session_id}`,
                                        name: `Guest ${data.session_id}`,
                                        is_authenticated: false
                                    }
                                }
                                break
                            case "refetch_doc":
                                // Server cannot reconcile version via diffs.
                                // Re-fetch the document via REST and reload.
                                postJson("/api/document/get_doc_data/", {
                                    id: this.docInfo.id,
                                    token: this.docInfo.token
                                }).then(({json}) => {
                                    this.mod.collab.doc.receiveDocument(json)
                                })
                                break
                            case "confirm_version":
                                this.mod.collab.doc.cancelCurrentlyCheckingVersion()
                                if (data["v"] !== this.docInfo.version) {
                                    this.mod.collab.doc.checkVersion()
                                    return
                                }
                                this.mod.collab.doc.enableDiffSending()
                                break
                            case "selection_change":
                                this.mod.collab.doc.cancelCurrentlyCheckingVersion()
                                if (data["v"] !== this.docInfo.version) {
                                    this.mod.collab.doc.checkVersion()
                                    return
                                }
                                this.mod.collab.doc.receiveSelectionChange(data)
                                break
                            case "path_change":
                                this.docInfo.path = data["path"]
                                this.menu.headerView.update()
                                break
                            case "diff":
                                if (data["cid"] === this.client_id) {
                                    // The diff origins from the local user.
                                    this.mod.collab.doc.confirmDiff(data["rid"])
                                    return
                                }
                                if (data["v"] !== this.docInfo.version) {
                                    this.mod.collab.doc.checkVersion()
                                    return
                                }
                                this.mod.collab.doc.receiveDiff(data)
                                break
                            case "confirm_diff":
                                this.mod.collab.doc.confirmDiff(data["rid"])
                                break
                            case "reject_diff":
                                this.mod.collab.doc.rejectDiff(data["rid"])
                                break
                            case "patch_error":
                                showSystemMessage(
                                    gettext(
                                        "Your document was out of sync and has been reset."
                                    )
                                )
                                break
                            case "access_right":
                                if (
                                    data.access_right !==
                                    this.docInfo.access_rights
                                ) {
                                    if (
                                        sendableSteps(this.view.state) &&
                                        !WRITE_ROLES.includes(data.access_right)
                                    ) {
                                        // If the user's new rights does not allow him to update document , then download a copy of the
                                        // same and ask him to re-open the document.
                                        this.handleAccessRightModification()
                                    } else {
                                        addAlert(
                                            "info",
                                            interpolate(
                                                gettext(
                                                    "Your Access rights have been modified. You now have %(accessRight)s access to this document."
                                                ),
                                                {
                                                    accessRight:
                                                        data.access_right
                                                },
                                                true
                                            )
                                        )
                                        this.docInfo.access_rights =
                                            data.access_right
                                    }
                                }
                                break
                            default:
                                break
                        }
                    },
                    failedAuth: () => {
                        if (this.docInfo.token) {
                            // Token-based access failed
                            const tokenDialog = new Dialog({
                                title: gettext("Invalid Share Link"),
                                id: "invalid_token_dialog",
                                body: gettext(
                                    "This share link has expired or is invalid. Please ask the document owner for a new link."
                                ),
                                buttons: [
                                    {
                                        text: gettext("OK"),
                                        classes: "fw-dark",
                                        click: () => {
                                            window.location.href = "/"
                                        }
                                    }
                                ],
                                canClose: false
                            })
                            tokenDialog.open()
                            return
                        }
                        if (
                            this.view.state.plugins.length &&
                            sendableSteps(this.view.state) &&
                            this.ws.connectionCount > 0
                        ) {
                            this.ws.online = false // To avoid Websocket trying to reconnect.
                            const sessionDialog = new Dialog({
                                title: gettext("Session Expired"),
                                id: "session_expiration_dialog",
                                body: gettext(
                                    "Your session expired while you were offline, so we cannot save your work to the server any longer, but you can download it to your computer instead. Please consider importing it as a new document after logging in."
                                ),
                                buttons: [
                                    {
                                        text: gettext("Download Document"),
                                        click: () => {
                                            const doc = this.getDoc({
                                                use_current_view: true
                                            })
                                            new ExportFidusFile(
                                                doc,
                                                this.mod.db.bibDB,
                                                this.mod.db.imageDB,
                                                false
                                            )
                                        }
                                    },
                                    {
                                        text: gettext("Proceed to Login page"),
                                        classes: "fw-dark",
                                        click: () => {
                                            window.location.href = "/"
                                        }
                                    }
                                ],
                                canClose: false
                            })
                            sessionDialog.open()
                        } else {
                            window.location.href = "/"
                        }
                    }
                })
                // Initialize the WebSocket connection
                this.ws.init()
                // Add the close listener
                this.ws.ws.addEventListener("close", () => {
                    // Listen to close event and update the headerbar and toolbar view.
                    if (this.menu.toolbarViews) {
                        this.menu.toolbarViews.forEach(view => view.update())
                    }
                    if (this.menu.headerView) {
                        this.menu.headerView.update()
                    }
                })
            })
    }

    handleAccessRightModification() {
        // This function when invoked creates a copy of document in FW format and closes editor operation.
        new ExportFidusFile(
            this.getDoc({use_current_view: true}),
            this.mod.db.bibDB,
            this.mod.db.imageDB
        )
        const accessRightModifiedDialog = new Dialog({
            title: gettext("Access rights modified"),
            id: "access_rights_modified",
            body: gettext(
                "Your access rights were modified while you were offline, so we cannot save your work to the server any longer, and it is downloaded to your computer instead. Please consider importing it into a new document."
            ),
            buttons: [
                {
                    text: gettext("Leave editor"),
                    classes: "fw-dark",
                    click: () => {
                        window.location.href = "/"
                    }
                }
            ],
            canClose: false
        })
        accessRightModifiedDialog.open()
        this.close() // Close the editor operations.
    }

    close() {
        if (this.menu.toolbarViews) {
            this.menu.toolbarViews.forEach(view => view.destroy())
        }
        if (this.menu.selectionMenuViews) {
            this.menu.selectionMenuViews.forEach(view => view.destroy())
        }
        if (this.menu.headerView) {
            this.menu.headerView.destroy()
        }
        if (this.ws) {
            this.ws.close()
        }
    }

    render() {
        this.dom = document.createElement("body")
        document.body = this.dom
        this.dom.classList.add("editor")
        this.dom.classList.add("scrollable")
        this.dom.innerHTML = `<div id="editor">
            <div id="wait"><i class="fa fa-spinner fa-pulse"></i></div>
            <header>
                <nav id="headerbar"><div></div></nav>
                <nav id="toolbar"><div></div></nav>
            </header>
            <div id="navigator"></div>
            <div id="editor-content">
                <div id="flow">
                    <div id="paper-editable">
                        <div id="document-editable" class="user-contents"></div>
                        <div id="footnote-box-container" class="user-contents">
                            <div id="citation-footnote-box-container"></div>
                        </div>
                    </div>
                    <div id="bibliography" class="doc-bibliography user-contents"></div>
                </div>
                <nav id="selection-menu"><div></div></nav>
                <div id="margin-box-column">
                    <div id="margin-box-filter"></div>
                    <div id="margin-box-container"><div></div></div>
                </div>
            </div>
            <div id="chat">
                <i class="resize-button fa fa-angle-double-down"></i>
                <div id="chat-container"></div>
                <div id="messageform" contentEditable="true" class="empty"></div>
                <audio id="chat-notification">
                    <source src="${staticUrl("ogg/chat_notification.ogg")}" type="audio/ogg">
                </audio>
            </div>
        </div>
        <div id="unobtrusive-messages"></div>`
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    onResize() {
        if (!this.view || !this.mod.marginboxes) {
            // Editor not yet set up
            return
        }
        this.mod.marginboxes.updateDOM()
        this.mod.footnotes.layout.updateDOM()
        this.menu.toolbarViews.forEach(view => view.onResize())
    }

    onBeforeUnload() {
        if (this.app.isOffline()) {
            showSystemMessage(
                gettext(
                    "Changes you made to the document since going offline will be lost, if you choose to close/refresh the tab or close the browser."
                )
            )
            return true
        }
        this.close()
    }

    initEditor() {
        let setFocus = false
        this.view = new EditorView(
            this.dom.querySelector("#document-editable"),
            {
                state: EditorState.create({
                    schema: this.schema
                }),
                handleDOMEvents: {
                    focus: (view, _event) => {
                        if (!setFocus) {
                            this.currentView = this.view
                            // We focus once more, as focus may have disappeared due to
                            // disappearing placeholders.
                            setFocus = true
                            view.focus()
                            setFocus = false
                        }
                    }
                },
                dispatchTransaction: tr => {
                    const trackedTr = amendTransaction(
                        tr,
                        this.view.state,
                        this
                    )
                    const {state: newState, transactions} =
                        this.view.state.applyTransaction(trackedTr)
                    this.view.updateState(newState)
                    transactions.forEach(subTr => {
                        const footTr = subTr.getMeta("footTr")
                        if (footTr && footTr.steps.length) {
                            this.mod.footnotes.fnEditor.view.dispatch(footTr)
                        }
                    })
                    if (tr.steps.length) {
                        this.docInfo.updated = new Date()
                    }
                    // Update the header bar to reflect any title changes
                    if (this.menu.headerView) {
                        this.menu.headerView.update()
                    }

                    this.mod.collab.doc.sendToCollaborators()
                }
            }
        )
        // The editor that is currently being edited in -- main or footnote editor
        this.currentView = this.view
        this.mod.citations.init()
        this.mod.footnotes.init()
        new ModDB(this)
        new ModCollab(this)
        new ModTrack(this)
        new ModMarginboxes(this)
        this.mod.marginboxes.init()
        new ModComments(this)
        new ModNavigator(this)
        this.mod.navigator.init()
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        return Promise.all(
            Object.keys(plugins).map(plugin => {
                if (typeof plugins[plugin] === "function") {
                    this.plugins[plugin] = new plugins[plugin](this)
                    return this.plugins[plugin].init() || Promise.resolve()
                }
                return Promise.resolve()
            })
        )
    }

    // Collect all components of the current doc. Needed for saving and export
    // filters
    getDoc(options = {}) {
        const doc =
            this.app.isOffline() || Boolean(options.use_current_view)
                ? this.view.docView.node
                : this.docInfo.confirmedDoc
        const pmDoc =
            options.changes === "acceptAllNoInsertions"
                ? acceptAllNoInsertions(doc)
                : doc

        let title = ""
        pmDoc.firstChild.forEach(child => {
            if (!child.marks.find(mark => mark.type.name === "deletion")) {
                title += child.textContent
            }
        })
        return {
            content: pmDoc.toJSON(),
            settings: getSettings(pmDoc),
            title: title.substring(0, 255),
            path: this.docInfo.path,
            version: this.docInfo.version,
            comments: this.mod.comments.store.comments,
            id: this.docInfo.id,
            updated: this.docInfo.updated
        }
    }

    // Use PMs scrollIntoView function and adjust for top menu
    scrollIdIntoView(id) {
        let foundPos = false,
            view

        this.view.state.doc.descendants((node, pos) => {
            if (foundPos) {
                return
            } else if (
                (node.type.groups.includes("heading") ||
                    node.type.name === "figure") &&
                node.attrs.id === id
            ) {
                foundPos = node.type.name === "figure" ? pos : pos + 1
                view = this.view
            } else {
                const anchorMark = node.marks.find(
                    mark => mark.type.name === "anchor"
                )
                if (anchorMark?.attrs.id === id) {
                    foundPos = pos + 1
                    view = this.view
                }
            }
        })

        if (!foundPos) {
            this.mod.footnotes.fnEditor.view.state.doc.descendants(
                (node, pos) => {
                    if (foundPos) {
                        return
                    } else if (
                        (node.type.groups.includes("heading") ||
                            node.type.name === "figure") &&
                        node.attrs.id === id
                    ) {
                        foundPos = node.type.name === "figure" ? pos : pos + 1
                        view = this.mod.footnotes.fnEditor.view
                    } else {
                        const anchorMark = node.marks.find(
                            mark => mark.type.name === "anchor"
                        )
                        if (anchorMark?.attrs.id === id) {
                            foundPos = pos + 1
                            view = this.mod.footnotes.fnEditor.view
                        }
                    }
                }
            )
        }
        if (foundPos) {
            this.scrollPosIntoView(foundPos, view)
        }
    }

    scrollPosIntoView(pos, view) {
        const topMenuHeight = this.dom.querySelector("header").offsetHeight + 10
        const $pos = view.state.doc.resolve(pos)
        view.dispatch(view.state.tr.setSelection(new TextSelection($pos, $pos)))
        view.focus()
        const distanceFromTop = view.coordsAtPos(pos).top - topMenuHeight
        window.scrollBy({
            left: 0,
            top: distanceFromTop,
            behavior: "smooth",
            block: "center"
        })
        return
    }

    scrollBibliographyIntoView() {
        const topMenuHeight = this.dom.querySelector("header").offsetHeight + 10
        const bibliographyHeaderEl = document.querySelector(
            "h1.doc-bibliography-header"
        )
        const distanceFromTop =
            bibliographyHeaderEl.getBoundingClientRect().top - topMenuHeight
        window.scrollBy({
            left: 0,
            top: distanceFromTop,
            behavior: "smooth",
            block: "center"
        })
        return
    }
}

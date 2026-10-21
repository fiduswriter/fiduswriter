/**
 * E2EE Snapshot Manager - Handles encrypted snapshot requests and saves
 * for end-to-end encrypted documents.
 *
 * For E2EE documents, the server cannot process encrypted content, so clients
 * are responsible for saving periodic snapshots. When the server's
 * DOC_SAVE_INTERVAL is reached, it sends a "request_snapshot" message to
 * one of the write-capable clients. This module handles that request by:
 *
 * 1. Collecting the current document state (content, comments, bibliography)
 * 2. Encrypting each field with the document's AES-GCM key
 * 3. Sending an "e2ee_snapshot" message to the server for persistence
 *
 * The server stores the encrypted snapshot as opaque data and notifies
 * other clients via an "e2ee_snapshot_received" message.
 */
export class E2EESnapshotManager {
    /**
     * @param {Editor} editor - The Fidus Writer editor instance
     */
    constructor(editor) {
        this.editor = editor
        this.pendingSave = false
        this.key = null
    }

    /**
     * Set the encryption key for this document.
     * Called after the user enters the password and the key is derived.
     *
     * @param {CryptoKey} key - An AES-GCM key (from E2EEKeyManager.deriveKey)
     */
    setKey(key) {
        this.key = key
    }

    /**
     * Clear the encryption key (e.g., when the document is closed).
     */
    clearKey() {
        this.key = null
    }

    /**
     * Check whether the snapshot manager has a key set.
     *
     * @returns {boolean}
     */
    get hasKey() {
        return this.key !== null
    }

    /**
     * Build an encrypted snapshot payload for the current document state.
     *
     * Returns the encrypted data without sending it. Used in
     * non-collaborative mode where snapshots are sent via REST instead
     * of WebSocket.
     *
     * @returns {Object|null} The encrypted snapshot payload or null if no key.
     */
    async getEncryptedSnapshot() {
        if (!this.key) {
            return null
        }
        const content = this.editor.view.docView.node.toJSON()
        const comments = this.editor.docInfo.comments || {}
        const bibliography = this.editor.docInfo.bibliography || {}
        const {title} = this.editor.getDoc()

        const {E2EEEncryptor} = await import("./encryptor")

        const encryptedContent = await E2EEEncryptor.encryptObject(
            content,
            this.key
        )
        const encryptedComments = await E2EEEncryptor.encryptObject(
            comments,
            this.key
        )
        const encryptedBibliography = await E2EEEncryptor.encryptObject(
            bibliography,
            this.key
        )
        const encryptedTitle = await E2EEEncryptor.encrypt(title, this.key)

        return {
            content: encryptedContent,
            comments: encryptedComments,
            bibliography: encryptedBibliography,
            title: encryptedTitle,
            e2ee_salt: this.editor.e2ee.encryptionSalt,
            e2ee_iterations: this.editor.e2ee.encryptionIterations,
            v: this.editor.docInfo.version
        }
    }

    /**
     * Handle a "request_snapshot" message from the server.
     *
     * The server sends this message when it needs a client to save
     * an encrypted snapshot (typically after DOC_SAVE_INTERVAL diffs).
     * Only write-capable clients should respond.
     *
     * @param {Object} request - The request_snapshot message
     * @param {number} request.v - The server's current document version
     */
    async handleRequestSnapshot(_request) {
        if (this.pendingSave) {
            return
        }
        if (!this.key) {
            return
        }
        if (this.editor.docInfo.access_rights !== "write") {
            return
        }

        this.pendingSave = true

        const docInfo = this.editor.docInfo

        // Get the current document content as JSON
        const content = this.editor.view.docView.node.toJSON()
        const comments = docInfo.comments || {}
        const bibliography = docInfo.bibliography || {}

        // Extract the current title from the editor
        const {title} = this.editor.getDoc()

        // Dynamically import to avoid circular dependencies
        const {E2EEEncryptor} = await import("./encryptor")

        // Encrypt all document data
        const encryptedContent = await E2EEEncryptor.encryptObject(
            content,
            this.key
        )
        const encryptedComments = await E2EEEncryptor.encryptObject(
            comments,
            this.key
        )
        const encryptedBibliography = await E2EEEncryptor.encryptObject(
            bibliography,
            this.key
        )
        const encryptedTitle = await E2EEEncryptor.encrypt(title, this.key)

        // Send snapshot to server
        this.editor.ws.send(() => ({
            type: "e2ee_snapshot",
            v: docInfo.version,
            content: encryptedContent,
            comments: encryptedComments,
            bibliography: encryptedBibliography,
            e2ee_salt: this.editor.e2ee.encryptionSalt,
            title: encryptedTitle
        }))
        this.pendingSave = false
    }

    /**
     * Handle an "e2ee_snapshot_received" message from the server.
     *
     * The server sends this to all clients (except the one that sent
     * the snapshot) to notify them that a new snapshot has been saved.
     * This is informational — clients don't need to take any action
     * since they already have the latest state from the diffs they've
     * been receiving.
     *
     * @param {Object} message - The e2ee_snapshot_received message
     * @param {number} message.v - The version of the saved snapshot
     */
    async handleSnapshotReceived(message) {
        // Informational — no action needed for regular snapshots.
        // If the server included new KDF params, the password was changed
        // by another client. Update local state so that if we re-fetch
        // we use the new salt.
        if (message.e2ee_salt) {
            this.editor.e2ee.encryptionSalt = message.e2ee_salt
            this.editor.e2ee.encryptionIterations = message.e2ee_iterations
            this.editor.e2ee.key = null
            this.clearKey()
            // Clear cached password and key from sessionStorage so the user
            // is prompted for the new password on next access.
            const {E2EEKeyManager} = await import("./key-manager")
            E2EEKeyManager.clearKeyFromSession(this.editor.docInfo.id)
            E2EEKeyManager.clearPasswordFromSession(this.editor.docInfo.id)
            // Notify the user that the password has changed.
            const {showSystemMessage} = await import("../../common")
            showSystemMessage(
                gettext(
                    "The document password was changed by another user. You will need to enter the new password to continue editing."
                )
            )
        }
    }

    /**
     * Send an initial snapshot for a newly created E2EE document.
     *
     * When a new E2EE document is created, the initial content (from
     * the template) needs to be encrypted and saved as the first snapshot.
     * This method handles that initial save.
     *
     * @param {Object} content - The document content (ProseMirror JSON)
     * @param {Object} comments - The comments object (usually empty {})
     * @param {Object} bibliography - The bibliography object (usually {})
     * @param {number} version - The document version (usually 0)
     */
    async sendInitialSnapshot(content, comments, bibliography, version) {
        if (!this.key) {
            return
        }

        const {E2EEEncryptor} = await import("./encryptor")

        const encryptedContent = await E2EEEncryptor.encryptObject(
            content,
            this.key
        )
        const encryptedComments = await E2EEEncryptor.encryptObject(
            comments,
            this.key
        )
        const encryptedBibliography = await E2EEEncryptor.encryptObject(
            bibliography,
            this.key
        )

        // Extract the current title from the editor
        const {title} = this.editor.getDoc()
        const encryptedTitle = await E2EEEncryptor.encrypt(title, this.key)

        this.editor.ws.send(() => ({
            type: "e2ee_snapshot",
            v: version,
            content: encryptedContent,
            comments: encryptedComments,
            bibliography: encryptedBibliography,
            e2ee_salt: this.editor.e2ee.encryptionSalt,
            title: encryptedTitle
        }))
    }

    /**
     * Re-encrypt the document with a new key (for password changes).
     *
     * When the user changes the document password, a new key is derived
     * and the entire document must be re-encrypted. This method handles
     * that by collecting the current document state, encrypting it with
     * the new key, and sending a snapshot.
     *
     * @param {CryptoKey} newKey - The new AES-GCM key derived from the new password
     * @param {string} newSaltBase64 - The new salt (Base64-encoded) to send to the server
     * @param {number} newIterations - The new iteration count
     */
    async reEncryptWithNewKey(
        newKey,
        newSaltBase64,
        newIterations,
        newPassword
    ) {
        if (this.pendingSave) {
            return
        }
        this.pendingSave = true

        try {
            const docInfo = this.editor.docInfo
            const content = this.editor.view.docView.node.toJSON()
            const comments = docInfo.comments || {}
            const bibliography = docInfo.bibliography || {}

            // Extract the current title from the editor
            const {title} = this.editor.getDoc()

            const {E2EEEncryptor} = await import("./encryptor")
            const {PassphraseCrypto} = await import("./passphrase-crypto")
            const {getJson} = await import("../../common")

            // Encrypt with the new key
            const encryptedContent = await E2EEEncryptor.encryptObject(
                content,
                newKey
            )
            const encryptedComments = await E2EEEncryptor.encryptObject(
                comments,
                newKey
            )
            const encryptedBibliography = await E2EEEncryptor.encryptObject(
                bibliography,
                newKey
            )
            const encryptedTitle = await E2EEEncryptor.encrypt(title, newKey)

            // Build fresh wrapped-key envelopes for every current holder
            // of the document key (the server requires that a
            // re-key replaces the envelope of every existing holder).
            const keys = []
            const currentUserId = this.editor.user.id
            const holdersResponse = await getJson(
                `/api/document/encryption_key/holders/?document_id=${docInfo.id}`
            )
            const holders = holdersResponse.holders || []
            // Wrap the new key for a holder with their public key.
            const wrapWithPublicKey = async holderId => {
                const pkJson = await getJson(
                    `/api/user/encryption_public_key/${holderId}/`
                )
                if (!pkJson || !pkJson.public_key) {
                    return null
                }
                const recipientPublicKey =
                    await PassphraseCrypto.importPublicKey(pkJson.public_key)
                const encryptedData =
                    await PassphraseCrypto.encryptStringWithPublicKey(
                        newPassword,
                        recipientPublicKey
                    )
                return {
                    holder_id: holderId,
                    encrypted_key: `${encryptedData.ephemeralPublicKeyJwk}:${encryptedData.encryptedData}`,
                    encrypted_with_master_key: false
                }
            }
            let ownerWrapped = false
            for (const holder of holders) {
                if (holder.holder_id === currentUserId) {
                    const {masterKey} =
                        await PassphraseCrypto.getKeysFromSession()
                    if (masterKey) {
                        keys.push({
                            holder_id: holder.holder_id,
                            encrypted_key: await PassphraseCrypto.encryptString(
                                newPassword,
                                masterKey
                            ),
                            encrypted_with_master_key: true
                        })
                        ownerWrapped = true
                        continue
                    }
                    // Without a master key the owner receives the new key
                    // through their own public key, like everybody else.
                }
                if (!holder.has_public_key) {
                    throw new Error(
                        "One of the collaborators has not set up encryption - the document password cannot be changed without re-sharing the key"
                    )
                }
                const envelope = await wrapWithPublicKey(holder.holder_id)
                if (envelope) {
                    keys.push(envelope)
                }
                if (holder.holder_id === currentUserId) {
                    ownerWrapped = true
                }
            }
            if (!ownerWrapped) {
                // The owner must always be able to open the document, so the
                // new key is wrapped for them even when the document has no
                // stored key envelopes yet. Without a master key or a public
                // key the owner keeps access through the new password.
                const {masterKey} = await PassphraseCrypto.getKeysFromSession()
                if (masterKey) {
                    keys.push({
                        holder_id: currentUserId,
                        encrypted_key: await PassphraseCrypto.encryptString(
                            newPassword,
                            masterKey
                        ),
                        encrypted_with_master_key: true
                    })
                } else {
                    const envelope = await wrapWithPublicKey(currentUserId)
                    if (envelope) {
                        keys.push(envelope)
                    }
                }
            }

            const rid = `rekey-${Date.now()}`

            return new Promise((resolve, reject) => {
                const timer = window.setTimeout(() => {
                    if (this.pendingRekey && this.pendingRekey.rid === rid) {
                        this.pendingRekey = null
                        reject(new Error("The re-key timed out"))
                    }
                }, 30000)
                this.pendingRekey = {
                    rid,
                    key: newKey,
                    salt: newSaltBase64,
                    iterations: newIterations,
                    resolve: message => {
                        window.clearTimeout(timer)
                        resolve(message)
                    },
                    reject: error => {
                        window.clearTimeout(timer)
                        reject(error)
                    }
                }
                this.editor.ws.send(() => ({
                    type: "e2ee_rekey",
                    rid,
                    v: docInfo.version,
                    content: encryptedContent,
                    comments: encryptedComments,
                    bibliography: encryptedBibliography,
                    title: encryptedTitle,
                    e2ee_salt: newSaltBase64,
                    e2ee_iterations: newIterations,
                    keys
                }))
            })
        } finally {
            this.pendingSave = false
        }
    }

    /**
     * The server accepted an e2ee_rekey. Apply the new epoch locally.
     */
    handleRekeyDone(message) {
        const pending = this.pendingRekey
        if (!pending) {
            return false
        }
        this.pendingRekey = null
        this.key = pending.key
        if (this.editor.e2ee) {
            this.editor.e2ee.encryptionSalt = pending.salt
            this.editor.e2ee.encryptionIterations = pending.iterations
        }
        pending.resolve(message)
        return true
    }

    /**
     * The server refused our re-key (arrives as a reject_diff with the
     * re-key's rid).
     */
    handleRekeyRejected(rid) {
        const pending = this.pendingRekey
        if (!pending || pending.rid !== rid) {
            return false
        }
        this.pendingRekey = null
        pending.reject(new Error("The server refused the re-key"))
        return true
    }
}

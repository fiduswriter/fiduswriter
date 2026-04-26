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
    handleSnapshotReceived(message) {
        // Informational — no action needed for regular snapshots.
        // If the server included new KDF params, the password was changed
        // by another client. Update local state so that if we re-fetch
        // we use the new salt.
        if (message.e2ee_salt) {
            this.editor.e2ee.encryptionSalt = message.e2ee_salt
            this.editor.e2ee.encryptionIterations = message.e2ee_iterations
            this.editor.e2ee.key = null
            this.clearKey()
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
    async reEncryptWithNewKey(newKey, newSaltBase64, newIterations) {
        if (this.pendingSave) {
            return
        }
        this.pendingSave = true

        const docInfo = this.editor.docInfo
        const content = this.editor.view.docView.node.toJSON()
        const comments = docInfo.comments || {}
        const bibliography = docInfo.bibliography || {}

        // Extract the current title from the editor
        const {title} = this.editor.getDoc()

        const {E2EEEncryptor} = await import("./encryptor")

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

        // Update the key
        this.key = newKey

        // Send the re-encrypted snapshot along with the new KDF parameters
        this.editor.ws.send(() => ({
            type: "e2ee_snapshot",
            v: docInfo.version,
            content: encryptedContent,
            comments: encryptedComments,
            bibliography: encryptedBibliography,
            e2ee_salt: newSaltBase64,
            e2ee_iterations: newIterations,
            title: encryptedTitle
        }))
        this.pendingSave = false
    }
}

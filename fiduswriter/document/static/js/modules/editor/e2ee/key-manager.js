/**
 * E2EE Key Manager - Handles key derivation and salt generation for
 * end-to-end encrypted documents.
 *
 * Uses PBKDF2 with SHA-256 to derive a 256-bit AES-GCM key from a
 * user-supplied password and a server-stored salt. The salt and
 * iteration count are stored on the server as part of the Document
 * model (Document.e2ee_salt and Document.e2ee_iterations),
 * so the user only needs the password to decrypt from any device.
 *
 * The key is marked as non-extractable for security — it cannot be
 * read back from the CryptoKey object once created.
 */
export class E2EEKeyManager {
    /**
     * Derive an AES-GCM key from a password and salt using PBKDF2.
     *
     * @param {string} password - The user-supplied password
     * @param {Uint8Array} salt - The salt (16 bytes), fetched from the server
     *   as part of the document data (get_doc_data or subscribe)
     * @param {number} [iterations=600000] - PBKDF2 iteration count
     *   (OWASP 2023 recommendation for PBKDF2-SHA256)
     * @returns {Promise<CryptoKey>} A non-extractable AES-GCM 256-bit key
     */
    static async deriveKey(password, salt, iterations = 600000) {
        const encoder = new TextEncoder()
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(password),
            "PBKDF2",
            false,
            ["deriveKey"]
        )

        const key = await crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: iterations,
                hash: "SHA-256"
            },
            keyMaterial,
            {name: "AES-GCM", length: 256},
            true, // extractable — required for sessionStorage caching
            ["encrypt", "decrypt"]
        )

        return key
    }

    /**
     * Store an AES-GCM key in sessionStorage for the current browser session.
     * The key is exported as raw bytes and Base64-encoded before storage.
     *
     * @param {number} documentId - The document ID
     * @param {CryptoKey} key - The AES-GCM key to store
     */
    static async storeKeyInSession(documentId, key) {
        const raw = await crypto.subtle.exportKey("raw", key)
        const base64 = btoa(String.fromCharCode(...new Uint8Array(raw)))
        sessionStorage.setItem(`e2ee_key_${documentId}`, base64)
    }

    /**
     * Retrieve an AES-GCM key from sessionStorage.
     *
     * @param {number} documentId - The document ID
     * @returns {Promise<CryptoKey|null>} The imported key, or null if not found
     */
    static getKeyFromSession(documentId) {
        const base64 = sessionStorage.getItem(`e2ee_key_${documentId}`)
        if (!base64) {
            return null
        }
        const binary = atob(base64)
        const raw = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            raw[i] = binary.charCodeAt(i)
        }
        return crypto.subtle.importKey(
            "raw",
            raw,
            {name: "AES-GCM", length: 256},
            true,
            ["encrypt", "decrypt"]
        )
    }

    /**
     * Remove a cached key from sessionStorage.
     *
     * @param {number} documentId - The document ID
     */
    static clearKeyFromSession(documentId) {
        sessionStorage.removeItem(`e2ee_key_${documentId}`)
    }

    /**
     * Clear all cached E2EE keys from sessionStorage.
     * Should be called on sign-out or session expiration.
     */
    static clearAllKeysFromSession() {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
            const key = sessionStorage.key(i)
            if (key && key.startsWith("e2ee_key_")) {
                sessionStorage.removeItem(key)
            }
        }
    }

    /**
     * Generate a new random salt (16 bytes).
     *
     * Used when creating a new E2EE document or changing the password.
     * The generated salt is sent to the server and stored in
     * Document.e2ee_salt. The salt is not a secret — its purpose
     * is to ensure that two documents with the same password produce
     * different derived keys (preventing rainbow table attacks).
     *
     * @returns {Uint8Array} A 16-byte random salt
     */
    static generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16))
    }
}

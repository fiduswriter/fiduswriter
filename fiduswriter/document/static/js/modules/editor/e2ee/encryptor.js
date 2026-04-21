/**
 * E2EE Encryptor - Handles encryption and decryption of document content
 * for end-to-end encrypted documents.
 *
 * Uses AES-GCM (256-bit) for all encryption operations. Each encryption
 * operation generates a random 12-byte IV (initialization vector) to
 * ensure that encrypting the same plaintext twice produces different
 * ciphertext.
 *
 * Encrypted data format (Appendix A of the E2EE plan):
 *   [IV (12 bytes)][Ciphertext (variable length)][Auth Tag (16 bytes, implicit in AES-GCM)]
 *
 * When stored as a string (e.g., in JSON fields), the entire structure
 * is Base64-encoded.
 */
export class E2EEEncryptor {
    /**
     * Encrypt a string with AES-GCM.
     *
     * @param {string} plaintext - The plaintext string to encrypt
     * @param {CryptoKey} key - An AES-GCM key (from E2EEKeyManager.deriveKey)
     * @returns {Promise<string>} Base64-encoded string (iv + ciphertext + auth tag)
     */
    static async encrypt(plaintext, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encoded = new TextEncoder().encode(plaintext)
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv: iv},
            key,
            encoded
        )
        // Prepend IV to ciphertext for storage
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return E2EEEncryptor._uint8ArrayToBase64(combined)
    }

    /**
     * Decrypt a Base64-encoded AES-GCM ciphertext.
     *
     * @param {string} ciphertextBase64 - Base64-encoded (iv + ciphertext + auth tag)
     * @param {CryptoKey} key - An AES-GCM key (from E2EEKeyManager.deriveKey)
     * @returns {Promise<string>} The decrypted plaintext string
     */
    static async decrypt(ciphertextBase64, key) {
        const combined = E2EEEncryptor._base64ToUint8Array(ciphertextBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const decrypted = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv: iv},
            key,
            ciphertext
        )
        return new TextDecoder().decode(decrypted)
    }

    /**
     * Encrypt a JSON-serializable object.
     *
     * Serializes the object to JSON, then encrypts the JSON string.
     *
     * @param {Object} obj - A JSON-serializable object
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<string>} Base64-encoded encrypted data
     */
    static encryptObject(obj, key) {
        return E2EEEncryptor.encrypt(JSON.stringify(obj), key)
    }

    /**
     * Decrypt to a JSON-serializable object.
     *
     * Decrypts the Base64-encoded ciphertext, then parses the result as JSON.
     *
     * @param {string} ciphertextBase64 - Base64-encoded encrypted data
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<Object>} The decrypted and parsed object
     */
    static async decryptObject(ciphertextBase64, key) {
        const plaintext = await E2EEEncryptor.decrypt(ciphertextBase64, key)
        return JSON.parse(plaintext)
    }

    /**
     * Encrypt an ArrayBuffer (for images and other binary data).
     *
     * @param {ArrayBuffer} buffer - The binary data to encrypt
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<string>} Base64-encoded encrypted data (iv + ciphertext)
     */
    static async encryptBuffer(buffer, key) {
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv: iv},
            key,
            buffer
        )
        // Prepend IV to ciphertext
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return E2EEEncryptor._uint8ArrayToBase64(combined)
    }

    /**
     * Decrypt to an ArrayBuffer.
     *
     * @param {string} ciphertextBase64 - Base64-encoded encrypted data
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<ArrayBuffer>} The decrypted binary data
     */
    static decryptBuffer(ciphertextBase64, key) {
        const combined = E2EEEncryptor._base64ToUint8Array(ciphertextBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        return crypto.subtle.decrypt({name: "AES-GCM", iv: iv}, key, ciphertext)
    }

    /**
     * Encrypt an image File/Blob for upload.
     *
     * Reads the file as an ArrayBuffer, encrypts it, and returns
     * a Blob with application/octet-stream type (since the encrypted
     * data is opaque binary).
     *
     * @param {File|Blob} file - The image file to encrypt
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<Blob>} An encrypted Blob with type application/octet-stream
     */
    static async encryptImage(file, key) {
        const buffer = await file.arrayBuffer()
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv: iv},
            key,
            buffer
        )
        // Prepend IV to ciphertext
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return new Blob([combined], {type: "application/octet-stream"})
    }

    /**
     * Decrypt an encrypted image back to an ArrayBuffer.
     *
     * @param {string} ciphertextBase64 - Base64-encoded encrypted image data
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<ArrayBuffer>} The decrypted image data
     */
    static decryptImage(ciphertextBase64, key) {
        return E2EEEncryptor.decryptBuffer(ciphertextBase64, key)
    }

    /**
     * Decrypt a Base64-encoded ciphertext and return as a Base64 string.
     *
     * Useful for decrypting encrypted images that need to be stored
     * as Base64 data URLs or re-exported.
     *
     * @param {string} ciphertextBase64 - Base64-encoded encrypted data
     * @param {CryptoKey} key - An AES-GCM key
     * @returns {Promise<string>} Base64-encoded decrypted data
     */
    static async decryptBufferToBase64(ciphertextBase64, key) {
        const buffer = await E2EEEncryptor.decryptBuffer(ciphertextBase64, key)
        const bytes = new Uint8Array(buffer)
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    // --- Private helper methods ---

    /**
     * Convert a Uint8Array to a Base64-encoded string.
     * @private
     */
    static _uint8ArrayToBase64(bytes) {
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    /**
     * Convert a Base64-encoded string to a Uint8Array.
     * @private
     */
    static _base64ToUint8Array(base64) {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return bytes
    }
}

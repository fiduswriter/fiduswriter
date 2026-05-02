/**
 * PassphraseCrypto - Client-side cryptography for the Personal Passphrase system.
 *
 * Handles:
 * - Master key (MK) generation and storage
 * - ECDH P-256 key pair generation and storage
 * - Recovery key generation
 * - Key-wrapping key (KWK) derivation from passphrase via PBKDF2
 * - Encryption of MK and private key (SK) with KWK
 * - Backup encryption of MK with recovery key
 * - ECIES-style encryption of DEK with recipient's public key
 * - Session storage management for MK and SK
 */

export class PassphraseCrypto {
    // --- Key Generation ---

    /**
     * Generate a new 256-bit AES-GCM master key.
     * The key is marked extractable so it can be exported for sessionStorage.
     */
    static generateMasterKey() {
        return crypto.subtle.generateKey(
            {name: "AES-GCM", length: 256},
            true, // extractable for sessionStorage
            ["encrypt", "decrypt"]
        )
    }

    /**
     * Generate a random document password that is itself a valid raw DEK.
     * Returns a 44-character base64-encoded 32-byte AES key.
     * This password can be used directly as the encryption key without PBKDF2.
     */
    static async generateDocumentPassword() {
        const key = await crypto.subtle.generateKey(
            {name: "AES-GCM", length: 256},
            true,
            ["encrypt", "decrypt"]
        )
        const raw = await crypto.subtle.exportKey("raw", key)
        return btoa(String.fromCharCode(...new Uint8Array(raw)))
    }

    /**
     * Generate a new ECDH P-256 key pair.
     * Both keys are marked extractable so the private key can be stored encrypted.
     */
    static generateKeyPair() {
        return crypto.subtle.generateKey(
            {name: "ECDH", namedCurve: "P-256"},
            true, // extractable for encrypted storage
            ["deriveKey"]
        )
    }

    /**
     * Generate a 128-bit recovery key as a hex string.
     * This is shown to the user once during setup.
     */
    static generateRecoveryKey() {
        const bytes = crypto.getRandomValues(new Uint8Array(16))
        return PassphraseCrypto._bytesToHex(bytes)
    }

    /**
     * Generate a random 16-byte salt for PBKDF2.
     */
    static generateSalt() {
        return crypto.getRandomValues(new Uint8Array(16))
    }

    // --- Key Derivation ---

    /**
     * Derive a key-wrapping key (KWK) from a passphrase and salt using PBKDF2.
     *
     * @param {string} passphrase - The user's personal passphrase
     * @param {Uint8Array} salt - 16-byte random salt
     * @param {number} iterations - PBKDF2 iteration count (default 600000)
     * @returns {Promise<CryptoKey>} An extractable AES-GCM-256 key
     */
    static async deriveKWK(passphrase, salt, iterations = 600000) {
        const encoder = new TextEncoder()
        const keyMaterial = await crypto.subtle.importKey(
            "raw",
            encoder.encode(passphrase),
            "PBKDF2",
            false,
            ["deriveKey"]
        )
        return crypto.subtle.deriveKey(
            {name: "PBKDF2", salt, iterations, hash: "SHA-256"},
            keyMaterial,
            {name: "AES-GCM", length: 256},
            true, // extractable so it can be used to encrypt keys
            ["encrypt", "decrypt"]
        )
    }

    // --- Key Wrapping / Unwrapping ---

    /**
     * Wrap (encrypt) a CryptoKey with a wrapping key using AES-KW.
     * Returns a Base64-encoded wrapped key.
     */
    static async wrapKey(keyToWrap, wrappingKey) {
        const wrapped = await crypto.subtle.wrapKey(
            "raw",
            keyToWrap,
            wrappingKey,
            "AES-KW"
        )
        return PassphraseCrypto._bytesToBase64(new Uint8Array(wrapped))
    }

    /**
     * Unwrap (decrypt) a wrapped key with a wrapping key.
     * Returns the original CryptoKey.
     */
    static unwrapKey(wrappedKeyBase64, wrappingKey, keyType = "AES-GCM") {
        const wrapped = PassphraseCrypto._base64ToBytes(wrappedKeyBase64)
        const algorithm =
            keyType === "AES-GCM"
                ? {name: "AES-GCM", length: 256}
                : {name: "HMAC", hash: "SHA-256", length: 256}
        const usages =
            keyType === "AES-GCM" ? ["encrypt", "decrypt"] : ["sign", "verify"]
        return crypto.subtle.unwrapKey(
            "raw",
            wrapped,
            wrappingKey,
            "AES-KW",
            algorithm,
            true,
            usages
        )
    }

    /**
     * Wrap a private key (JWK format) with a wrapping key.
     * Returns a Base64-encoded wrapped JWK.
     */
    static async wrapPrivateKey(privateKey, wrappingKey) {
        const wrapped = await crypto.subtle.wrapKey(
            "jwk",
            privateKey,
            wrappingKey,
            "AES-KW"
        )
        return PassphraseCrypto._bytesToBase64(new Uint8Array(wrapped))
    }

    /**
     * Unwrap a private key (JWK format) with a wrapping key.
     */
    static unwrapPrivateKey(wrappedKeyBase64, wrappingKey) {
        const wrapped = PassphraseCrypto._base64ToBytes(wrappedKeyBase64)
        return crypto.subtle.unwrapKey(
            "jwk",
            wrapped,
            wrappingKey,
            "AES-KW",
            {name: "ECDH", namedCurve: "P-256"},
            true,
            ["deriveKey"]
        )
    }

    // --- AES-GCM encryption for key material (fallback when AES-KW not suitable) ---

    /**
     * Encrypt a raw key with AES-GCM.
     * Returns Base64 string: iv (12 bytes) + ciphertext.
     */
    static async encryptKey(key, encryptionKey) {
        const raw = await crypto.subtle.exportKey("raw", key)
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            raw
        )
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return PassphraseCrypto._bytesToBase64(combined)
    }

    /**
     * Decrypt a raw key with AES-GCM.
     */
    static async decryptKey(
        encryptedKeyBase64,
        encryptionKey,
        keyType = "AES-GCM"
    ) {
        const combined = PassphraseCrypto._base64ToBytes(encryptedKeyBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const raw = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            ciphertext
        )
        const algorithm =
            keyType === "AES-GCM"
                ? {name: "AES-GCM", length: 256}
                : {name: "HMAC", hash: "SHA-256", length: 256}
        const usages =
            keyType === "AES-GCM" ? ["encrypt", "decrypt"] : ["sign", "verify"]
        return crypto.subtle.importKey("raw", raw, algorithm, true, usages)
    }

    /**
     * Encrypt a private key (exported as JWK JSON string) with AES-GCM.
     */
    static async encryptPrivateKey(privateKey, encryptionKey) {
        const jwk = await crypto.subtle.exportKey("jwk", privateKey)
        const jwkString = JSON.stringify(jwk)
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const encoded = new TextEncoder().encode(jwkString)
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            encoded
        )
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return PassphraseCrypto._bytesToBase64(combined)
    }

    /**
     * Decrypt a private key (as JWK JSON string) with AES-GCM.
     */
    static async decryptPrivateKey(encryptedPrivateKeyBase64, encryptionKey) {
        const combined = PassphraseCrypto._base64ToBytes(
            encryptedPrivateKeyBase64
        )
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const decrypted = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            ciphertext
        )
        const jwkString = new TextDecoder().decode(decrypted)
        const jwk = JSON.parse(jwkString)
        return crypto.subtle.importKey(
            "jwk",
            jwk,
            {name: "ECDH", namedCurve: "P-256"},
            true,
            ["deriveKey"]
        )
    }

    // --- Public Key Import/Export ---

    /**
     * Export a public key to JWK JSON string for sharing.
     */
    static async exportPublicKey(publicKey) {
        const jwk = await crypto.subtle.exportKey("jwk", publicKey)
        return JSON.stringify(jwk)
    }

    /**
     * Import a public key from JWK JSON string.
     */
    static importPublicKey(jwkString) {
        const jwk = JSON.parse(jwkString)
        return crypto.subtle.importKey(
            "jwk",
            jwk,
            {name: "ECDH", namedCurve: "P-256"},
            true,
            []
        )
    }

    // --- ECIES-style DEK encryption for sharing ---

    /**
     * Encrypt a DEK with a recipient's public key using ECIES-style encryption.
     *
     * 1. Generate an ephemeral ECDH key pair.
     * 2. Derive a shared AES-GCM key from ephemeral private + recipient public.
     * 3. Encrypt the DEK with the shared key.
     * 4. Return ephemeral public key + encrypted DEK.
     *
     * @param {CryptoKey} dek - The document encryption key (AES-GCM key)
     * @param {CryptoKey} recipientPublicKey - The recipient's ECDH public key
     * @returns {Promise<Object>} {ephemeralPublicKeyJwk: string, encryptedDEK: string}
     */
    static async encryptDEKWithPublicKey(dek, recipientPublicKey) {
        // Generate ephemeral key pair
        const ephemeralPair = await crypto.subtle.generateKey(
            {name: "ECDH", namedCurve: "P-256"},
            true,
            ["deriveKey"]
        )

        // Derive shared AES-GCM key
        const sharedKey = await crypto.subtle.deriveKey(
            {name: "ECDH", public: recipientPublicKey},
            ephemeralPair.privateKey,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )

        // Export DEK as raw bytes, then encrypt with shared key
        const dekRaw = await crypto.subtle.exportKey("raw", dek)
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv},
            sharedKey,
            dekRaw
        )

        // Export ephemeral public key
        const ephemeralPublicJwk = await crypto.subtle.exportKey(
            "jwk",
            ephemeralPair.publicKey
        )

        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)

        return {
            ephemeralPublicKeyJwk: JSON.stringify(ephemeralPublicJwk),
            encryptedDEK: PassphraseCrypto._bytesToBase64(combined)
        }
    }

    /**
     * Decrypt a DEK that was encrypted with the user's public key.
     *
     * @param {string} encryptedDEKBase64 - iv + ciphertext
     * @param {string} ephemeralPublicKeyJwk - JSON string of ephemeral public key JWK
     * @param {CryptoKey} privateKey - The user's ECDH private key
     * @returns {Promise<CryptoKey>} The decrypted DEK (AES-GCM key)
     */
    static async decryptDEKWithPrivateKey(
        encryptedDEKBase64,
        ephemeralPublicKeyJwk,
        privateKey
    ) {
        // Import ephemeral public key
        const ephemeralPublicJwk = JSON.parse(ephemeralPublicKeyJwk)
        const ephemeralPublicKey = await crypto.subtle.importKey(
            "jwk",
            ephemeralPublicJwk,
            {name: "ECDH", namedCurve: "P-256"},
            true,
            []
        )

        // Derive shared AES-GCM key
        const sharedKey = await crypto.subtle.deriveKey(
            {name: "ECDH", public: ephemeralPublicKey},
            privateKey,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )

        // Decrypt DEK
        const combined = PassphraseCrypto._base64ToBytes(encryptedDEKBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const dekRaw = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv},
            sharedKey,
            ciphertext
        )

        return crypto.subtle.importKey(
            "raw",
            dekRaw,
            {name: "AES-GCM", length: 256},
            true,
            ["encrypt", "decrypt"]
        )
    }

    /**
     * Encrypt a string with AES-GCM using a direct key (e.g. master key).
     */
    static async encryptString(str, encryptionKey) {
        const encoder = new TextEncoder()
        const data = encoder.encode(str)
        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            data
        )
        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)
        return PassphraseCrypto._bytesToBase64(combined)
    }

    /**
     * Decrypt a string with AES-GCM using a direct key.
     */
    static async decryptString(encryptedBase64, encryptionKey) {
        const combined = PassphraseCrypto._base64ToBytes(encryptedBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const decrypted = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv},
            encryptionKey,
            ciphertext
        )
        const decoder = new TextDecoder()
        return decoder.decode(decrypted)
    }

    /**
     * Encrypt a string with a recipient's public key using ECIES-style encryption.
     * Same as encryptDEKWithPublicKey but for string data instead of a CryptoKey.
     */
    static async encryptStringWithPublicKey(str, recipientPublicKey) {
        const encoder = new TextEncoder()
        const data = encoder.encode(str)

        const ephemeralPair = await crypto.subtle.generateKey(
            {name: "ECDH", namedCurve: "P-256"},
            true,
            ["deriveKey"]
        )

        const sharedKey = await crypto.subtle.deriveKey(
            {name: "ECDH", public: recipientPublicKey},
            ephemeralPair.privateKey,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )

        const iv = crypto.getRandomValues(new Uint8Array(12))
        const ciphertext = await crypto.subtle.encrypt(
            {name: "AES-GCM", iv},
            sharedKey,
            data
        )

        const ephemeralPublicJwk = await crypto.subtle.exportKey(
            "jwk",
            ephemeralPair.publicKey
        )

        const combined = new Uint8Array(iv.length + ciphertext.byteLength)
        combined.set(iv, 0)
        combined.set(new Uint8Array(ciphertext), iv.length)

        return {
            ephemeralPublicKeyJwk: JSON.stringify(ephemeralPublicJwk),
            encryptedData: PassphraseCrypto._bytesToBase64(combined)
        }
    }

    /**
     * Decrypt a string that was encrypted with the user's public key.
     * Returns the plaintext string.
     */
    static async decryptStringWithPrivateKey(
        encryptedDataBase64,
        ephemeralPublicKeyJwk,
        privateKey
    ) {
        const ephemeralPublicJwk = JSON.parse(ephemeralPublicKeyJwk)
        const ephemeralPublicKey = await crypto.subtle.importKey(
            "jwk",
            ephemeralPublicJwk,
            {name: "ECDH", namedCurve: "P-256"},
            true,
            []
        )

        const sharedKey = await crypto.subtle.deriveKey(
            {name: "ECDH", public: ephemeralPublicKey},
            privateKey,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )

        const combined = PassphraseCrypto._base64ToBytes(encryptedDataBase64)
        const iv = combined.slice(0, 12)
        const ciphertext = combined.slice(12)
        const decrypted = await crypto.subtle.decrypt(
            {name: "AES-GCM", iv},
            sharedKey,
            ciphertext
        )

        const decoder = new TextDecoder()
        return decoder.decode(decrypted)
    }

    // --- Session Storage ---

    /**
     * Store the master key and private key in sessionStorage.
     * Both keys are exported and Base64-encoded.
     */
    static async storeKeysInSession(masterKey, privateKey) {
        const mkRaw = await crypto.subtle.exportKey("raw", masterKey)
        const mkBase64 = PassphraseCrypto._bytesToBase64(new Uint8Array(mkRaw))
        sessionStorage.setItem("e2ee_master_key", mkBase64)

        const jwk = await crypto.subtle.exportKey("jwk", privateKey)
        sessionStorage.setItem("e2ee_private_key", JSON.stringify(jwk))
    }

    /**
     * Retrieve the master key and private key from sessionStorage.
     * Returns {masterKey: CryptoKey|null, privateKey: CryptoKey|null}
     */
    static async getKeysFromSession() {
        const mkBase64 = sessionStorage.getItem("e2ee_master_key")
        const skJwkString = sessionStorage.getItem("e2ee_private_key")
        if (!mkBase64 || !skJwkString) {
            return {masterKey: null, privateKey: null}
        }
        try {
            const mkRaw = PassphraseCrypto._base64ToBytes(mkBase64)
            const masterKey = await crypto.subtle.importKey(
                "raw",
                mkRaw,
                {name: "AES-GCM", length: 256},
                true,
                ["encrypt", "decrypt"]
            )
            const skJwk = JSON.parse(skJwkString)
            const privateKey = await crypto.subtle.importKey(
                "jwk",
                skJwk,
                {name: "ECDH", namedCurve: "P-256"},
                true,
                ["deriveKey"]
            )
            return {masterKey, privateKey}
        } catch (_e) {
            PassphraseCrypto.clearKeysFromSession()
            return {masterKey: null, privateKey: null}
        }
    }

    /**
     * Check if keys are present in sessionStorage.
     */
    static hasKeysInSession() {
        return !!(
            sessionStorage.getItem("e2ee_master_key") &&
            sessionStorage.getItem("e2ee_private_key")
        )
    }

    /**
     * Clear master key and private key from sessionStorage.
     */
    static clearKeysFromSession() {
        sessionStorage.removeItem("e2ee_master_key")
        sessionStorage.removeItem("e2ee_private_key")
    }

    // --- Helpers ---

    static _bytesToBase64(bytes) {
        let binary = ""
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i])
        }
        return btoa(binary)
    }

    static _base64ToBytes(base64) {
        const binary = atob(base64)
        const bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i)
        }
        return bytes
    }

    static _bytesToHex(bytes) {
        return Array.from(bytes)
            .map(b => b.toString(16).padStart(2, "0"))
            .join("")
    }

    static _hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2)
        for (let i = 0; i < hex.length; i += 2) {
            bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16)
        }
        return bytes
    }
}

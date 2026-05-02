/**
 * PassphraseManager - Manages the personal passphrase system for E2EE.
 *
 * This module ties together PassphraseCrypto with the server API to provide:
 * - Setup flow: generate keys, derive KWK, encrypt, send to server
 * - Unlock flow: fetch from server, derive KWK, decrypt, store in sessionStorage
 * - Recovery flow: use recovery key to decrypt backup, re-encrypt with new passphrase
 * - Key checking: determine if user has encryption keys set up
 * - DEK retrieval: get the document encryption key for a document
 * - DEK sharing: encrypt DEK with recipient's public key
 */

import {getJson, postJson} from "../../common"
import {E2EEKeyManager} from "./key-manager"
import {PassphraseCrypto} from "./passphrase-crypto"

export class PassphraseManager {
    /**
     * Check if the user has set up encryption keys on the server.
     */
    static async hasEncryptionKeys() {
        try {
            const data = await getJson("/api/user/encryption_key/")
            return data.has_key === true
        } catch (_e) {
            return false
        }
    }

    /**
     * Check if the master key and private key are in sessionStorage.
     */
    static hasKeysInSession() {
        return PassphraseCrypto.hasKeysInSession()
    }

    /**
     * Get keys from sessionStorage.
     * Returns {masterKey, privateKey} or {masterKey: null, privateKey: null}
     */
    static getKeysFromSession() {
        return PassphraseCrypto.getKeysFromSession()
    }

    /**
     * Clear keys from sessionStorage (e.g., on sign-out).
     */
    static clearKeysFromSession() {
        PassphraseCrypto.clearKeysFromSession()
    }

    /**
     * Set up encryption keys for the first time.
     *
     * @param {string} passphrase - The user's chosen passphrase
     * @returns {Promise<Object>} {recoveryKey: string} - The recovery key to display
     */
    static async setupEncryption(passphrase) {
        // 1. Generate keys
        const masterKey = await PassphraseCrypto.generateMasterKey()
        const keyPair = await PassphraseCrypto.generateKeyPair()
        const recoveryKey = PassphraseCrypto.generateRecoveryKey()
        const salt = PassphraseCrypto.generateSalt()

        // 2. Derive KWK from passphrase
        const kwk = await PassphraseCrypto.deriveKWK(passphrase, salt)

        // 3. Encrypt master key and private key with KWK
        const encryptedMasterKey = await PassphraseCrypto.encryptKey(
            masterKey,
            kwk
        )
        const encryptedPrivateKey = await PassphraseCrypto.encryptPrivateKey(
            keyPair.privateKey,
            kwk
        )

        // 4. Encrypt backup of master key with recovery key
        const recoveryKeyRaw = PassphraseCrypto._hexToBytes(recoveryKey)
        const recoveryKeyCryptoKey = await crypto.subtle.importKey(
            "raw",
            recoveryKeyRaw,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )
        const encryptedMasterKeyBackup = await PassphraseCrypto.encryptKey(
            masterKey,
            recoveryKeyCryptoKey
        )

        // 5. Export public key as JWK
        const publicKeyJwk = await PassphraseCrypto.exportPublicKey(
            keyPair.publicKey
        )

        // 6. Send to server
        const saveData = {
            data: JSON.stringify({
                public_key: publicKeyJwk,
                encrypted_master_key: encryptedMasterKey,
                encrypted_private_key: encryptedPrivateKey,
                user_salt: PassphraseCrypto._bytesToBase64(salt),
                user_iterations: 600000,
                encrypted_master_key_backup: encryptedMasterKeyBackup
            })
        }
        const {status} = await postJson(
            "/api/user/encryption_key/save/",
            saveData
        )
        if (status >= 400) {
            throw new Error("Failed to save encryption keys")
        }

        // 7. Store in sessionStorage
        await PassphraseCrypto.storeKeysInSession(masterKey, keyPair.privateKey)

        return {recoveryKey}
    }

    /**
     * Unlock encryption keys using the passphrase.
     *
     * @param {string} passphrase - The user's passphrase
     * @returns {Promise<boolean>} true if successful
     */
    static async unlockWithPassphrase(passphrase) {
        // 1. Fetch encrypted keys from server
        const data = await getJson("/api/user/encryption_key/")
        if (!data.has_key) {
            throw new Error("No encryption keys found")
        }

        // 2. Derive KWK
        const salt = PassphraseCrypto._base64ToBytes(data.user_salt)
        const kwk = await PassphraseCrypto.deriveKWK(
            passphrase,
            salt,
            data.user_iterations
        )

        // 3. Decrypt master key and private key
        const masterKey = await PassphraseCrypto.decryptKey(
            data.encrypted_master_key,
            kwk
        )
        const privateKey = await PassphraseCrypto.decryptPrivateKey(
            data.encrypted_private_key,
            kwk
        )

        // 4. Store in sessionStorage
        await PassphraseCrypto.storeKeysInSession(masterKey, privateKey)

        return true
    }

    /**
     * Change the passphrase without rotating keys.
     *
     * @param {string} oldPassphrase - Current passphrase
     * @param {string} newPassphrase - New passphrase
     * @returns {Promise<boolean>} true if successful
     */
    static async changePassphrase(oldPassphrase, newPassphrase) {
        // 1. Fetch encrypted keys from server
        const data = await getJson("/api/user/encryption_key/")
        if (!data.has_key) {
            throw new Error("No encryption keys found")
        }

        // 2. Derive old KWK and decrypt keys
        const oldSalt = PassphraseCrypto._base64ToBytes(data.user_salt)
        const oldKwk = await PassphraseCrypto.deriveKWK(
            oldPassphrase,
            oldSalt,
            data.user_iterations
        )
        const masterKey = await PassphraseCrypto.decryptKey(
            data.encrypted_master_key,
            oldKwk
        )
        const privateKey = await PassphraseCrypto.decryptPrivateKey(
            data.encrypted_private_key,
            oldKwk
        )

        // 3. Generate new salt and derive new KWK
        const newSalt = PassphraseCrypto.generateSalt()
        const newKwk = await PassphraseCrypto.deriveKWK(newPassphrase, newSalt)

        // 4. Re-encrypt master key and private key with new KWK
        const encryptedMasterKey = await PassphraseCrypto.encryptKey(
            masterKey,
            newKwk
        )
        const encryptedPrivateKey = await PassphraseCrypto.encryptPrivateKey(
            privateKey,
            newKwk
        )

        // 5. Re-encrypt master key backup with existing recovery key
        // (We keep the same recovery key so the user doesn't need to update
        // their stored backup. The backup is encrypted with the recovery key,
        // not the passphrase, so it remains valid.)
        const encryptedMasterKeyBackup = data.encrypted_master_key_backup

        // 6. Send updated keys to server
        const saveData = {
            data: JSON.stringify({
                public_key: data.public_key,
                encrypted_master_key: encryptedMasterKey,
                encrypted_private_key: encryptedPrivateKey,
                user_salt: PassphraseCrypto._bytesToBase64(newSalt),
                user_iterations: 600000,
                encrypted_master_key_backup: encryptedMasterKeyBackup
            })
        }
        const {status} = await postJson(
            "/api/user/encryption_key/save/",
            saveData
        )
        if (status >= 400) {
            throw new Error("Failed to save updated encryption keys")
        }

        // 7. Update sessionStorage
        await PassphraseCrypto.storeKeysInSession(masterKey, privateKey)

        return true
    }

    /**
     * Recover encryption keys using the recovery key.
     *
     * @param {string} recoveryKey - The recovery key (hex string)
     * @param {string} newPassphrase - The new passphrase to set
     * @returns {Promise<Object>} {newRecoveryKey: string}
     */
    static async recoverWithRecoveryKey(recoveryKey, newPassphrase) {
        // 1. Fetch encrypted keys from server
        const data = await getJson("/api/user/encryption_key/")
        if (!data.has_key) {
            throw new Error("No encryption keys found")
        }

        // 2. Decrypt master key backup with recovery key
        const recoveryKeyRaw = PassphraseCrypto._hexToBytes(recoveryKey)
        const recoveryKeyCryptoKey = await crypto.subtle.importKey(
            "raw",
            recoveryKeyRaw,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )
        const masterKey = await PassphraseCrypto.decryptKey(
            data.encrypted_master_key_backup,
            recoveryKeyCryptoKey
        )

        // 3. Generate new key pair
        const newKeyPair = await PassphraseCrypto.generateKeyPair()
        const newRecoveryKey = PassphraseCrypto.generateRecoveryKey()
        const newSalt = PassphraseCrypto.generateSalt()

        // 4. Derive new KWK from new passphrase
        const newKwk = await PassphraseCrypto.deriveKWK(newPassphrase, newSalt)

        // 5. Re-encrypt master key and new private key
        const encryptedMasterKey = await PassphraseCrypto.encryptKey(
            masterKey,
            newKwk
        )
        const encryptedPrivateKey = await PassphraseCrypto.encryptPrivateKey(
            newKeyPair.privateKey,
            newKwk
        )

        // 6. Create new backup
        const newRecoveryKeyRaw = PassphraseCrypto._hexToBytes(newRecoveryKey)
        const newRecoveryKeyCryptoKey = await crypto.subtle.importKey(
            "raw",
            newRecoveryKeyRaw,
            {name: "AES-GCM", length: 256},
            false,
            ["encrypt", "decrypt"]
        )
        const encryptedMasterKeyBackup = await PassphraseCrypto.encryptKey(
            masterKey,
            newRecoveryKeyCryptoKey
        )

        // 7. Export new public key
        const publicKeyJwk = await PassphraseCrypto.exportPublicKey(
            newKeyPair.publicKey
        )

        // 8. Send updated keys to server
        const saveData = {
            data: JSON.stringify({
                public_key: publicKeyJwk,
                encrypted_master_key: encryptedMasterKey,
                encrypted_private_key: encryptedPrivateKey,
                user_salt: PassphraseCrypto._bytesToBase64(newSalt),
                user_iterations: 600000,
                encrypted_master_key_backup: encryptedMasterKeyBackup
            })
        }
        const {status} = await postJson(
            "/api/user/encryption_key/save/",
            saveData
        )
        if (status >= 400) {
            throw new Error("Failed to save updated encryption keys")
        }

        // 9. Store in sessionStorage
        await PassphraseCrypto.storeKeysInSession(
            masterKey,
            newKeyPair.privateKey
        )

        return {newRecoveryKey}
    }

    /**
     * Get the document password for a document.
     *
     * If encrypted with the user's master key, decrypts it directly.
     * If encrypted with the user's public key, decrypts with private key and
     * upgrades to master-key encryption.
     *
     * @param {number} documentId - The document ID
     * @returns {Promise<string|null>} The document password, or null if not available
     */
    static async getDocumentPassword(documentId) {
        const {masterKey, privateKey} =
            await PassphraseCrypto.getKeysFromSession()
        if (!masterKey || !privateKey) {
            return null
        }

        const {json} = await postJson("/api/document/encryption_key/get/", {
            document_id: documentId
        })
        if (!json.has_key) {
            return null
        }

        let password
        if (json.encrypted_with_master_key) {
            password = await PassphraseCrypto.decryptString(
                json.encrypted_key,
                masterKey
            )
        } else {
            const parts = json.encrypted_key.split(":")
            if (parts.length !== 2) {
                return null
            }
            password = await PassphraseCrypto.decryptStringWithPrivateKey(
                parts[1],
                parts[0],
                privateKey
            )
            // Upgrade to master-key encryption for next time
            const upgradedEncryptedPassword =
                await PassphraseCrypto.encryptString(password, masterKey)
            await postJson("/api/document/encryption_key/update/", {
                id: json.id,
                encrypted_key: upgradedEncryptedPassword,
                encrypted_with_master_key: "true"
            })
        }

        return password
    }

    /**
     * Create or store a document password for a document.
     *
     * Used when:
     * - Creating a new encrypted document (owner's password encrypted with MK)
     * - Sharing with another passphrase user (password encrypted with their public key)
     *
     * @param {number} documentId - The document ID
     * @param {string} password - The document password
     * @param {number} holderId - The user ID to store the password for (default: current user)
     * @param {string} holderType - "user" or "userinvite"
     * @param {boolean} encryptedWithMasterKey - Whether to encrypt with MK or public key
     * @returns {Promise<Object>} Server response
     */
    static async saveDocumentPassword(
        documentId,
        password,
        holderId = null,
        _holderType = "user",
        encryptedWithMasterKey = true
    ) {
        let encryptedKey
        if (encryptedWithMasterKey) {
            const {masterKey} = await PassphraseCrypto.getKeysFromSession()
            if (!masterKey) {
                throw new Error("Master key not available in session")
            }
            encryptedKey = await PassphraseCrypto.encryptString(
                password,
                masterKey
            )
        } else {
            const pkJson = await getJson(
                `/api/user/encryption_public_key/${holderId}/`
            )
            if (!pkJson.has_key) {
                throw new Error("Recipient has not set up encryption")
            }
            const recipientPublicKey = await PassphraseCrypto.importPublicKey(
                pkJson.public_key
            )
            const encryptedData =
                await PassphraseCrypto.encryptStringWithPublicKey(
                    password,
                    recipientPublicKey
                )
            encryptedKey = `${encryptedData.ephemeralPublicKeyJwk}:${encryptedData.encryptedData}`
        }

        const saveData = {
            document_id: documentId,
            encrypted_key: encryptedKey,
            encrypted_with_master_key: encryptedWithMasterKey ? "true" : "false"
        }
        if (holderId) {
            saveData.holder_id = holderId
        }
        const {json, status} = await postJson(
            "/api/document/encryption_key/save/",
            saveData
        )
        if (status >= 400) {
            throw new Error("Failed to save document password")
        }
        return json
    }

    /**
     * Generate a new random document password that is itself a valid raw DEK.
     * Returns a 44-character base64-encoded 32-byte AES key.
     */
    static generateDocumentPassword() {
        return PassphraseCrypto.generateDocumentPassword()
    }

    /**
     * Resolve a document password to an AES-GCM key.
     * If the password is a raw DEK (43/44 char base64), use it directly.
     * Otherwise, derive the key via PBKDF2.
     */
    static resolvePasswordToKey(password, salt, iterations) {
        return E2EEKeyManager.resolvePasswordToKey(password, salt, iterations)
    }

    /**
     * Check if a user has set up encryption keys (for sharing).
     */
    static async userHasEncryptionKeys(userId) {
        try {
            const data = await getJson(
                `/api/user/encryption_public_key/${userId}/`
            )
            return data.has_key === true
        } catch (_e) {
            return false
        }
    }

    /**
     * Check if user has dismissed the passphrase setup offer.
     */
    static async hasUserDismissedPassphraseOffer() {
        try {
            const data = await getJson("/api/user/preferences/get/")
            return data.preferences?.has_dismissed_passphrase_offer === true
        } catch (_e) {
            return false
        }
    }

    /**
     * Mark that user has dismissed the passphrase setup offer.
     */
    static async markPassphraseDismissed() {
        try {
            await postJson("/api/user/preferences/update/", {
                has_dismissed_passphrase_offer: true
            })
        } catch (_e) {
            // Silently fail - preference saving is best-effort
        }
    }
}

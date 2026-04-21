import {addAlert, escapeText, longFilePath} from "../../common"
import {E2EEEncryptor} from "../../editor/e2ee/encryptor"
import {E2EEKeyManager} from "../../editor/e2ee/key-manager"
import {
    createPasswordDialog,
    enterPasswordDialog
} from "../../editor/e2ee/password-dialog"
import {NativeImporter} from "../../importer/native"
import {ShrinkFidus} from "./shrink"

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export class SaveCopy {
    constructor(
        doc,
        bibDB,
        imageDB,
        newUser,
        importId = null,
        e2eeOptions = null
    ) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.newUser = newUser
        this.importId = importId
        this.e2eeOptions = e2eeOptions // {sourceKey?: CryptoKey, targetE2EE?: boolean, targetPassword?: string}
    }

    init() {
        let shrinkerPromise
        if (this.doc.e2ee) {
            // Decrypt the document content first
            shrinkerPromise = this._decryptDocument().then(decryptedDoc => {
                const shrinker = new ShrinkFidus(
                    decryptedDoc,
                    this.imageDB,
                    this.bibDB
                )
                return shrinker.init()
            })
        } else {
            const shrinker = new ShrinkFidus(this.doc, this.imageDB, this.bibDB)
            shrinkerPromise = shrinker.init()
        }
        return shrinkerPromise
            .then(({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                let targetE2EEPromise
                if (this.e2eeOptions && this.e2eeOptions.targetE2EE) {
                    targetE2EEPromise = this._setupTargetE2EE(doc)
                } else {
                    targetE2EEPromise = Promise.resolve({
                        doc,
                        e2eeOptions: null
                    })
                }
                return targetE2EEPromise.then(
                    ({doc: encryptedDoc, e2eeOptions}) => {
                        const importerE2EEOptions = e2eeOptions || {}
                        if (this.e2eeOptions && this.e2eeOptions.sourceKey) {
                            importerE2EEOptions.sourceKey =
                                this.e2eeOptions.sourceKey
                        }
                        const importer = new NativeImporter(
                            encryptedDoc,
                            shrunkBibDB,
                            shrunkImageDB,
                            httpIncludes,
                            this.newUser,
                            this.importId,
                            longFilePath(
                                doc.title,
                                doc.path,
                                `${gettext("Copy of")} `
                            ),
                            null,
                            importerE2EEOptions
                        )
                        return importer.init()
                    }
                )
            })
            .then(({doc, docInfo}) => {
                addAlert(
                    "info",
                    `${escapeText(doc.title)} ${gettext(" successfully copied.")}`
                )
                return Promise.resolve({doc, docInfo})
            })
    }

    async _decryptDocument() {
        const key = this.e2eeOptions?.sourceKey
        if (!key) {
            throw new Error("Missing source E2EE key for decryption")
        }
        const decryptedDoc = Object.assign({}, this.doc)
        if (typeof decryptedDoc.content === "string") {
            decryptedDoc.content = await E2EEEncryptor.decryptObject(
                decryptedDoc.content,
                key
            )
        }
        if (typeof decryptedDoc.comments === "string") {
            decryptedDoc.comments = await E2EEEncryptor.decryptObject(
                decryptedDoc.comments,
                key
            )
        }
        if (typeof decryptedDoc.bibliography === "string") {
            decryptedDoc.bibliography = await E2EEEncryptor.decryptObject(
                decryptedDoc.bibliography,
                key
            )
        }
        // Also update this.bibDB.db if it holds the encrypted bibliography
        if (this.bibDB && typeof this.bibDB.db === "string") {
            this.bibDB.db = decryptedDoc.bibliography
        }
        // Decrypt images if needed
        if (this.imageDB && this.imageDB.db) {
            await Promise.all(
                Object.values(this.imageDB.db).map(async imageEntry => {
                    if (
                        imageEntry.image &&
                        typeof imageEntry.image === "string" &&
                        imageEntry.image.startsWith("data:")
                    ) {
                        return
                    }
                    if (
                        imageEntry.file &&
                        imageEntry.file_type === "application/octet-stream"
                    ) {
                        try {
                            const fileBuffer =
                                await imageEntry.file.arrayBuffer()
                            const base64 = btoa(
                                String.fromCharCode(
                                    ...new Uint8Array(fileBuffer)
                                )
                            )
                            const decrypted =
                                await E2EEEncryptor.decryptBufferToBase64(
                                    base64,
                                    key
                                )
                            const mime =
                                imageEntry.original_file_type || "image/png"
                            const byteCharacters = atob(decrypted)
                            const byteNumbers = new Array(byteCharacters.length)
                            for (let i = 0; i < byteCharacters.length; i++) {
                                byteNumbers[i] = byteCharacters.charCodeAt(i)
                            }
                            const byteArray = new Uint8Array(byteNumbers)
                            imageEntry.file = new Blob([byteArray], {
                                type: mime
                            })
                            imageEntry.file_type = mime
                        } catch (_e) {
                            // If decryption fails, keep original file
                        }
                    }
                })
            )
        }
        return decryptedDoc
    }

    async _setupTargetE2EE(doc) {
        const password = this.e2eeOptions.targetPassword
        if (!password) {
            throw new Error("Missing target E2EE password")
        }
        const salt = E2EEKeyManager.generateSalt()
        const saltBase64 = btoa(String.fromCharCode(...salt))
        const iterations = 600000
        const key = await E2EEKeyManager.deriveKey(password, salt, iterations)

        // Keep doc content/comments/bibliography as plaintext.
        // NativeImporter needs plaintext for template extraction and
        // reference ID translation. Encryption happens in saveDocument().
        const plainDoc = Object.assign({}, doc)

        // Encrypt images now so they are stored as encrypted blobs
        // before NativeImporter.uploadImages reads them.
        if (this.imageDB && this.imageDB.db) {
            await Promise.all(
                Object.values(this.imageDB.db).map(async imageEntry => {
                    if (imageEntry.file) {
                        try {
                            const encryptedFile =
                                await E2EEEncryptor.encryptImage(
                                    imageEntry.file,
                                    key
                                )
                            imageEntry.file = encryptedFile
                            imageEntry.original_file_type = imageEntry.file_type
                            imageEntry.file_type = "application/octet-stream"
                        } catch (_e) {
                            // If encryption fails, keep original file
                        }
                    }
                })
            )
        }

        return {
            doc: plainDoc,
            e2eeOptions: {
                enabled: true,
                key: key,
                salt: saltBase64,
                iterations: iterations
            }
        }
    }
}

import {SaveCopy as GenericSaveCopy} from "@fiduswriter/document/exporter/native"
import {addProgress, gettext, shortFileTitle} from "fwtoolkit"
import {E2EEEncryptor} from "../../editor/e2ee/encryptor"
import {E2EEKeyManager} from "../../editor/e2ee/key-manager"
import {NativeImporter} from "../../importer/native"

export class SaveCopy extends GenericSaveCopy {
    constructor(
        doc,
        bibDB,
        imageDB,
        newUser,
        importId = null,
        e2eeOptions = null
    ) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Creating copy...")}`,
            {autoClose: false}
        )
        const progressCallback = (message, percentage) =>
            task.update(percentage, message)
        const e2ee = {
            decryptObject: E2EEEncryptor.decryptObject.bind(E2EEEncryptor),
            encryptObject: E2EEEncryptor.encryptObject.bind(E2EEEncryptor),
            encrypt: E2EEEncryptor.encrypt.bind(E2EEEncryptor),
            encryptImage: E2EEEncryptor.encryptImage.bind(E2EEEncryptor),
            generateSalt: E2EEKeyManager.generateSalt.bind(E2EEKeyManager),
            deriveKey: E2EEKeyManager.deriveKey.bind(E2EEKeyManager)
        }

        const importDocument = (doc, bibDB, imageDB, httpIncludes, options) =>
            new NativeImporter(
                doc,
                bibDB,
                imageDB,
                httpIncludes,
                options.user,
                options.importId,
                options.requestedPath,
                null,
                options.e2eeOptions
            ).init()

        super(doc, bibDB, imageDB, newUser, {
            importId,
            e2eeOptions,
            e2ee,
            importDocument,
            progressCallback
        })
    }
}

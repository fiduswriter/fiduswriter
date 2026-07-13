import {NativeImporter as GenericNativeImporter} from "@fiduswriter/document/importer/native"
import {E2EEEncryptor} from "@fiduswriter/editor/e2ee/encryptor"
import {E2EEKeyManager} from "@fiduswriter/editor/e2ee/key-manager"
import {addAlert, postJson, shortFileTitle} from "fwtoolkit"
import {extractTemplate} from "../../document_template"

export function createNativeImporterBackend(_user, _e2eeOptions) {
    return {
        createDoc: (template, importId, path, e2ee, files) => {
            const jsonData = {
                template: template.content,
                export_templates: template.exportTemplates,
                document_styles: template.documentStyles,
                import_id: importId
                    ? importId
                    : template.content.attrs.import_id,
                template_title: template.content.attrs.template,
                path
            }
            if (e2ee?.enabled) {
                jsonData.e2ee = true
                if (e2ee.salt) {
                    jsonData.e2ee_salt = e2ee.salt
                }
                if (e2ee.iterations) {
                    jsonData.e2ee_iterations = e2ee.iterations
                }
            }
            return postJson("/api/document/import/create/", jsonData, files)
                .then(({json}) => ({
                    id: json.id,
                    path: json.path,
                    e2ee: json.e2ee,
                    template: json.template
                }))
                .catch(error => {
                    addAlert("error", gettext("Could not create document"))
                    throw error
                })
        },
        saveImages: async (images, docId, e2ee) => {
            const isE2EE = e2ee?.enabled
            const endpoint = isE2EE
                ? "/api/document/e2ee_image/"
                : "/api/document/import/image/"
            const ImageTranslationTable = {}
            await Promise.all(
                Object.values(images.db).map(async imageEntry => {
                    await maybeDecryptImage(imageEntry, e2ee?.sourceKey)
                    const encryptedFile =
                        e2ee?.enabled && e2ee.key
                            ? await E2EEEncryptor.encryptImage(
                                  imageEntry.file,
                                  e2ee.key
                              )
                            : imageEntry.file
                    const jsonData = {
                        doc_id: docId,
                        title: imageEntry.title,
                        copyright: imageEntry.copyright,
                        checksum: imageEntry.checksum
                    }
                    const files = {
                        image: {
                            file: encryptedFile,
                            filename: imageEntry.image.split("/").pop()
                        }
                    }
                    const {json} = await postJson(endpoint, jsonData, files)
                    ImageTranslationTable[imageEntry.id] = json.id
                })
            )
            return ImageTranslationTable
        },
        saveDocument: async (saveData, e2ee) => {
            if (e2ee?.enabled && e2ee.key) {
                saveData.content = await E2EEEncryptor.encryptObject(
                    saveData.content,
                    e2ee.key
                )
                saveData.comments = await E2EEEncryptor.encryptObject(
                    saveData.comments || {},
                    e2ee.key
                )
                saveData.bibliography = await E2EEEncryptor.encryptObject(
                    saveData.bibliography,
                    e2ee.key
                )
                saveData.title = await E2EEEncryptor.encrypt(
                    saveData.title,
                    e2ee.key
                )
            }
            return postJson("/api/document/import/", saveData)
                .then(({json}) => ({added: json.added, updated: json.updated}))
                .catch(error => {
                    addAlert(
                        "error",
                        `${gettext("Could not save ")} ${shortFileTitle(
                            saveData.title,
                            ""
                        )}`
                    )
                    throw error
                })
        },
        extractTemplate,
        encryptImage: E2EEEncryptor.encryptImage.bind(E2EEEncryptor),
        encryptObject: E2EEEncryptor.encryptObject.bind(E2EEEncryptor),
        encrypt: E2EEEncryptor.encrypt.bind(E2EEEncryptor),
        storeKeyInSession: E2EEKeyManager.storeKeyInSession.bind(E2EEKeyManager)
    }
}

export class NativeImporter extends GenericNativeImporter {
    constructor(
        doc,
        bibliography,
        images,
        otherFiles,
        user,
        importId = null,
        requestedPath = "",
        template = null,
        e2eeOptions = null
    ) {
        super(
            doc,
            bibliography,
            images,
            otherFiles,
            user,
            createNativeImporterBackend(user, e2eeOptions),
            {
                importId,
                requestedPath,
                template,
                e2eeOptions
            }
        )
    }
}

async function maybeDecryptImage(imageEntry, sourceKey) {
    if (!sourceKey || !imageEntry.file) {
        return
    }
    if (imageEntry.file_type !== "application/octet-stream") {
        return
    }
    const fileBuffer = await imageEntry.file.arrayBuffer()
    const bytes = new Uint8Array(fileBuffer)
    let binary = ""
    const chunkSize = 65536
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize)
        binary += String.fromCharCode.apply(null, chunk)
    }
    const base64 = btoa(binary)
    const decrypted = await E2EEEncryptor.decryptBufferToBase64(
        base64,
        sourceKey
    )
    const mime = imageEntry.original_file_type || "image/png"
    const byteCharacters = atob(decrypted)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    imageEntry.file = new Blob([byteArray], {type: mime})
    imageEntry.file_type = mime
}

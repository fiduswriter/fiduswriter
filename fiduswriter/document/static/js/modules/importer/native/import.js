import {
    addAlert,
    deactivateWait,
    jsonPostJson,
    shortFileTitle
} from "../../common"
import {extractTemplate} from "../../document_template"
import {E2EEKeyManager} from "../../editor/e2ee/key-manager"
import {GetImages} from "./get_images"

export class NativeImporter {
    /* Save document information into the database */
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
        this.doc = doc
        this.docId = false
        this.path = false
        this.bibliography = bibliography
        this.images = images
        this.otherFiles = otherFiles // Data of image files
        this.user = user
        this.importId = importId
        this.requestedPath = requestedPath
        this.template = template
        this.e2eeOptions = e2eeOptions // {enabled: boolean, key?: CryptoKey}
    }

    init() {
        const ImageTranslationTable = {}
        // We first create any new entries in the DB for images.
        const imageGetter = new GetImages(this.images, this.otherFiles)
        return imageGetter
            .init()
            .then(() => {
                const missingImage = Object.values(this.images).find(
                    imageEntry => !imageEntry.file
                )
                if (missingImage) {
                    addAlert(
                        "error",
                        `${gettext("Could not create document. Missing image file:")} ${missingImage.image}`
                    )
                    deactivateWait()
                    throw new Error(`Missing image file: ${missingImage.image}`)
                }
            })
            .then(() => this.createDoc())
            .then(() => {
                if (!this.docId) {
                    return Promise.reject(new Error("document not created"))
                }
                return this.saveImages(this.images, ImageTranslationTable)
            })
            .then(() => {
                // We need to change some reference numbers in the document content
                this.translateReferenceIds(ImageTranslationTable)
                // We are good to go. All the used images and bibliography entries
                // exist in the DB for this user with the same numbers.
                // We can go ahead and create the new document entry in the
                // bibliography without any changes.
                return this.saveDocument()
            })
    }

    async _maybeDecryptImage(imageEntry) {
        if (
            !this.e2eeOptions ||
            !this.e2eeOptions.sourceKey ||
            !imageEntry.file
        ) {
            return
        }
        if (imageEntry.file_type !== "application/octet-stream") {
            return
        }
        const {E2EEEncryptor} = await import("../../editor/e2ee/encryptor")
        const fileBuffer = await imageEntry.file.arrayBuffer()
        const bytes = new Uint8Array(fileBuffer)
        // Build binary string in chunks to avoid "Maximum call stack size exceeded"
        let binary = ""
        const chunkSize = 65536
        for (let i = 0; i < bytes.length; i += chunkSize) {
            const chunk = bytes.subarray(i, i + chunkSize)
            binary += String.fromCharCode.apply(null, chunk)
        }
        const base64 = btoa(binary)
        const decrypted = await E2EEEncryptor.decryptBufferToBase64(
            base64,
            this.e2eeOptions.sourceKey
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

    async _maybeEncryptImage(imageEntry) {
        if (
            !this.e2eeOptions ||
            !this.e2eeOptions.enabled ||
            !this.e2eeOptions.key
        ) {
            return imageEntry.file
        }
        const {E2EEEncryptor} = await import("../../editor/e2ee/encryptor")
        return E2EEEncryptor.encryptImage(imageEntry.file, this.e2eeOptions.key)
    }

    saveImages(images, ImageTranslationTable) {
        const isE2EE = this.e2eeOptions && this.e2eeOptions.enabled
        const endpoint = isE2EE
            ? "/api/document/e2ee_image/"
            : "/api/document/import/image/"

        const sendPromises = Object.values(images).map(imageEntry => {
            return this._maybeDecryptImage(imageEntry)
                .then(() => this._maybeEncryptImage(imageEntry))
                .then(encryptedFile => {
                    const jsonData = {
                        doc_id: this.docId,
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
                    return jsonPostJson(endpoint, jsonData, false, files)
                })
                .then(
                    ({json}) => (ImageTranslationTable[imageEntry.id] = json.id)
                )
                .catch(error => {
                    addAlert(
                        "error",
                        `${gettext("Could not save Image")} ${imageEntry.checksum}`
                    )
                    throw error
                })
        })
        return Promise.all(sendPromises)
    }

    translateReferenceIds(ImageTranslationTable) {
        function walkTree(node) {
            switch (node.type) {
                case "image":
                    if (node.attrs.image !== false) {
                        node.attrs.image =
                            ImageTranslationTable[node.attrs.image]
                    }
                    break
                case "footnote":
                    if (node.attrs?.footnote) {
                        node.attrs.footnote.forEach(childNode => {
                            walkTree(childNode)
                        })
                    }
                    break
            }
            if (node.content) {
                node.content.forEach(childNode => {
                    walkTree(childNode)
                })
            }
        }
        walkTree(this.doc.content)
    }

    createDoc() {
        const template = this.template
            ? this.template
            : extractTemplate(this.doc.content)

        const jsonData = {
            template: template.content,
            export_templates: template.exportTemplates,
            document_styles: template.documentStyles,
            import_id: this.importId
                ? this.importId
                : template.content.attrs.import_id,
            template_title: template.content.attrs.template,
            path: this.requestedPath
        }

        if (this.e2eeOptions && this.e2eeOptions.enabled) {
            jsonData.e2ee = true
            if (this.e2eeOptions.salt) {
                jsonData.e2ee_salt = this.e2eeOptions.salt
            }
            if (this.e2eeOptions.iterations) {
                jsonData.e2ee_iterations = this.e2eeOptions.iterations
            }
        }

        const files = {}
        if (template.files && template.files.length) {
            files.files = template.files.map(
                ({filename, content}) => new File([content], filename)
            )
        }

        // We create the document on the server so that we have an ID for it and
        // can link the images to it.
        return jsonPostJson(
            "/api/document/import/create/",
            jsonData,
            false,
            files
        )
            .then(({json}) => {
                this.docId = json.id
                this.path = json.path
                this.e2ee = json.e2ee || false
            })
            .catch(error => {
                addAlert("error", gettext("Could not create document"))
                throw error
            })
    }

    async saveDocument() {
        let saveData
        if (
            this.e2eeOptions &&
            this.e2eeOptions.enabled &&
            this.e2eeOptions.key
        ) {
            // For E2EE documents, encrypt content/comments/bibliography
            // before sending to the server.
            const {E2EEEncryptor} = await import("../../editor/e2ee/encryptor")
            const encryptedContent = await E2EEEncryptor.encryptObject(
                this.doc.content,
                this.e2eeOptions.key
            )
            const encryptedComments = await E2EEEncryptor.encryptObject(
                this.doc.comments || {},
                this.e2eeOptions.key
            )
            const encryptedBibliography = await E2EEEncryptor.encryptObject(
                this.bibliography,
                this.e2eeOptions.key
            )
            // Encrypt the title as well so it doesn't leak server-side.
            const encryptedTitle = await E2EEEncryptor.encrypt(
                this.doc.title,
                this.e2eeOptions.key
            )
            saveData = {
                id: this.docId,
                title: encryptedTitle,
                content: encryptedContent,
                comments: encryptedComments,
                bibliography: encryptedBibliography
            }
        } else {
            saveData = {
                id: this.docId,
                title: this.doc.title,
                content: this.doc.content,
                comments: this.doc.comments,
                bibliography: this.bibliography
            }
        }
        return jsonPostJson("/api/document/import/", saveData)
            .then(({json}) => {
                const docInfo = {
                    is_owner: true,
                    access_rights: "write",
                    id: this.docId
                }
                this.doc.owner = {
                    id: this.user.id,
                    name: this.user.name,
                    avatar: this.user.avatar
                }
                this.doc.is_owner = true
                this.doc.version = 0
                this.doc.comment_version = 0
                this.doc.id = this.docId
                this.doc.added = json.added
                this.doc.updated = json.updated
                this.doc.revisions = []
                this.doc.rights = "write"
                this.doc.path = this.path
                this.doc.e2ee = this.e2ee || false
                // Cache the E2EE key in sessionStorage so the user doesn't have
                // to re-enter the password when opening the document again.
                if (
                    this.e2eeOptions &&
                    this.e2eeOptions.enabled &&
                    this.e2eeOptions.key &&
                    this.docId
                ) {
                    E2EEKeyManager.storeKeyInSession(
                        this.docId,
                        this.e2eeOptions.key
                    )
                }
                return {doc: this.doc, docInfo}
            })
            .catch(error => {
                addAlert(
                    "error",
                    `${gettext("Could not save ")} ${shortFileTitle(this.doc.title, this.doc.path)}`
                )
                throw error
            })
    }
}

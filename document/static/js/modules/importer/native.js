import {addAlert, postJson} from "../common"
import {GetImages} from "./get_images"
import {templateHash, extractTemplate} from "../document_template"

export class ImportNative {
    /* Save document information into the database */
    constructor(doc, bibliography, images, otherFiles, user) {
        this.doc = doc
        this.docId = false
        this.bibliography = bibliography
        this.images = images
        this.otherFiles = otherFiles // Data of image files
        this.user = user
    }

    init() {
        const ImageTranslationTable = {}
        return this.createDoc().then(
            () => {
                if (!this.docId) {
                    return Promise.reject(new Error('document not created'))
                }
                // We first create any new entries in the DB for images.
                const imageGetter = new GetImages(this.images, this.otherFiles)
                return imageGetter.init()
            }
        ).then(
            () => this.saveImages(this.images, ImageTranslationTable)
        ).then(
            () => {
            // We need to change some reference numbers in the document contents
            this.translateReferenceIds(ImageTranslationTable)
            // We are good to go. All the used images and bibliography entries
            // exist in the DB for this user with the same numbers.
            // We can go ahead and create the new document entry in the
            // bibliography without any changes.
            return this.saveDocument()
        }).catch(
            () => {
                addAlert('error', 'Could not create document')
                return Promise.reject(new Error('document not created'))
            }
        )

    }

    saveImages(images, ImageTranslationTable) {
        const sendPromises = Object.values(images).map(
            imageEntry => {
                return postJson('/api/document/import/image/', {
                    doc_id: this.docId,
                    title: imageEntry.title,
                    checksum: imageEntry.checksum,
                    image: {file: imageEntry.file, filename: imageEntry.image.split('/').pop()}
                }).then(
                    ({json}) => ImageTranslationTable[imageEntry.id] = json.id
                ).catch(error => {
                    addAlert(
                        'error',
                        `${gettext('Could not save Image')} ${imageEntry.checksum}`
                    )
                    throw (error)
                })
            }
        )
        return Promise.all(sendPromises)
    }

    translateReferenceIds(ImageTranslationTable) {
        function walkTree(node) {
            switch (node.type) {
                case 'figure':
                    if (node.attrs.image !== false) {
                        node.attrs.image = ImageTranslationTable[node.attrs.image]
                    }
                    break
                case 'footnote':
                    if (node.attrs && node.attrs.footnote) {
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
        walkTree(this.doc.contents)
    }

    createDoc() {
        // We create the document on the sever so that we have an ID for it and
        // can link the images to it.

        return postJson('/api/document/import/create/').then(
            ({json}) => this.docId = json.id
        ).catch(error => {
            addAlert('error', gettext('Could not create document'))
            throw (error)
        })
    }

    saveDocument() {
        const template = extractTemplate(this.doc.contents),
            template_hash = templateHash(template),
            template_title = template.attrs.template
        return postJson(
            '/api/document/import/',
            {
                id: this.docId,
                title: this.doc.title,
                contents: JSON.stringify(this.doc.contents),
                comments: JSON.stringify(this.doc.comments),
                bibliography: JSON.stringify(this.bibliography),
                template: JSON.stringify(template),
                template_hash,
                template_title
            }
        ).then(
            ({json}) => {
                const docInfo = {
                    is_owner: true,
                    access_rights: 'write',
                    id: this.docId
                }
                this.doc.owner = {
                    id: this.user.id,
                    name: this.user.name,
                    avatar: this.user.avatar.url
                }
                this.doc.is_owner = true
                this.doc.version = 0
                this.doc.comment_version = 0
                this.doc.id = this.docId
                this.doc.added = json.added
                this.doc.updated = json.updated
                this.doc.revisions = []
                this.doc.rights = "write"
                return {doc: this.doc, docInfo}

            }
        ).catch(
            error => {
                addAlert('error', `${gettext('Could not save ')} ${this.doc.title}`)
                throw (error)
            }
        )
    }
}

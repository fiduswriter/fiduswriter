import {addAlert, postJson} from "../common"
import {GetImages} from "./get-images"

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
        let ImageTranslationTable = {}
        return this.createDoc().then(
            () => {
                // We first create any new entries in the DB for images.
                let imageGetter = new GetImages(this.images, this.otherFiles)
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
        })

    }

    saveImages(images, ImageTranslationTable) {
        let sendPromises = Object.values(images).map(
            imageEntry => {
                return postJson('/document/import/image', {
                    doc_id: this.docId,
                    title: imageEntry.title,
                    checksum: imageEntry.checksum,
                    image: {file: imageEntry.file, filename: imageEntry.image.split('/').pop()}
                }).then(
                    data => ImageTranslationTable[imageEntry.id] = data.id
                ).catch(
                    () => {
                        addAlert(
                            'error',
                            `${gettext('Could not save Image')} ${imageEntry.checksum}`
                        )
                        return Promise.reject()
                    }
                )

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

        return postJson('/document/import/create/').then(
                data => this.docId = data.id
            ).catch(
                () => {
                    addAlert('error', gettext('Could not create document'))
                    return Promise.reject()
                }
            )
    }

    saveDocument() {

        return postJson(
            '/document/import/',
            {
                id: this.docId,
                title: this.doc.title,
                contents: JSON.stringify(this.doc.contents),
                comments: JSON.stringify(this.doc.comments),
                bibliography: JSON.stringify(this.bibliography)
            }
        ).then(
            data => {
                let docInfo = {
                    is_owner: true,
                    access_rights: 'write',
                    id: this.docId
                }
                this.doc.owner = {
                    id: this.user.id,
                    name: this.user.name,
                    avatar: this.user.avatar
                }
                this.doc.version = 0
                this.doc.comment_version = 0
                this.doc.id = this.docId
                this.doc.added = data['added']
                this.doc.updated = data['updated']
                this.doc.revisions = []
                this.doc.rights = "write"
                return {doc: this.doc, docInfo}
            }
        ).catch(
            () => {
                addAlert('error', `${gettext('Could not save ')} ${this.doc.title}`)
                return Promise.reject()
            }
        )
    }
}

import {addAlert, csrfToken} from "../common"
import {GetImages} from "./get-images"

export class ImportNative {
    /* Save document information into the database */
    constructor(doc, impBibDB, impImageDB, entries, user, bibDB, imageDB) {
        this.doc = doc
        this.impBibDB = impBibDB // These are the imported values
        this.impImageDB = impImageDB // These are the imported values
        this.entries = entries
        this.user = user
        this.bibDB = bibDB // These are values stored in the database
        this.imageDB = imageDB // These are values stored in the database
    }

    init() {
        let {BibTranslationTable, newBibEntries} = this.compareBibDBs()
        let {ImageTranslationTable, newImageEntries} = this.compareImageDBs()

        // We first create any new entries in the DB for images and/or
        // bibliography items.
        let imageGetter = new GetImages(newImageEntries, this.entries)
        return imageGetter.init().then(
            () => this.saveImages(newImageEntries, ImageTranslationTable)
        ).then(
            () => this.bibDB.saveBibEntries(newBibEntries, true)
        ).then(
            idTranslations => idTranslations.forEach(idTrans => {BibTranslationTable[idTrans[0]] = idTrans[1]})
        ).then(() => {
            // We need to change some reference numbers in the document contents
            this.translateReferenceIds(BibTranslationTable, ImageTranslationTable)
            // We are good to go. All the used images and bibliography entries
            // exist in the DB for this user with the same numbers.
            // We can go ahead and create the new document entry in the
            // bibliography without any changes.
            return this.createNewDocument()
        })

    }

    saveImages(newImageEntries, ImageTranslationTable) {
        let sendPromises = newImageEntries.map(
            imageEntry => {
                let formValues = new window.FormData()
                formValues.append('id', 0)
                formValues.append('title', imageEntry.title)
                formValues.append('imageCats', '')
                formValues.append('image', imageEntry.file, imageEntry.oldUrl.split('/').pop())
                formValues.append('checksum', imageEntry.checksum)
                return this.imageDB.saveImage(formValues).then(
                    newId => {
                        ImageTranslationTable[imageEntry.oldId] = newId
                    }
                )
            }
        )
        return Promise.all(sendPromises)
    }

    compareBibDBs() {
        let BibTranslationTable = {},
            newBibEntries = {}

        Object.keys(this.impBibDB).forEach(impKey => {
            let impEntry = this.impBibDB[impKey]
            let matchEntries = []
            Object.keys(this.bibDB.db).forEach(key => {
                let bibEntry = this.bibDB.db[key]
                if(
                    impEntry.bib_type === bibEntry.bib_type &&
                    _.isEqual(impEntry.fields, bibEntry.fields)
                ) {
                    matchEntries.push(key)
                }
            })
            if (0 === matchEntries.length) {
                //create new
                newBibEntries[impKey] = this.impBibDB[impKey]
                newBibEntries[impKey].entry_cat = []
            } else {
                BibTranslationTable[impKey] = matchEntries[0]
            }
        })

        return {BibTranslationTable, newBibEntries}
    }

    compareImageDBs() {
        let ImageTranslationTable = {},
        newImageEntries = []

        Object.keys(this.impImageDB).map(key => parseInt(key)).forEach(key => {
            let imageObj = this.impImageDB[key]
            let matchEntries = _.where(
                this.imageDB.db,
                {checksum: imageObj.checksum}
            )
            if (0 === matchEntries.length) {
                newImageEntries.push({
                    oldId: key,
                    oldUrl: imageObj.image,
                    title: imageObj.title,
                    file_type: imageObj.file_type,
                    checksum: imageObj.checksum
                })
            } else {
                // There is at least one match.
                // We pick the first.
                ImageTranslationTable[key] = matchEntries[0].pk
            }
        })
        return {ImageTranslationTable, newImageEntries}
    }


    translateReferenceIds(BibTranslationTable, ImageTranslationTable) {
        function walkTree(node) {
            switch (node.type) {
                case 'citation':
                    node.attrs.references.forEach(ref => {
                        ref.id = BibTranslationTable[ref.id]
                    })
                    break
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

    createNewDocument() {
        let postData = {
            title: this.doc.title,
            contents: JSON.stringify(this.doc.contents),
            comments: JSON.stringify(this.doc.comments),
            settings: JSON.stringify(this.doc.settings),
            metadata: JSON.stringify(this.doc.metadata)
        }
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                url: '/document/import/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: (data, textStatus, jqXHR) => {
                    let docInfo = {
                        unapplied_diffs: [],
                        is_owner: true,
                        rights: 'write',
                        changed: false,
                        title_changed: false
                    }
                    this.doc.owner = {
                        id: this.user.id,
                        name: this.user.name,
                        avatar: this.user.avatar
                    }
                    this.doc.id = data['document_id']
                    this.doc.version = 0
                    this.doc.comment_version = 0
                    this.doc.added = data['added']
                    this.doc.updated = data['updated']
                    this.doc.revisions = []
                    this.doc.rights = "write"
                    resolve({doc: this.doc, docInfo})
                },
                error: () => {
                    reject(gettext('Could not save ') + this.doc.title)
                }
            })
        })

    }
}

import {addAlert, csrfToken} from "../common/common"
import {GetImages} from "./get-images"
import {SaveImages} from "./save-images"
import {SaveBibs} from "./save-bibs"

export class ImportNative {
    /* Save document information into the database */
    constructor(aDocument, impBibDB, impImageDB, entries, user, bibDB, imageDB, callback) {
        this.aDocument = aDocument
        this.impBibDB = impBibDB // These are the imported values
        this.impImageDB = impImageDB // These are the imported values
        this.entries = entries
        this.user = user
        this.bibDB = bibDB // These are values stored in the database
        this.imageDB = imageDB // These are values stored in the database
        this.callback = callback
        this.importNative()
    }

    importNative() {

        let [BibTranslationTable, newBibEntries] = this.compareBibDBs()
        let [ImageTranslationTable, newImageEntries] = this.compareImageDBs()

        // We first create any new entries in the DB for images and/or
        // bibliography items.
        let imageGetter = new GetImages(newImageEntries, this.entries)
        imageGetter.init().then(() => {
            let imageSaver = new SaveImages(newImageEntries, ImageTranslationTable, this.imageDB)
            return imageSaver.init()
        }).then(() => {
            let bibSaver = new SaveBibs(newBibEntries, BibTranslationTable, this.bibDB)
            return bibSaver.init()
        }).then(() => {
            // We need to change some reference numbers in the document contents
            this.translateReferenceIds(BibTranslationTable, ImageTranslationTable)
            // We are good to go. All the used images and bibliography entries
            // exist in the DB for this user with the same numbers.
            // We can go ahead and create the new document entry in the
            // bibliography without any changes.
            this.createNewDocument()
        })

    }

    compareBibDBs() {
        let BibTranslationTable = {},
            newBibEntries = {}

        Object.keys(this.impBibDB).forEach(impKey => {
            let impEntry = this.impBibDB[impKey]
            let matchEntries = []
            Object.keys(this.bibDB).forEach(key => {
                let bibEntry = this.bibDB[key]
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

        return [BibTranslationTable, newBibEntries]
    }

    compareImageDBs() {
        let ImageTranslationTable = {},
        newImageEntries = []

        Object.keys(this.impImageDB).map(key => parseInt(key)).forEach(key => {
            let imageObj = this.impImageDB[key]
            let matchEntries = _.where(
                this.imageDB,
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
            } else if (!(_.findWhere(matchEntries, {pk: key}))) {
                // There is at least one match, and none of the matches have
                // the same id as the key in this.impImageDB.
                // We therefore pick the first match.
                ImageTranslationTable[key] = matchEntries[0].pk
            }
        })

        return [ImageTranslationTable, newImageEntries]
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
        walkTree(this.aDocument.contents)
    }

    createNewDocument() {
        let that = this
        let postData = {
            title: this.aDocument.title,
            contents: JSON.stringify(this.aDocument.contents),
            comments: JSON.stringify(this.aDocument.comments),
            settings: JSON.stringify(this.aDocument.settings),
            metadata: JSON.stringify(this.aDocument.metadata)
        }
        jQuery.ajax({
            url: '/document/import/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function(data, textStatus, jqXHR) {
                let docInfo = {
                    unapplied_diffs: [],
                    is_owner: true,
                    rights: 'write',
                    changed: false,
                    title_changed: false
                }
                that.aDocument.owner = {
                    id: that.user.id,
                    name: that.user.name,
                    avatar: that.user.avatar
                }
                that.aDocument.id = data['document_id']
                that.aDocument.version = 0
                that.aDocument.comment_version = 0
                that.aDocument.added = data['added']
                that.aDocument.updated = data['updated']
                that.aDocument.revisions = []
                that.aDocument.rights = "write"
                return that.callback(true, [
                    that.aDocument,
                    docInfo
                ])
            },
            error: function() {
                that.callback(false, gettext('Could not save ') + that.aDocument.title)
            }
        })
    }
}

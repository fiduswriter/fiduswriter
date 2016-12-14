import {addAlert, csrfToken} from "../common/common"
import {docSchema} from "../schema/document"
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
        let shrunkImageDBObject = {},
        ImageTranslationTable = [],
        newImageEntries = [],
        simplifiedShrunkImageDB = []

        // We need to remove the pk from the entry in the this.impImageDB so that
        // we also get matches with this.entries with other pk values.
        // We therefore convert to an associative array/object.
        for (let key in this.impImageDB) {
            simplifiedShrunkImageDB.push(_.omit(this.impImageDB[key], 'image',
                'thumbnail', 'cats', 'added'))
        }

        for (let image in simplifiedShrunkImageDB) {
            shrunkImageDBObject[simplifiedShrunkImageDB[image].pk] =
                simplifiedShrunkImageDB[image]
            delete shrunkImageDBObject[simplifiedShrunkImageDB[image].pk].pk
        }

        for (let key in shrunkImageDBObject) {
            let matchEntries = _.where(this.imageDB, shrunkImageDBObject[key])
            if (0 === matchEntries.length) {
                //create new
                let sIDBEntry = _.findWhere(this.impImageDB, {
                    pk: parseInt(key)
                })
                newImageEntries.push({
                    oldId: parseInt(key),
                    oldUrl: sIDBEntry.image,
                    title: sIDBEntry.title,
                    file_type: sIDBEntry.file_type,
                    checksum: sIDBEntry.checksum
                })
            } else if (1 === matchEntries.length && parseInt(key) !==
                matchEntries[0].pk) {
                ImageTranslationTable.push({
                    oldId: parseInt(key),
                    newId: matchEntries[0].pk,
                    oldUrl: _.findWhere(this.impImageDB, {
                        pk: parseInt(key)
                    }).image,
                    newUrl: matchEntries[0].image
                })
            } else if (1 < matchEntries.length) {
                if (!(_.findWhere(matchEntries, {pk: parseInt(key)}))) {
                    // There are several matches, and none of the matches have
                    // the same id as the key in this.impImageDB.
                    // We now pick the first match.
                    // TODO: Figure out if this behavior is correct.
                    ImageTranslationTable.push({
                        oldId: key,
                        newId: matchEntries[0].pk,
                        oldUrl: _.findWhere(this.impImageDB, {
                            pk: parseInt(key)
                        }).image,
                        newUrl: matchEntries[0].image
                    })
                }
            }
        }

        return [ImageTranslationTable, newImageEntries]
    }


    translateReferenceIds(BibTranslationTable, ImageTranslationTable) {
        let contents = docSchema.nodeFromJSON(this.aDocument.contents).toDOM()
        jQuery(contents).find('img').each(function() {
            let translationEntry = _.findWhere(ImageTranslationTable, {
                oldUrl: jQuery(this).attr('src')
            })
            if (translationEntry) {
                jQuery(this).attr('src', translationEntry.newUrl)
            }
        })
        jQuery(contents).find('figure').each(function() {
            let translationEntry = _.findWhere(ImageTranslationTable, {
                oldId: parseInt(jQuery(this).attr('data-image'))
            })
            if (translationEntry) {
                jQuery(this).attr('data-image', translationEntry.newId)
            }
        })
        jQuery(contents).find('.citation').each(function() {
            let citekeys = jQuery(this).attr('data-bib-entry').split(',')
            for (let i = 0; i < citekeys.length; i++) {
                if (citekeys[i] in BibTranslationTable) {
                    citekeys[i] = BibTranslationTable[citekeys[i]]
                }
            }
            jQuery(this).attr('data-bib-entry', citekeys.join(','))
        })
        this.aDocument.contents = docSchema.parseDOM(contents).firstChild.toJSON()
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
                that.aDocument.id = data['document_id'];
                that.aDocument.version = 0;
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

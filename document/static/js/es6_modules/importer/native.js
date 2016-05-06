import {obj2Node,node2Obj} from "../exporter/json"

export class ImportNative {
    /* Save document information into the database */

    constructor(aDocument, aBibDB, anImageDB, entries, user, bibDB, imageDB, callback) {
        this.aDocument = aDocument
        this.aBibDB = aBibDB // These are new values
        this.anImageDB = anImageDB // These are new values
        this.entries = entries
        this.user = user
        this.bibDB = bibDB // These are values stored in the database
        this.imageDB = imageDB // These are values stored in the database
        this.callback = callback
        this.newBibEntries = []
        this.importNative()
    }

    importNative() {
        let that = this
        let BibTranslationTable = {},
            newBibEntries = [],
            shrunkImageDBObject = {},
            ImageTranslationTable = [],
            newImageEntries = [],
            simplifiedShrunkImageDB = []

        // Add the id to each object in the this.bibDB to be able to look it up when comparing to this.aBibDB below
        for (let key in this.bibDB) {
            this.bibDB[key]['id'] = key
        }
        for (let key in this.aBibDB) {
            //this.aBibDB[key]['entry_type']=_.findWhere(BibEntryTypes,{name:this.aBibDB[key]['bibtype']}).id
            //delete this.aBibDB[key].bibtype
            let matchEntries = _.where(this.bibDB, this.aBibDB[key])

            if (0 === matchEntries.length) {
                //create new
                newBibEntries.push({
                    oldId: key,
                    oldEntryKey: this.aBibDB[key].entry_key,
                    entry: this.aBibDB[key]
                })
            } else if (1 === matchEntries.length && parseInt(key) !==
                matchEntries[0].id) {
                BibTranslationTable[parseInt(key)] = matchEntries[0].id
            } else if (1 < matchEntries.length) {
                if (!(_.findWhere(matchEntries, {
                        id: parseInt(key)
                    }))) {
                    // There are several matches, and none of the matches have the same id as the key in this.aBibDB.
                    // We now pick the first match.
                    // TODO: Figure out if this behavior is correct.
                    BibTranslationTable[parseInt(key)] = matchEntries[0].id
                }
            }
        }

        // Remove the id values again
        for (let key in this.bibDB) {
            delete this.bibDB[key].id
        }

        // We need to remove the pk from the entry in the this.anImageDB so that
        // we also get matches with this.entries with other pk values.
        // We therefore convert to an associative array/object.
        for (let key in this.anImageDB) {
            simplifiedShrunkImageDB.push(_.omit(this.anImageDB[key], 'image',
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
                let sIDBEntry = _.findWhere(this.anImageDB, {
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
                    oldUrl: _.findWhere(this.anImageDB, {
                        pk: parseInt(key)
                    }).image,
                    newUrl: matchEntries[0].image
                })
            } else if (1 < matchEntries.length) {
                if (!(_.findWhere(matchEntries, {
                        pk: parseInt(key)
                    }))) {
                    // There are several matches, and none of the matches have
                    // the same id as the key in this.anImageDB.
                    // We now pick the first match.
                    // TODO: Figure out if this behavior is correct.
                    ImageTranslationTable.push({
                        oldId: key,
                        newId: matchEntries[0].pk,
                        oldUrl: _.findWhere(this.anImageDB, {
                            pk: parseInt(key)
                        }).image,
                        newUrl: matchEntries[0].image
                    })
                }
            }
        }

        if (newBibEntries.length !== 0 || newImageEntries.length !== 0) {
            // We need to create new entries in the DB for images and/or
            // bibliography items.
            this.getImageData(BibTranslationTable, ImageTranslationTable, newBibEntries,
                newImageEntries, this.entries)
        } else if (!(jQuery.isEmptyObject(BibTranslationTable)) || !(jQuery.isEmptyObject(
                ImageTranslationTable))) {
            // We need to change some reference numbers in the document contents
            translateReferenceIds(BibTranslationTable,
                ImageTranslationTable)
        } else {
            // We are good to go. All the used images and bibliography entries
            // exist in the DB for this user with the same numbers.
            // We can go ahead and create the new document entry in the
            // bibliography without any changes.
            this.createNewDocument()
        }

    }

    getImageData(BibTranslationTable, ImageTranslationTable, newBibEntries,
        newImageEntries, entries) {
        let that = this,
            counter = 0

        function getImageZipEntry() {
            if (counter < newImageEntries.length) {
                _.findWhere(entries, {
                    filename: newImageEntries[counter].oldUrl.split('/').pop()
                }).getData(
                    new zip.BlobWriter(newImageEntries[counter].file_type),
                    function(
                        file) {
                        newImageEntries[counter]['file'] = file
                        counter++
                        getImageZipEntry()
                    })
            } else {
                that.sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries,
                    newImageEntries)
            }
        }

        function getImageUrlEntry() {
            if (counter < newImageEntries.length) {
                let getUrl = _.findWhere(entries, {
                    filename: newImageEntries[counter].oldUrl.split('/').pop()
                }).url
                let xhr = new XMLHttpRequest()
                xhr.open('GET', getUrl, true)
                xhr.responseType = 'blob'

                xhr.onload = function(e) {
                    if (this.status == 200) {
                        // Note: .response instead of .responseText
                        newImageEntries[counter]['file'] = new Blob([this.response], {
                            type: newImageEntries[counter].file_type
                        })
                        counter++
                        getImageUrlEntry()
                    }
                }

                xhr.send()

            } else {
                that.sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries,
                    newImageEntries)
            }
        }
        if (entries.length > 0) {
            if (entries[0].hasOwnProperty('url')) {
                getImageUrlEntry()
            } else {
                getImageZipEntry()
            }
        }

    }

    translateReferenceIds(BibTranslationTable,
        ImageTranslationTable) {
        let contents = obj2Node(this.aDocument.contents)
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

        this.aDocument.contents = node2Obj(contents)

        this.createNewDocument()
    }

    sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries,
        newImageEntries) {
        let that = this,
            counter = 0

        function sendImage() {
            if (counter < newImageEntries.length) {
                let formValues = new FormData()
                formValues.append('id', 0)
                formValues.append('title', newImageEntries[counter].title)
                formValues.append('imageCats', '')
                formValues.append('image', newImageEntries[counter].file,
                    newImageEntries[counter].oldUrl.split('/').pop())
                formValues.append('checksum', newImageEntries[counter].checksum),

                    jQuery.ajax({
                        url: '/usermedia/save/',
                        data: formValues,
                        type: 'POST',
                        dataType: 'json',
                        success: function(response, textStatus, jqXHR) {
                            that.imageDB[response.values.pk] = response.values
                            let imageTranslation = {}
                            imageTranslation.oldUrl = newImageEntries[counter].oldUrl
                            imageTranslation.oldId = newImageEntries[counter].oldId
                            imageTranslation.newUrl = response.values.image
                            imageTranslation.newId = response.values.pk
                            ImageTranslationTable.push(imageTranslation)
                            counter++
                            sendImage()
                        },
                        error: function() {
                            jQuery.addAlert('error', gettext('Could not save ') +
                                newImageEntries[counter].title)
                        },
                        complete: function() {},
                        cache: false,
                        contentType: false,
                        processData: false
                    })
            } else {
                sendBibItems()
            }
        }

        function sendBibItems() {

            if (newBibEntries.length > 0) {
                let bibEntries = _.pluck(newBibEntries, 'entry'),
                    bibDict = {}

                for (let i = 0; i < bibEntries.length; i++) {
                    bibEntries[i]['bibtype'] = BibEntryTypes[bibEntries[i]['entry_type']].name
                    bibDict[bibEntries[i]['entry_key']] = bibEntries[i]
                    delete bibDict[bibEntries[i]['entry_key']].entry_type

                    delete bibDict[bibEntries[i]['entry_key']].entry_cat
                    delete bibDict[bibEntries[i]['entry_key']].entry_key
                }
                jQuery.ajax({
                    url: '/bibliography/import_bibtex/',
                    data: {
                        bibs: JSON.stringify(bibDict)
                    },
                    type: 'POST',
                    dataType: 'json',
                    success: function(response, textStatus, jqXHR) {
                        let errors = response.errors,
                            warnings = response.warning,
                            len = errors.length

                        for (let i = 0; i < len; i++) {
                            $.addAlert('error', errors[i])
                        }
                        len = warnings.length
                        for (let i = 0; i < len; i++) {
                            $.addAlert('warning', warnings[i])
                        }
                        _.each(response.key_translations, function(newKey, oldKey) {
                            let newID = _.findWhere(response.bibs, {
                                    entry_key: newKey
                                }).id,
                                oldID = _.findWhere(newBibEntries, {
                                    oldEntryKey: oldKey
                                }).oldId
                            BibTranslationTable[oldID] = newID
                        })
                        that.newBibEntries = response.bibs
                        that.translateReferenceIds(BibTranslationTable, ImageTranslationTable)
                    },
                    error: function() {
                        console.log(jqXHR.responseText)
                    },
                    complete: function() {}
                })
            } else {
                that.translateReferenceIds(BibTranslationTable,
                    ImageTranslationTable)
            }
        }

        sendImage()
    }

    createNewDocument() {
        let that = this
        let postData = {
            title: this.aDocument.title,
            contents: JSON.stringify(this.aDocument.contents),
            settings: JSON.stringify(this.aDocument.settings),
            metadata: JSON.stringify(this.aDocument.metadata)
        }
        jQuery.ajax({
            url: '/document/import/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function(data, textStatus, jqXHR) {
                let aDocumentValues = {
                    last_diffs: [],
                    is_owner: true,
                    rights: 'w',
                    changed: false,
                    titleChanged: false
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
                return that.callback(true, {
                    aDocument: that.aDocument,
                    aDocumentValues,
                    newBibEntries: that.newBibEntries
                })
            },
            error: function() {
                that.callback(false, gettext('Could not save ') + that.aDocument.title)
            }
        })
    }
}

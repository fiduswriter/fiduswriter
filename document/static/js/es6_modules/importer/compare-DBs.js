import {getImageData} from "./process-file"
import {createNewDocument} from "./save"
import {obj2Node,node2Obj} from "../exporter/json"

export let translateReferenceIds = function (aDocument, BibTranslationTable,
    ImageTranslationTable) {
    let contents = obj2Node(aDocument.contents)
    jQuery(contents).find('img').each(function () {
        let translationEntry = _.findWhere(ImageTranslationTable, {
                oldUrl: jQuery(this).attr('src')
            })
        if (translationEntry) {
            jQuery(this).attr('src', translationEntry.newUrl)
        }
    })
    jQuery(contents).find('figure').each(function () {
        let translationEntry = _.findWhere(ImageTranslationTable, {
                oldId: parseInt(jQuery(this).attr('data-image'))
            })
        if (translationEntry) {
            jQuery(this).attr('data-image', translationEntry.newId)
        }
    })
    jQuery(contents).find('.citation').each(function () {
        let citekeys = jQuery(this).attr('data-bib-entry').split(',')
        for (let i = 0; i < citekeys.length; i++) {
            if (citekeys[i] in BibTranslationTable) {
                citekeys[i] = BibTranslationTable[citekeys[i]]
            }
        }
        jQuery(this).attr('data-bib-entry', citekeys.join(','))
    })

    aDocument.contents = node2Obj(contents)

    createNewDocument(aDocument)

}

export let importNative = function (aDocument, shrunkBibDB, shrunkImageDB,
    entries) {
    let BibTranslationTable = {}, newBibEntries = [],
        shrunkImageDBObject = {}, ImageTranslationTable = [],
        newImageEntries = [],
        simplifiedShrunkImageDB = []

    // Add the id to each object in the BibDB to be able to look it up when comparing to shrunkBibDB below
    for (let key in BibDB) {
        BibDB[key]['id'] = key
    }
    for (let key in shrunkBibDB) {
        //shrunkBibDB[key]['entry_type']=_.findWhere(BibEntryTypes,{name:shrunkBibDB[key]['bibtype']}).id
        //delete shrunkBibDB[key].bibtype
        let matchEntries = _.where(BibDB, shrunkBibDB[key])

        if (0 === matchEntries.length) {
            //create new
            newBibEntries.push({
                    oldId: key,
                    oldEntryKey: shrunkBibDB[key].entry_key,
                    entry: shrunkBibDB[key]
                })
        } else if (1 === matchEntries.length && parseInt(key) !==
            matchEntries[0].id) {
            BibTranslationTable[parseInt(key)] = matchEntries[0].id
        } else if (1 < matchEntries.length) {
            if (!(_.findWhere(matchEntries, {
                            id: parseInt(key)
                        }))) {
                // There are several matches, and none of the matches have the same id as the key in shrunkBibDB.
                // We now pick the first match.
                // TODO: Figure out if this behavior is correct.
                BibTranslationTable[parseInt(key)] = matchEntries[0].id
            }
        }
    }

    // Remove the id values again
    for (let key in BibDB) {
        delete BibDB[key].id
    }

    // We need to remove the pk from the entry in the shrunkImageDB so that we also get matches with entries with other pk values.
    // We therefore convert to an associative array/object.
    for (let key in shrunkImageDB) {
        simplifiedShrunkImageDB.push(_.omit(shrunkImageDB[key], 'image',
                'thumbnail', 'cats', 'added'))
    }

    for (let image in simplifiedShrunkImageDB) {
        shrunkImageDBObject[simplifiedShrunkImageDB[image].pk] =
            simplifiedShrunkImageDB[image]
        delete shrunkImageDBObject[simplifiedShrunkImageDB[image].pk].pk
    }

    for (let key in shrunkImageDBObject) {
        let matchEntries = _.where(ImageDB, shrunkImageDBObject[key])
        if (0 === matchEntries.length) {
            //create new
            let sIDBEntry = _.findWhere(shrunkImageDB, {
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
                    oldUrl: _.findWhere(shrunkImageDB, {
                            pk: parseInt(key)
                        }).image,
                    newUrl: matchEntries[0].image
                })
        } else if (1 < matchEntries.length) {
            if (!(_.findWhere(matchEntries, {
                            pk: parseInt(key)
                        }))) {
                // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
                // We now pick the first match.
                // TODO: Figure out if this behavior is correct.
                ImageTranslationTable.push({
                        oldId: key,
                        newId: matchEntries[0].pk,
                        oldUrl: _.findWhere(shrunkImageDB, {
                                pk: parseInt(key)
                            }).image,
                        newUrl: matchEntries[0].image
                    })
            }
        }
    }

    if (newBibEntries.length !== 0 || newImageEntries.length !== 0) {
        // We need to create new entries in the DB for images and/or bibliography items.
        getImageData(aDocument,
            BibTranslationTable, ImageTranslationTable, newBibEntries,
            newImageEntries, entries)
    } else if (!(jQuery.isEmptyObject(BibTranslationTable)) || !(jQuery.isEmptyObject(
                ImageTranslationTable))) {
        // We need to change some reference numbers in the document contents
        translateReferenceIds(aDocument, BibTranslationTable,
            ImageTranslationTable)
    } else {
        // We are good to go. All the used images and bibliography entries exist in the DB for this user with the same numbers.
        // We can go ahead and create the new document entry in the bibliography without any changes.
        createNewDocument(aDocument)
    }

}

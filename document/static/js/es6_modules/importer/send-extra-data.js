import {translateReferenceIds} from "./compare-DBs"

export let sendNewImageAndBibEntries = function (aDocument,
    BibTranslationTable, ImageTranslationTable, newBibEntries,
    newImageEntries) {
    let counter = 0

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
                    success: function (response, textStatus, jqXHR) {
                        ImageDB[response.values.pk] = response.values
                        let imageTranslation = {}
                        imageTranslation.oldUrl = newImageEntries[counter].oldUrl
                        imageTranslation.oldId = newImageEntries[counter].oldId
                        imageTranslation.newUrl = response.values.image
                        imageTranslation.newId = response.values.pk
                        ImageTranslationTable.push(imageTranslation)
                        counter++
                        sendImage()
                    },
                    error: function () {
                        jQuery.addAlert('error', gettext('Could not save ') +
                            newImageEntries[counter].title)
                    },
                    complete: function () {},
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
                    success: function (response, textStatus, jqXHR) {
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
                        _.each(response.key_translations, function(newKey,oldKey) {
                            let newID = _.findWhere(response.bibs, {entry_key: newKey}).id,
                            oldID = _.findWhere(newBibEntries, {oldEntryKey: oldKey}).oldId
                            BibTranslationTable[oldID] = newID
                        })
                        bibliographyHelpers.addBibList(response.bibs)
                        translateReferenceIds(aDocument,
                            BibTranslationTable, ImageTranslationTable)
                    },
                    error: function () {
                        console.log(jqXHR.responseText)
                    },
                    complete: function () {}
                })
        } else {
            translateReferenceIds(aDocument, BibTranslationTable,
                ImageTranslationTable)
        }
    }

    sendImage()
}

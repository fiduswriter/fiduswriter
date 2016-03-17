import {getDBs} from "./get-extra-data"
import {sendNewImageAndBibEntries} from "./send-extra-data"

/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
let FW_FILETYPE_VERSION = 1.2, MIN_FW_FILETYPE_VERSION = 1.1, MAX_FW_FILETYPE_VERSION = 1.2

export let processFidusFile = function (textFiles, entries) {

    let filetypeVersion = parseFloat(_.findWhere(textFiles, {
            filename: 'filetype-version'
          }).contents, 10),
        mimeType = _.findWhere(textFiles, {
                    filename: 'mimetype'
                }).contents
    if (mimeType === 'application/fidus+zip' && filetypeVersion >= MIN_FW_FILETYPE_VERSION && filetypeVersion <= MAX_FW_FILETYPE_VERSION) {
        // This seems to be a valid fidus file with current version number.
        let shrunkBibDB = JSON.parse(
            _.findWhere(
                textFiles, {
                    filename: 'bibliography.json'
                }).contents)
        let shrunkImageDB = JSON.parse(_.findWhere(textFiles, {
                    filename: 'images.json'
                }).contents)
        let aDocument = JSON.parse(_.findWhere(textFiles, {
                    filename: 'document.json'
                }).contents)

        getDBs(aDocument, shrunkBibDB, shrunkImageDB, entries)

    } else {
            // The file is not a Fidus Writer file.
            $.deactivateWait()
            $.addAlert('error', gettext('The uploaded file does not appear to be of the version used on this server: ')+FW_FILETYPE_VERSION)
            return
        }
}

export let getImageData = function (aDocument,
    BibTranslationTable, ImageTranslationTable, newBibEntries,
    newImageEntries, entries) {
    let counter = 0

    function getImageZipEntry() {
        if (counter < newImageEntries.length) {
            _.findWhere(entries, {
                    filename: newImageEntries[counter].oldUrl.split('/').pop()
                }).getData(
                new zip.BlobWriter(newImageEntries[counter].file_type), function (
                    file) {
                    newImageEntries[counter]['file'] = file
                    counter++
                    getImageZipEntry()
                })
        } else {
            sendNewImageAndBibEntries(aDocument,
                BibTranslationTable, ImageTranslationTable, newBibEntries,
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

            xhr.onload = function (e) {
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
            sendNewImageAndBibEntries(aDocument,
                BibTranslationTable, ImageTranslationTable, newBibEntries,
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

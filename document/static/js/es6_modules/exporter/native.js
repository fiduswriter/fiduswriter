import {obj2Node} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"

/** The current Fidus Writer filetype version.
 * The importer will not import from a different version and the exporter
  * will include this number in all exports.
 */
let FW_FILETYPE_VERSION = "1.2"

/** Create a Fidus Writer document and upload it to the server as a backup.
 * @function uploadNative
 * @param aDocument The document to turn into a Fidus Writer document and upload.
 */
export let uploadNative = function(editor) {
    exportNative(editor.doc, editor.imageDB.db, editor.bibDB.bibDB, function(doc, shrunkImageDB, shrunkBibDB, images) {
        exportNativeFile(editor.doc, shrunkImageDB, shrunkBibDB, images, true, editor)
    })
}

export class NativeExporter {
    constructor(doc, bibDB, imageDB) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.init()
    }

    init() {
        let that = this
        this.getBibDB(function(){
            that.getImageDB(function(){
                exportNative(that.doc, that.imageDB, that.bibDB, exportNativeFile)
            })
        })
    }

    getBibDB(callback) {
        let that = this
        if (!this.bibDB) {
            let bibGetter = new BibliographyDB(this.doc.owner.id, false, false, false)
            bibGetter.getBibDB(function(bibDB, bibCats) {
                that.bibDB = bibDB
                callback()
            })
        } else {
            callback()
        }
    }

    getImageDB(callback) {
        let that = this
        if (!this.imageDB) {
            let imageGetter = new ImageDB(this.doc.owner.id)
            imageGetter.getDB(function(){
                that.imageDB = imageGetter.db
                callback()
            })
        } else {
            callback()
        }
    }
}

// used in copy
export let exportNative = function(aDocument, anImageDB, aBibDB, callback) {
    let shrunkBibDB = {},
        citeList = []

    $.addAlert('info', gettext('File export has been initiated.'))

    let contents = obj2Node(aDocument.contents)

    let images = findImages(contents)

    let imageUrls = _.pluck(images, 'url')


    let shrunkImageDB = _.filter(anImageDB, function(anImage) {
        return (imageUrls.indexOf(anImage.image.split('?').shift()) !== -1)
    })

    jQuery(contents).find('.citation').each(function() {
        citeList.push(jQuery(this).attr('data-bib-entry'))
    })

    citeList = _.uniq(citeList.join(',').split(','))

    // If the number of cited items is 1 and that one item is an empty string,
    // there are no cited items at all.
    if (citeList.length === 1 && citeList[0] === '') {
        citeList = []
    }

    for (let i in citeList) {
        shrunkBibDB[citeList[i]] = aBibDB[citeList[i]]
    }

    callback(aDocument, shrunkImageDB, shrunkBibDB, images)

}

let exportNativeFile = function(aDocument, shrunkImageDB,
    shrunkBibDB, images, upload = false, editor) {

    let httpOutputList = images

    let outputList = [{
        filename: 'document.json',
        contents: JSON.stringify(aDocument),
    }, {
        filename: 'images.json',
        contents: JSON.stringify(shrunkImageDB)
    }, {
        filename: 'bibliography.json',
        contents: JSON.stringify(shrunkBibDB)
    }, {
        filename: 'filetype-version',
        contents: FW_FILETYPE_VERSION
    }]

    zipFileCreator(outputList, httpOutputList, createSlug(
            aDocument.title) +
        '.fidus', 'application/fidus+zip', false, upload, editor)
}

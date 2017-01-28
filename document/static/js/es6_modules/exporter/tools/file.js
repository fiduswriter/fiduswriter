import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import download from "downloadjs"

export let createSlug = function(str) {
    if (str==='') {
        str = gettext('Untitled')
    }
    str = str.replace(/[^a-zA-Z0-9\s]/g, "")
    str = str.toLowerCase()
    str = str.replace(/\s/g, '-')
    return str
}

/** Offers a file to the user as if it were downloaded.
 * @function downloadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
export let downloadFile = function(zipFilename, blob) {
    let blobURL = window.URL.createObjectURL(blob)
    let fakeDownloadLink = document.createElement('a')
    let clickEvent = document.createEvent("MouseEvent")
    clickEvent.initMouseEvent("click", true, true, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null)
    fakeDownloadLink.href = blobURL
    fakeDownloadLink.setAttribute('download', zipFilename)
    fakeDownloadLink.dispatchEvent(clickEvent)
}


export let getDatabasesIfNeeded = function(object, doc) {
    let p = []

    if (!object.bibDB) {
        p.push(
            new Promise((resolve) => {
                object.bibDB = new BibliographyDB(doc.owner.id)
                object.bibDB.getDB().then(resolve)
            })
        )
    }
    if (!object.imageDB) {
        p.push(
            new Promise((resolve) => {
                object.imageDB = new ImageDB(doc.owner.id)
                object.imageDB.getDB().then(resolve)
            })
        )
    }
    return new Promise(function(resolve){
        Promise.all(p).then(() => resolve())
    })
}

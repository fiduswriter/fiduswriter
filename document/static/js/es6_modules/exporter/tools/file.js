import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"

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
            new window.Promise((resolve) => {
                object.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
                object.bibDB.getDB(resolve)
            })
        )
    }
    if (!object.imageDB) {
        p.push(
            new window.Promise((resolve) => {
                object.imageDB = new ImageDB(doc.owner.id)
                object.imageDB.getDB(resolve)
            })
        )
    }
    return new window.Promise(function(resolve){
        window.Promise.all(p).then(function(){
            resolve()
        })
    })
}

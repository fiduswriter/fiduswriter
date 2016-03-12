/** Offers a file to the user as if it were downloaded.
 * @function downloadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
export let downloadFile = function(zipFilename, blob) {
    let blobURL = URL.createObjectURL(blob)
    let fakeDownloadLink = document.createElement('a')
    let clickEvent = document.createEvent("MouseEvent")
    clickEvent.initMouseEvent("click", true, true, window,
        0, 0, 0, 0, 0, false, false, false, false, 0, null)
    fakeDownloadLink.href = blobURL
    fakeDownloadLink.setAttribute('download', zipFilename)
    fakeDownloadLink.dispatchEvent(clickEvent)
}

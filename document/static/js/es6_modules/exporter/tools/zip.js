import {downloadFile} from "./file"
import {uploadFile} from "./upload"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {string} zipFileName The name of the zip file to be created
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
 * @param {object} editor An editor instance (only for upload=true).
 */

export let zipFileCreator = function(textFiles, httpFiles, zipFileName,
    mimeType, includeZips, upload, editor) {
    let zipFs = new JSZip(),
        zipDir

    if (mimeType) {
        zipFs.file('mimetype', mimeType, {compression: 'STORE'})
    } else {
        mimeType = 'application/zip'
    }


    let createZip = function() {
        for (let i = 0; i < textFiles.length; i++) {
            zipFs.file(textFiles[i].filename, textFiles[i].contents, {compression: 'DEFLATE'})
        }
        let p = []
        for (let i = 0; i < httpFiles.length; i++) {
            p.push(new Promise(
                resolve => {
                    JSZipUtils.getBinaryContent(httpFiles[i].url, (err, contents) => {
                        zipFs.file(httpFiles[i].filename, contents, {binary: true, compression: 'DEFLATE'})
                        resolve()
                    })
                }
            ))

        }
        Promise.all(p).then(
            () => zipFs.generateAsync({type:"blob"})
        ).then(
            blob => {
                if (upload) {
                    uploadFile(zipFileName, blob, editor)
                } else {
                    downloadFile(zipFileName, blob)
                }
            }
        )
    }

    if (includeZips) {
        let i = 0
        let includeZipLoop = () => {
            if (i === includeZips.length) {
                createZip()
            } else {
                if (includeZips[i].directory === '') {
                    zipDir = zipFs
                } else {
                    zipDir = zipFs.folder(includeZips[i].directory)
                }
                JSZipUtils.getBinaryContent(includeZips[i].url, (err, contents) => {
                    zipDir.loadAsync(contents).then(importedZip => {
                        i++
                        includeZipLoop()
                    })
                })
            }

        }
        includeZipLoop()
    } else {
        createZip()
    }
}

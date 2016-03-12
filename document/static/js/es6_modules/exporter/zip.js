import {downloadFile} from "./download"
import {uploadFile} from "./upload"

/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {string} zipFileName The name of the zip file to be created
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
 */

export let zipFileCreator = function(textFiles, httpFiles, zipFileName,
    mimeType,
    includeZips, upload) {
    let zipFs = new zip.fs.FS(),
        zipDir

    if (mimeType) {
        zipFs.root.addText('mimetype', mimeType)
    } else {
        mimeType = 'application/zip'
    }


    let createZip = function() {
        for (let i = 0; i < textFiles.length; i++) {

            zipFs.root.addText(textFiles[i].filename, textFiles[i].contents)

        }

        for (let i = 0; i < httpFiles.length; i++) {

            zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[
                i].url)

        }


        zip.createWriter(new zip.BlobWriter(mimeType), function(
            writer) {


            let currentIndex = 0

            function process(zipWriter, entry, onend, onprogress,
                totalSize) {
                let childIndex = 0

                function exportChild() {
                    let child = entry.children[childIndex],
                        level = 9, reader = null

                    if (child) {
                        if (child.getFullname() === 'mimetype') {
                            level = 0 // turn compression off for mimetype file
                        }
                        if (child.hasOwnProperty('Reader')) {
                            reader = new child.Reader(child.data)
                        }

                        zipWriter.add(child.getFullname(), reader,
                            function() {
                                currentIndex += child.uncompressedSize || 0
                                process(zipWriter, child, function() {
                                    childIndex++
                                    exportChild()
                                }, onprogress, totalSize)
                            },
                            function(index) {
                                if (onprogress)
                                    onprogress(currentIndex + index,
                                        totalSize)
                            }, {
                                directory: child.directory,
                                version: child.zipVersion,
                                level: level
                            })
                    } else {
                        onend()
                    }
                }

                exportChild()
            }




            process(writer, zipFs.root, function() {
                writer.close(function(blob) {
                    if (upload) {
                        uploadFile(zipFileName, blob)
                    } else {
                        downloadFile(zipFileName, blob)
                    }
                })
            })


        })
    }

    if (includeZips) {
        let i = 0
        let includeZipLoop = function() {
            // for (i = 0; i < includeZips.length; i++) {
            if (i === includeZips.length) {
                createZip()
            } else {
                if (includeZips[i].directory === '') {
                    zipDir = zipFs.root
                } else {
                    zipDir = zipFs.root.addDirectory(includeZips[i].directory)
                }
                zipDir.importHttpContent(includeZips[i].url, false,
                    function() {
                        i++
                        includeZipLoop()
                    })
            }

        }
        includeZipLoop()
    } else {
        createZip()
    }
}

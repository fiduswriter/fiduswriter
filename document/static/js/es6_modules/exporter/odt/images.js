import JSZipUtils from "jszip-utils"
import {descendantNodes} from "../tools/doc-contents"

export class OdtExporterImages {
    constructor(exporter, imageDB, docContents) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.docContents = docContents
        this.imgIdTranslation = {}
        this.manifestXml = false
    }

    init() {
        let that = this
        return this.exporter.xml.getXml("META-INF/manifest.xml").then(function(manifestXml){
            that.manifestXml = manifestXml
            return that.exportImages()
        })
    }

    // add an image to the list of files
    addImage(imgFileName, image) {
        imgFileName = this.addFileToManifest(imgFileName)
        this.exporter.xml.addExtraFile(`Pictures/${imgFileName}`, image)
        return imgFileName
    }

    // add a an image file to the manifest
    addFileToManifest(imgFileName) {
        let fileNameParts = imgFileName.split('.')
        let fileNameEnding = fileNameParts.pop()
        let fileNameStart = fileNameParts.join('.')
        let manifestEl = this.manifestXml.querySelector('manifest')
        let imgManifest = manifestEl.querySelector(`file-entry[*|full-path="Pictures/${imgFileName}"]`)
        let counter = 0
        while(imgManifest) {
            // Name exists already, we change the name until we get a file name not yet included in manifest.
            imgFileName = `${fileNameStart}_${counter++}.${fileNameEnding}`
            imgManifest = manifestEl.querySelector(`file-entry[*|full-path="Pictures/${imgFileName}"]`)
        }
        let string = `  <manifest:file-entry manifest:full-path="Pictures/${imgFileName}" manifest:media-type="image/${fileNameEnding}"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', string)
        return imgFileName
    }

    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types odt doesn't support such as
    // SVG. Try out and fix.
    exportImages() {
        let that = this, usedImgs = []

        descendantNodes(this.docContents).forEach(
            function(node) {
                if (node.type==='figure' && node.attrs.image !== false) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )

        return new Promise((resolveExportImages) => {
            let p = []

            usedImgs.forEach((image) => {
                let imgDBEntry = that.imageDB.db[image]
                p.push(
                    new Promise((resolve) => {
                        JSZipUtils.getBinaryContent(
                            imgDBEntry.image,
                            function(err, imageFile) {
                                let wImgId = that.addImage(
                                    imgDBEntry.image.split('/').pop(),
                                    imageFile
                                )
                                that.imgIdTranslation[image] = wImgId
                                resolve()
                            }
                        )
                    })
                )
            })

            Promise.all(p).then(function(){
                resolveExportImages()
            })
        })
    }

}

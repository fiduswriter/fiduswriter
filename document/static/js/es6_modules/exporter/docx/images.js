import JSZipUtils from "jszip-utils"
import {descendantNodes} from "../tools/doc-contents"

export class DocxExporterImages {
    constructor(exporter, imageDB, rels, docContents) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.rels = rels
        this.docContents = docContents
        this.imgIdTranslation = {}
        this.ctXml = false
    }

    init() {
        let that = this
        return this.exporter.xml.getXml("[Content_Types].xml").then(function(ctXml){
            that.ctXml = ctXml
            return that.exportImages()
        })
    }

    // add an image to the list of files
    addImage(imgFileName, image) {
        let rId = this.rels.addImageRel(imgFileName)
        this.addContentType(imgFileName.split('.').pop())
        this.exporter.xml.addExtraFile(`word/media/${imgFileName}`, image)
        return rId
    }

    // add a global contenttype declaration for an image type (if needed)
    addContentType(fileEnding) {
        let types = this.ctXml.querySelector('Types')
        let contentDec = types.querySelector('Default[Extension='+fileEnding+']')
        if (!contentDec) {
            let string = `<Default ContentType="image/${fileEnding}" Extension="${fileEnding}"/>`
            types.insertAdjacentHTML('beforeEnd', string)
        }
    }

    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types docx doesn't support such as SVG. Try out and fix.
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

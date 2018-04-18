import JSZipUtils from "jszip-utils"

import {descendantNodes} from "../tools/doc_contents"

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
        return this.exporter.xml.getXml("[Content_Types].xml").then(
            ctXml => {
                this.ctXml = ctXml
                return this.exportImages()
            }
        )
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
    // TODO: This will likely fail on image types docx doesn't support such as SVG.
    // Try out and fix.
    exportImages() {
        let usedImgs = []
        descendantNodes(this.docContents).forEach(
            node => {
                if (node.type==='figure' && node.attrs.image !== false) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )
        return new Promise(resolveExportImages => {
            let p = []
            usedImgs.forEach((image) => {
                let imgDBEntry = this.imageDB.db[image]
                p.push(
                    new Promise(resolve => {
                        JSZipUtils.getBinaryContent(
                            imgDBEntry.image,
                            (err, imageFile) => {
                                let wImgId = this.addImage(
                                    imgDBEntry.image.split('/').pop(),
                                    imageFile
                                )
                                this.imgIdTranslation[image] = wImgId
                                resolve()
                            }
                        )
                    })
                )
            })

            Promise.all(p).then(() => {
                resolveExportImages()
            })
        })
    }

}

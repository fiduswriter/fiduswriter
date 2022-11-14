import {get} from "../../common"
import {descendantNodes} from "../tools/doc_content"
import {svg2png} from "../tools/svg"

export class DocxExporterImages {
    constructor(exporter, imageDB, rels, docContent) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.rels = rels
        this.docContent = docContent
        this.images = {}
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
        const rId = this.rels.addImageRel(imgFileName)
        this.addContentType(imgFileName.split(".").pop())
        this.exporter.xml.addExtraFile(`word/media/${imgFileName}`, image)
        return rId
    }

    // add a global contenttype declaration for an image type (if needed)
    addContentType(fileEnding) {
        const types = this.ctXml.querySelector("Types")
        const contentDec = types.querySelector("Default[Extension=" + fileEnding + "]")
        if (!contentDec) {
            const string = `<Default ContentType="image/${fileEnding}" Extension="${fileEnding}"/>`
            types.insertAdjacentHTML("beforeEnd", string)
        }
    }

    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types docx doesn't support such as SVG.
    // Try out and fix.
    exportImages() {
        const usedImgs = []
        descendantNodes(this.docContent).forEach(
            node => {
                if (node.type === "image" && node.attrs.image !== false) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )
        return new Promise(resolveExportImages => {
            const p = []
            usedImgs.forEach((image) => {
                const imgDBEntry = this.imageDB.db[image]
                p.push(
                    get(imgDBEntry.image).then(
                        response => response.blob()
                    ).then(
                        blob => {
                            if (blob.type === "image/svg+xml") {
                                // DOCX doesn't support SVG. Convert to PNG.
                                return svg2png(blob).then(({blob: pngBlob, width, height}) => {
                                    const wImgId = this.addImage(
                                        imgDBEntry.image.split("/").pop().replace(/.svg$/g, ".png"),
                                        pngBlob
                                    )
                                    this.images[image] = {
                                        id: wImgId,
                                        width,
                                        height,
                                        title: imgDBEntry.title
                                    }
                                })
                            } else {
                                const wImgId = this.addImage(
                                    imgDBEntry.image.split("/").pop(),
                                    blob
                                )
                                this.images[image] = {
                                    id: wImgId,
                                    width: imgDBEntry.width,
                                    height: imgDBEntry.height,
                                    title: imgDBEntry.title
                                }
                            }
                        }
                    )
                )
            })

            Promise.all(p).then(() => {
                resolveExportImages()
            })
        })
    }

}

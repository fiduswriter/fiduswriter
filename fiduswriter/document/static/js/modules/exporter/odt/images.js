import {get} from "../../common"
import {descendantNodes} from "../tools/doc_content"

export class OdtExporterImages {
    constructor(exporter, imageDB, docContent) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.docContent = docContent
        this.imgIdTranslation = {}
        this.manifestXml = false
    }

    init() {
        return this.exporter.xml.getXml("META-INF/manifest.xml").then(
            manifestXml => {
                this.manifestXml = manifestXml
                return this.exportImages()
            }
        )
    }

    // add an image to the list of files
    addImage(imgFileName, image) {
        imgFileName = this.addFileToManifest(imgFileName)
        this.exporter.xml.addExtraFile(`Pictures/${imgFileName}`, image)
        return imgFileName
    }

    // add a an image file to the manifest
    addFileToManifest(imgFileName) {
        const fileNameParts = imgFileName.split('.')
        const fileNameEnding = fileNameParts.pop()
        const fileNameStart = fileNameParts.join('.')
        const manifestEl = this.manifestXml.querySelector('manifest')
        let imgManifest = manifestEl.querySelector(`file-entry[*|full-path="Pictures/${imgFileName}"]`)
        let counter = 0
        while (imgManifest) {
            // Name exists already, we change the name until we get a file name not yet included in manifest.
            imgFileName = `${fileNameStart}_${counter++}.${fileNameEnding}`
            imgManifest = manifestEl.querySelector(`file-entry[*|full-path="Pictures/${imgFileName}"]`)
        }
        const string = `  <manifest:file-entry manifest:full-path="Pictures/${imgFileName}" manifest:media-type="image/${fileNameEnding}"/>`
        manifestEl.insertAdjacentHTML('beforeEnd', string)
        return imgFileName
    }

    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types odt doesn't support such as
    // SVG. Try out and fix.
    exportImages() {
        const usedImgs = []

        descendantNodes(this.docContent).forEach(
            node => {
                if (node.type === 'image' && node.attrs.image !== false) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )

        return new Promise((resolveExportImages) => {
            const p = []

            usedImgs.forEach(image => {
                const imgDBEntry = this.imageDB.db[image]
                p.push(
                    get(imgDBEntry.image).then(
                        response => response.blob()
                    ).then(
                        blob => {
                            const wImgId = this.addImage(
                                imgDBEntry.image.split('/').pop(),
                                blob
                            )
                            this.imgIdTranslation[image] = wImgId
                        }
                    )
                )
            })

            Promise.all(p).then(
                () => resolveExportImages()
            )
        })
    }

}

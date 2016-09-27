import JSZipUtils from "jszip-utils"

export class WordExporterImages {
    constructor(exporter, imageDB, rels, pmDoc) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.rels = rels
        this.pmDoc = pmDoc
        this.imgIdTranslation = {}
        this.ctXml = false
    }

    init() {
        let that = this
        return this.exporter.xml.fromZip("[Content_Types].xml").then(function(){
            that.ctXml = that.exporter.xml.docs['[Content_Types].xml']
            return that.exportImages()
        })
    }

    // add an image to the ist of files
    addImage(imgFileName, image) {
        let rId = this.rels.addImageRel(imgFileName)
        this.addContentType(imgFileName.split('.').pop())
        this.exporter.extraFiles[`word/media/${imgFileName}`] = image
        return rId
    }

    // add a global contenttype declaration for an image type (if needed)
    addContentType(fileEnding) {
        let types = this.ctXml.querySelector('Types')
        let contentDec = types.querySelector('Default[Extension='+fileEnding+']')
        if (!contentDec) {
            let string = `<Default ContentType="image/${fileEnding}" Extension="${fileEnding}"/>`
            types.insertAdjacentHTML('beforeend', string)
        }
    }

    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types docx doesn't support such as SVG. Try out and fix.
    exportImages() {
        let that = this, usedImgs = []

        this.pmDoc.descendants(
            function(node) {
                if (node.type.name==='figure' && node.attrs.image) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )
        return new window.Promise((resolveExportImages) => {
            let p = []

            usedImgs.forEach((image) => {
                let imgDBEntry = that.imageDB.db[image]
                p.push(
                    new window.Promise((resolve) => {
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

            window.Promise.all(p).then(function(){
                resolveExportImages()
            })
        })
    }

}

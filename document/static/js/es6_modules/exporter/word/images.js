import JSZipUtils from "jszip-utils"

export class WordExporterImages {
    constructor(exporter, imageDB) {
        this.exporter = exporter
        this.imageDB = imageDB
        this.imgIdTranslation = {}
    }

    // add an image to the ist of files
    addImage(imgFileName, image, relFilePath) {
        let rId = this.addImageRel(imgFileName, relFilePath)
        this.addContentType(imgFileName.split('.').pop())
        this.exporter.extraFiles[`word/media/${imgFileName}`] = image
        return rId
    }

    // add a global contenttype declaration for an image type (if needed)
    addContentType(fileEnding) {
        let xml = this.exporter.xml.docs['[Content_Types].xml']
        let types = xml.querySelector('Types')
        let contentDec = types.querySelector('Default[Extension='+fileEnding+']')
        if (!contentDec) {
            let string = `<Default ContentType="image/${fileEnding}" Extension="${fileEnding}"/>`
            types.insertAdjacentHTML('beforeend', string)
        }
    }

    // add a relationship for an image
    addImageRel(imgFileName, xmlFilePath) {
        let xml = this.exporter.xml.docs[xmlFilePath]
        let rels = xml.querySelector('Relationships')
        let rId = this.exporter.maxRelId[xmlFilePath] + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.exporter.maxRelId[xmlFilePath] = rId
        return rId
    }


    // Find all images used in file and add these to the export zip.
    // TODO: This will likely fail on image types docx doesn't support such as SVG. Try out and fix.
    exportImages(callback) {
        let that = this, usedImgs = []

        this.exporter.pmDoc.descendants(
            function(node) {
                if (node.type.name==='figure' && node.attrs.image) {
                    if (!(node.attrs.image in usedImgs)) {
                        usedImgs.push(node.attrs.image)
                    }
                }
            }
        )

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
                                imageFile,
                                'word/_rels/document.xml.rels'
                            )
                            that.imgIdTranslation[image] = wImgId
                            resolve()
                        }
                    )
                })
            )
        })

        window.Promise.all(p).then(function(){
            callback()
        })
    }

}

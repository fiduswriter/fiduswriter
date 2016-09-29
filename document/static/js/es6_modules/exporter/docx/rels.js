// manages the .rels files. Need to initialize one for each of document.xml and footnotes.xml


const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

export class DocxExporterRels {
    constructor(exporter, docName) {
        this.exporter = exporter
        this.docName = docName
        this.xml = false
        this.ctXml = false
        this.maxRelId = 0
        this.filePath = `word/_rels/${this.docName}.xml.rels`
        this.ctFilePath = "[Content_Types].xml"
    }

    init() {
        let that = this
        return this.initCt().then(function(){
            return that.exporter.xml.fromZip(that.filePath, DEFAULT_XML)}).then(function(){
            that.xml = that.exporter.xml.docs[that.filePath]
            that.findMaxRelId()
        })
    }

    initCt() {
        let that = this
        return this.exporter.xml.fromZip(this.ctFilePath).then(function() {
            that.ctXml = that.exporter.xml.docs[that.ctFilePath]
            that.addRelsToCt()
            return window.Promise.resolve()
        })
    }

    // Go through a rels xml file and file all the listed relations
    findMaxRelId() {
        let rels = [].slice.call(this.xml.querySelectorAll('Relationship')),
        that = this

        rels.forEach(function(rel){
            let id = parseInt(rel.getAttribute("Id").replace(/\D/g,''))
            if (id > that.maxRelId) {
                that.maxRelId = id
            }
        })
    }

    addRelsToCt() {
        let override = this.ctXml.querySelector(`Override[PartName="/${this.filePath}"]`)
        if (!override) {
            let types = this.ctXml.querySelector('Types')
            types.insertAdjacentHTML('beforeend', `<Override PartName="/${this.filePath}" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`)
        }
    }
    // Add a relationship for a link
    addLinkRel(link) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${link}" TargetMode="External"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.maxRelId = rId
        return rId
    }

    // add a relationship for an image
    addImageRel(imgFileName) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.maxRelId = rId
        return rId
    }

    addFootnoteRel() {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.maxRelId = rId
        return rId
    }


}

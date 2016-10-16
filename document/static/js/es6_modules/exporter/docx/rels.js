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
            return that.exporter.xml.getXml(that.filePath, DEFAULT_XML)}).then(function(xml){
            that.xml = xml
            that.findMaxRelId()
        })
    }

    initCt() {
        let that = this
        return this.exporter.xml.getXml(this.ctFilePath).then(function(ctXml) {
            that.ctXml = ctXml
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
            types.insertAdjacentHTML('beforeEnd', `<Override PartName="/${this.filePath}" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`)
        }
    }
    // Add a relationship for a link
    addLinkRel(link) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${link}" TargetMode="External"/>`
        rels.insertAdjacentHTML('beforeEnd', string)
        this.maxRelId = rId
        return rId
    }

    // add a relationship for an image
    addImageRel(imgFileName) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${imgFileName}"/>`
        rels.insertAdjacentHTML('beforeEnd', string)
        this.maxRelId = rId
        return rId
    }

    addFootnoteRel() {
        let footnotesRel = this.xml.querySelector('Relationship[Target="footnotes.xml"]')
        if (footnotesRel) {
            // Rel exists already
            let fnRId = parseInt(footnotesRel.getAttribute('Id').replace(/\D/g,''))
            return fnRId
        }
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>`
        rels.insertAdjacentHTML('beforeEnd', string)
        this.maxRelId = rId
        return rId
    }

    addNumberingRel() {
        let numberingRel = this.xml.querySelector('Relationship[Target="numbering.xml"]')
        if (numberingRel) {
            // Rel exists already
            let nuRId = parseInt(numberingRel.getAttribute('Id').replace(/\D/g,''))
            return nuRId
        }
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`
        rels.insertAdjacentHTML('beforeEnd', string)
        this.maxRelId = rId
        return rId
    }


}

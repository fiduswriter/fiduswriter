// manages the .rels files. Need to initialize one for each of document.xml and footnotes.xml
import {escapeText} from "../../common"

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
        return this.initCt().then(() => {
            return this.exporter.xml.getXml(this.filePath, DEFAULT_XML)}).then(xml => {
            this.xml = xml
            this.findMaxRelId()
        })
    }

    initCt() {
        return this.exporter.xml.getXml(this.ctFilePath).then(
            ctXml => {
                this.ctXml = ctXml
                this.addRelsToCt()
                return Promise.resolve()
            }
        )
    }

    // Go through a rels xml file and file all the listed relations
    findMaxRelId() {
        let rels = [].slice.call(this.xml.querySelectorAll('Relationship'))

        rels.forEach(
            rel => {
                let id = parseInt(rel.getAttribute("Id").replace(/\D/g,''))
                if (id > this.maxRelId) {
                    this.maxRelId = id
                }
            }
        )
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
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeText(link)}" TargetMode="External"/>`
        rels.insertAdjacentHTML('beforeEnd', string)
        this.maxRelId = rId
        return rId
    }

    // add a relationship for an image
    addImageRel(imgFileName) {
        let rels = this.xml.querySelector('Relationships')
        let rId = this.maxRelId + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeText(imgFileName)}"/>`
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

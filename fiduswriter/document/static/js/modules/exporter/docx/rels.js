// manages the .rels files. Need to initialize one for each of document.xml and footnotes.xml
import {escapeText} from "../../common"

const DEFAULT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`

const DEFAULT_HYPERLINK_STYLE =
`<w:style w:type="character" w:styleId="InternetLink">
    <w:name w:val="Hyperlink"/>
    <w:rPr>
        <w:color w:val="000080"/>
        <w:u w:val="single"/>
    </w:rPr>
</w:style>`

export class DocxExporterRels {
    constructor(exporter, docName) {
        this.exporter = exporter
        this.docName = docName
        this.xml = false
        this.ctXml = false
        this.relIdCounter = -1
        this.filePath = `word/_rels/${this.docName}.xml.rels`
        this.ctFilePath = "[Content_Types].xml"
        this.styleXml = false
        this.styleFilePath = "word/styles.xml"
        this.hyperLinkStyle = false
    }

    init() {
        return Promise.all([
            this.initCt().then(() => {
                return this.exporter.xml.getXml(this.filePath, DEFAULT_XML)
            }).then(xml => {
                this.xml = xml
                this.findMaxRelId()
            }),
            this.exporter.xml.getXml(this.styleFilePath).then(
                styleXml => {
                    this.styleXml = styleXml
                    return Promise.resolve()
                }
            )
        ])
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
        const rels = this.xml.querySelectorAll("Relationship")

        rels.forEach(
            rel => {
                const id = parseInt(rel.getAttribute("Id").replace(/\D/g, ""))
                if (id > this.relIdCounter) {
                    this.relIdCounter = id
                }
            }
        )
    }

    addRelsToCt() {
        const override = this.ctXml.querySelector(`Override[PartName="/${this.filePath}"]`)
        if (!override) {
            const types = this.ctXml.querySelector("Types")
            types.insertAdjacentHTML("beforeEnd", `<Override PartName="/${this.filePath}" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>`)
        }
    }

    // Add a relationship for a link
    addLinkRel(link) {
        const rels = this.xml.querySelector("Relationships")
        const rId = ++this.relIdCounter
        const string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${escapeText(link)}" TargetMode="External"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        return rId
    }

    addLinkStyle() {
        if (this.hyperLinkStyle) {
            // already added
            return
        }
        const hyperLinkEl = this.styleXml.querySelector("name[*|val=\"Hyperlink\"]")
        if (hyperLinkEl) {
            this.hyperLinkStyle = hyperLinkEl.parentElement.getAttribute("w:styleId")
        } else {
            const stylesEl = this.styleXml.querySelector("styles")
            stylesEl.insertAdjacentHTML("beforeEnd", DEFAULT_HYPERLINK_STYLE)
            this.hyperLinkStyle = "InternetLink"
        }
    }

    // add a relationship for an image
    addImageRel(imgFileName) {
        const rels = this.xml.querySelector("Relationships")
        const rId = ++this.relIdCounter
        const string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${escapeText(imgFileName)}"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        return rId
    }

    addFootnoteRel() {
        const footnotesRel = this.xml.querySelector("Relationship[Target=\"footnotes.xml\"]")
        if (footnotesRel) {
            // Rel exists already
            const fnRId = parseInt(footnotesRel.getAttribute("Id").replace(/\D/g, ""))
            return fnRId
        }
        const rels = this.xml.querySelector("Relationships")
        const rId = ++this.relIdCounter
        const string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes" Target="footnotes.xml"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        return rId
    }

    addNumberingRel() {
        const numberingRel = this.xml.querySelector("Relationship[Target=\"numbering.xml\"]")
        if (numberingRel) {
            // Rel exists already
            const nuRId = parseInt(numberingRel.getAttribute("Id").replace(/\D/g, ""))
            return nuRId
        }
        const rels = this.xml.querySelector("Relationships")
        const rId = ++this.relIdCounter
        const string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        return rId
    }

    addCommentsRel() {
        const commentsRel = this.xml.querySelector("Relationship[Target=\"comments.xml\"]")
        if (commentsRel) {
            return
        }
        const rels = this.xml.querySelector("Relationships")
        const string = `<Relationship Id="rId${++this.relIdCounter}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments" Target="comments.xml"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        const override = this.ctXml.querySelector("Override[PartName=\"/word/comments.xml\"]")
        if (!override) {
            const types = this.ctXml.querySelector("Types")
            types.insertAdjacentHTML("beforeEnd", "<Override PartName=\"/word/comments.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.comments+xml\"/>")
        }
    }

    addCommentsExtendedRel() {
        const commentsExtendedRel = this.xml.querySelector("Relationship[Target=\"commentsExtended.xml\"]")
        if (commentsExtendedRel) {
            return
        }
        const rels = this.xml.querySelector("Relationships")
        const string = `<Relationship Id="rId${++this.relIdCounter}" Type="http://schemas.microsoft.com/office/2011/relationships/commentsExtended" Target="commentsExtended.xml"/>`
        rels.insertAdjacentHTML("beforeEnd", string)
        const override = this.ctXml.querySelector("Override[PartName=\"/word/commentsExtended.xml\"]")
        if (!override) {
            const types = this.ctXml.querySelector("Types")
            types.insertAdjacentHTML("beforeEnd", "<Override PartName=\"/word/commentsExtended.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.wordprocessingml.commentsExtended+xml\"/>")
        }
    }


}

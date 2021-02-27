import download from "downloadjs"

import {shortFileTitle} from "../../common"

import {createSlug} from "../tools/file"
import {XmlZip} from "../tools/xml_zip"

import {removeHidden, fixTables} from "../tools/doc_content"
import {OdtExporterCitations} from "./citations"
import {OdtExporterImages} from "./images"
import {OdtExporterRender} from "./render"
import {OdtExporterRichtext} from "./richtext"
import {OdtExporterFootnotes} from "./footnotes"
import {OdtExporterMetadata} from "./metadata"
import {OdtExporterStyles} from "./styles"
import {OdtExporterMath} from "./math"

/*
Exporter to Open Document Text (LibreOffice)
*/

/*
TODO:
* - Export comments
* - Templating of tag/contributor output
*/

export class OdtExporter {
    constructor(doc, templateUrl, bibDB, imageDB, csl) {
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl

        this.pmCits = false
        this.pmBib = false
        this.docContent = false
        this.docTitle = false
        this.mimeType = 'application/vnd.oasis.opendocument.text'
    }


    init() {
        this.docContent = fixTables(removeHidden(this.doc.content))
        this.docTitle = shortFileTitle(this.doc.title, this.doc.path)
        this.metadata = new OdtExporterMetadata(this, this.docContent)
        this.footnotes = new OdtExporterFootnotes(this, this.docContent)
        this.render = new OdtExporterRender(this, this.docContent)
        this.styles = new OdtExporterStyles(this)
        this.math = new OdtExporterMath(this)
        this.images = new OdtExporterImages(this, this.imageDB, this.docContent)
        this.citations = new OdtExporterCitations(this, this.bibDB, this.csl, this.docContent)
        this.richtext = new OdtExporterRichtext(this, this.images)

        this.xml = new XmlZip(
            this.templateUrl,
            this.mimeType
        )
        return this.xml.init().then(
            () => this.styles.init()
        ).then(
            () => this.metadata.init()
        ).then(
            () => this.citations.init()
        ).then(
            () => {
                this.pmBib = this.citations.pmBib
                return this.math.init()
            }
        ).then(
            () => this.render.init()
        ).then(
            () => this.images.init()
        ).then(
            () => this.footnotes.init()
        ).then(
            () => {
                this.render.getTagData(this.pmBib)
                this.render.render()
                return this.xml.prepareBlob()
            }
        ).then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, createSlug(this.docTitle) + '.odt', this.mimeType)
    }

}

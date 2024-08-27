import download from "downloadjs"

import {shortFileTitle} from "../../common"

import {createSlug} from "../tools/file"
import {XmlZip} from "../tools/xml_zip"

import {removeHidden, fixTables} from "../tools/doc_content"
import {ODTExporterCitations} from "./citations"
import {ODTExporterImages} from "./images"
import {ODTExporterRender} from "./render"
import {ODTExporterRichtext} from "./richtext"
import {ODTExporterFootnotes} from "./footnotes"
import {ODTExporterMetadata} from "./metadata"
import {ODTExporterStyles} from "./styles"
import {ODTExporterMath} from "./math"
import {ODTExporterTracks} from "./track"

/*
Exporter to Open Document Text (LibreOffice)
*/

/*
TODO:
* - Export tracked changes of block changes and inline format changes
*    (this feature is lacking in ODT files created with LibreOffice 7.6.7.2)
*/

export class ODTExporter {
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
        this.mimeType = "application/vnd.oasis.opendocument.text"
    }


    init() {
        this.docContent = fixTables(removeHidden(this.doc.content))
        this.docTitle = shortFileTitle(this.doc.title, this.doc.path)
        this.metadata = new ODTExporterMetadata(this, this.docContent)
        this.footnotes = new ODTExporterFootnotes(this, this.docContent)
        this.render = new ODTExporterRender(this, this.docContent)
        this.styles = new ODTExporterStyles(this)
        this.math = new ODTExporterMath(this)
        this.images = new ODTExporterImages(this, this.imageDB, this.docContent)
        this.citations = new ODTExporterCitations(this, this.bibDB, this.csl, this.docContent)
        this.tracks = new ODTExporterTracks(this)
        this.richtext = new ODTExporterRichtext(this, this.images)

        this.xml = new XmlZip(
            this.templateUrl,
            this.mimeType
        )
        return this.xml.init().then(
            () => this.styles.init()
        ).then(
            () => this.tracks.init()
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
        return download(blob, createSlug(this.docTitle) + ".odt", this.mimeType)
    }

}

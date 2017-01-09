import {createSlug, getDatabasesIfNeeded, downloadFile} from "../tools/file"
import {XmlZip} from "../tools/xml-zip"
import {textContent, removeHidden} from "../tools/doc-contents"

import {DocxExporterCitations} from "./citations"
import {DocxExporterImages} from "./images"
import {DocxExporterRender} from "./render"
import {DocxExporterRichtext} from "./richtext"
import {DocxExporterRels} from "./rels"
import {DocxExporterFootnotes} from "./footnotes"
import {DocxExporterMetadata} from "./metadata"
import {DocxExporterMath} from "./math"
import {DocxExporterTables} from "./tables"
import {DocxExporterLists} from "./lists"

/*
Exporter to Office Open XML docx (Microsoft Word)
*/

export class DocxExporter {
    constructor(doc, templateUrl, bibDB, imageDB) {
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.pmBib = false
        this.docContents = false
        this.docTitle = false

        getDatabasesIfNeeded(this, doc).then(
            () => {
                this.init()
            }
        )
    }


    init() {
        this.docContents = removeHidden(this.doc.contents)
        this.docTitle = textContent(this.docContents.content[0])
        this.tables = new DocxExporterTables(this)
        this.math = new DocxExporterMath(this)
        this.metadata = new DocxExporterMetadata(this, this.docContents)
        this.footnotes = new DocxExporterFootnotes(this, this.docContents)
        this.render = new DocxExporterRender(this, this.docContents)
        this.rels = new DocxExporterRels(this, 'document')
        this.images = new DocxExporterImages(this, this.imageDB, this.rels, this.docContents)
        this.lists = new DocxExporterLists(this, this.rels, this.docContents)
        this.citations = new DocxExporterCitations(this, this.bibDB, this.docContents)
        this.richtext = new DocxExporterRichtext(
            this,
            this.rels,
            this.citations,
            this.images
        )
        //this.citations.formatCitations()
        //this.pmBib = this.citations.pmBib
        this.xml = new XmlZip(createSlug(this.docTitle)+'.docx', this.templateUrl)

        this.xml.init().then(
            () => this.citations.init()
        ).then(
            () => {
                this.pmBib = this.citations.pmBib
                return this.metadata.init()
            }
        ).then(
            () => this.tables.init()
        ).then(
            () => this.math.init()
        ).then(
            () => this.render.init()
        ).then(
            () => this.rels.init()
        ).then(
            () => this.images.init()
        ).then(
            () => this.lists.init()
        ).then(
            () => this.footnotes.init()
        ).then(
            () => {
                this.render.getTagData(this.pmBib)
                this.render.render()
                this.xml.prepareAndDownload()
            }
        )
    }

}

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
        let that = this
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.pmBib = false
        this.docContents = false
        this.docTitle = false

        getDatabasesIfNeeded(this, doc).then(function(){
            that.init()
        })
    }


    init() {
        let that = this
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.docContents = removeHidden(this.doc.contents)
        this.docTitle = textContent(this.docContents.content[0])
        this.tables = new DocxExporterTables(this)
        this.math = new DocxExporterMath(this)
        this.metadata = new DocxExporterMetadata(this, this.docContents)
        this.footnotes = new DocxExporterFootnotes(this, this.docContents)
        this.render = new DocxExporterRender(this, this.docContents)
        this.rels = new DocxExporterRels(this, 'document')
        this.images = new DocxExporterImages(this, this.imageDB, this.rels, that.docContents)
        this.lists = new DocxExporterLists(this, this.rels, that.docContents)
        this.citations = new DocxExporterCitations(this, this.bibDB, this.docContents)
        this.richtext = new DocxExporterRichtext(
            this,
            this.rels,
            this.citations,
            this.images
        )
        this.citations.formatCitations()
        this.pmBib = this.citations.pmBib
        this.xml = new XmlZip(createSlug(this.docTitle)+'.docx', this.templateUrl)

        this.xml.init().then(() => {
                return that.metadata.init()
            }).then(() => {
                return that.tables.init()
            }).then(() => {
                return that.math.init()
            }).then(() => {
                return that.render.init()
            }).then(() => {
                return that.rels.init()
            }).then(() => {
                return that.images.init()
            }).then(() => {
                return that.lists.init()
            }).then(() => {
                return that.footnotes.init()
            }).then(() => {
                that.render.getTagData(that.pmBib)
                that.render.render()
                that.xml.prepareAndDownload()
            })
    }

}

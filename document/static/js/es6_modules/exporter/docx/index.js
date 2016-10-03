import {createSlug, getDatabasesIfNeeded, downloadFile} from "../tools/file"
import {XmlZip} from "../tools/xml-zip"
import {textContent, createPmJSON} from "../tools/pmJSON"

import {DocxExporterCitations} from "./citations"
import {DocxExporterImages} from "./images"
import {DocxExporterRender} from "./render"
import {DocxExporterRichtext} from "./richtext"
import {DocxExporterRels} from "./rels"
import {DocxExporterFootnotes} from "./footnotes"
import {DocxExporterMetadata} from "./metadata"
import {DocxExporterMath} from "./math"

/*
Exporter to Microsoft Word.

This exporter is experimental.

*/

export class DocxExporter {
    constructor(doc, bibDB, imageDB) {
        let that = this
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.pmBib = false
        this.pmJSON = false
        this.docTitle = false

        getDatabasesIfNeeded(this, doc).then(function(){
            that.init()
        })
    }


    init() {
        let that = this
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmJSON = createPmJSON(this.doc)
        this.docTitle = textContent(this.pmJSON.content[0])
        this.math = new DocxExporterMath(this)
        this.metadata = new DocxExporterMetadata(this, this.pmJSON)
        this.footnotes = new DocxExporterFootnotes(this, this.pmJSON)
        this.render = new DocxExporterRender(this, this.pmJSON)
        this.rels = new DocxExporterRels(this, 'document')
        this.images = new DocxExporterImages(this, this.imageDB, this.rels, that.pmJSON)
        this.citations = new DocxExporterCitations(this, this.bibDB, this.pmJSON)
        this.richtext = new DocxExporterRichtext(
            this,
            this.rels,
            this.citations,
            this.images
        )
        this.citations.formatCitations()
        this.pmBib = this.citations.pmBib
        this.xml = new XmlZip(createSlug(this.docTitle)+'.docx', staticUrl + 'docx/template.docx')

        this.xml.init().then(() => {
                return that.metadata.init()
            }).then(() => {
                return that.math.init()
            }).then(() => {
                return that.render.init()
            }).then(() => {
                return that.rels.init()
            }).then(() => {
                return that.images.init()
            }).then(() => {
                return that.footnotes.init()
            }).then(() => {
                that.render.getTagData(that.pmBib)
                that.render.render()
                that.xml.prepareAndDownload()
            })
    }

}

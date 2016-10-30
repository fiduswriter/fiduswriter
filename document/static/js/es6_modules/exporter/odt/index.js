import {createSlug, getDatabasesIfNeeded} from "../tools/file"
import {XmlZip} from "../tools/xml-zip"
import {textContent, removeHidden} from "../tools/pmJSON"

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

This exporter is experimental.

*/



export class OdtExporter {
    constructor(doc, templateUrl, bibDB, imageDB) {
        let that = this
        this.doc = doc
        this.templateUrl = templateUrl
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
        this.pmJSON = removeHidden(this.doc.contents)
        this.docTitle = textContent(this.pmJSON.content[0])
        this.metadata = new OdtExporterMetadata(this, this.pmJSON)
        this.footnotes = new OdtExporterFootnotes(this, this.pmJSON)
        this.render = new OdtExporterRender(this, this.pmJSON)
        this.styles = new OdtExporterStyles(this)
        this.math = new OdtExporterMath(this)
        this.images = new OdtExporterImages(this, this.imageDB, that.pmJSON)
        this.citations = new OdtExporterCitations(this, this.bibDB, that.pmJSON)
        this.richtext = new OdtExporterRichtext(
            this,
            this.citations,
            this.images
        )
        this.citations.formatCitations()
        this.pmBib = this.citations.pmBib
        this.xml = new XmlZip(createSlug(this.docTitle)+'.odt', this.templateUrl)
        this.xml.init().then(() => {
                return that.metadata.init()
            }).then(() => {
                return that.styles.init()
            }).then(() => {
                return that.math.init()
            }).then(() => {
                return that.render.init()
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

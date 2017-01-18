import {createSlug, getDatabasesIfNeeded} from "../tools/file"
import {XmlZip} from "../tools/xml-zip"
import {textContent, removeHidden} from "../tools/doc-contents"

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

export class OdtExporter {
    constructor(doc, templateUrl, bibDB, imageDB) {
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.pmCits = false
        this.docContents = false
        this.docTitle = false

        getDatabasesIfNeeded(this, doc).then(
            () => this.init()
        )
    }



    init() {
        this.docContents = removeHidden(this.doc.contents)
        this.docTitle = textContent(this.docContents.content[0])
        this.metadata = new OdtExporterMetadata(this, this.docContents)
        this.footnotes = new OdtExporterFootnotes(this, this.docContents)
        this.render = new OdtExporterRender(this, this.docContents)
        this.styles = new OdtExporterStyles(this)
        this.math = new OdtExporterMath(this)
        this.images = new OdtExporterImages(this, this.imageDB, this.docContents)
        this.citations = new OdtExporterCitations(this, this.bibDB, this.docContents)
        this.richtext = new OdtExporterRichtext(this, this.images)

        this.xml = new XmlZip(createSlug(this.docTitle)+'.odt', this.templateUrl)
        this.xml.init().then(
            () => this.metadata.init()
        ).then(
            () => this.styles.init()
        ).then(
            () => this.citations.init()
        ).then(
            () => this.math.init()
        ).then(
            () => this.render.init()
        ).then(
            () => this.images.init()
        ).then(
            () => this.footnotes.init()
        ).then(
            () => {
                this.render.getTagData(this.citations.pmBib)
                this.render.render()
                this.xml.prepareAndDownload()
            }
        )
    }

}

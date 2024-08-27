import download from "downloadjs"

import {shortFileTitle} from "../../common"
import {createSlug} from "../tools/file"
import {XmlZip} from "../tools/xml_zip"
import {removeHidden, fixTables} from "../tools/doc_content"
import {moveFootnoteComments} from "./tools"
import {DOCXExporterCitations} from "./citations"
import {DOCXExporterComments} from "./comments"
import {DOCXExporterImages} from "./images"
import {DOCXExporterRender} from "./render"
import {DOCXExporterRichtext} from "./richtext"
import {DOCXExporterRels} from "./rels"
import {DOCXExporterFootnotes} from "./footnotes"
import {DOCXExporterMetadata} from "./metadata"
import {DOCXExporterMath} from "./math"
import {DOCXExporterTables} from "./tables"
import {DOCXExporterLists} from "./lists"

/*
Exporter to Office Open XML docx (Microsoft Word)
*/

/*
TODO:
* - Export tracked changes
* - Remove comments
* - Export document language
* - Templating of tag/contributor output
*/

export class DOCXExporter {
    constructor(doc, templateUrl, bibDB, imageDB, csl) {
        this.doc = doc
        this.templateUrl = templateUrl
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl

        this.pmBib = false
        this.docContent = false
        this.docTitle = false
        this.mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }


    init() {
        this.docContent = moveFootnoteComments(fixTables(removeHidden(this.doc.content)))
        this.docTitle = shortFileTitle(this.doc.title, this.doc.path)
        this.tables = new DOCXExporterTables(this)
        this.math = new DOCXExporterMath(this)
        this.metadata = new DOCXExporterMetadata(this, this.docContent)
        this.footnotes = new DOCXExporterFootnotes(this, this.docContent)
        this.render = new DOCXExporterRender(this, this.docContent)
        this.rels = new DOCXExporterRels(this, "document")
        this.images = new DOCXExporterImages(this, this.imageDB, this.rels, this.docContent)
        this.lists = new DOCXExporterLists(this, this.rels, this.docContent)
        this.citations = new DOCXExporterCitations(this, this.bibDB, this.csl, this.docContent)
        this.comments = new DOCXExporterComments(this, this.doc.comments, this.docContent)
        this.richtext = new DOCXExporterRichtext(
            this,
            this.rels,
            this.citations,
            this.images,
            this.comments,
        )

        this.xml = new XmlZip(
            this.templateUrl,
            this.mimeType
        )

        return this.xml.init().then(
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
            () => this.comments.init()
        ).then(
            () => this.lists.init()
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
        return download(blob, createSlug(this.docTitle) + ".docx", this.mimeType)
    }

}

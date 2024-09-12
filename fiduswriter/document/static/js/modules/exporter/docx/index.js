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

        this.docTitle = shortFileTitle(this.doc.title, this.doc.path)
        this.mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }


    init() {
        const docContent = moveFootnoteComments(fixTables(removeHidden(this.doc.content)))

        const xml = new XmlZip(
            this.templateUrl,
            this.mimeType
        )

        const tables = new DOCXExporterTables(xml)
        const math = new DOCXExporterMath(xml)
        const rels = new DOCXExporterRels(xml, "document")

        const metadata = new DOCXExporterMetadata(docContent, xml)

        const images = new DOCXExporterImages(docContent, this.imageDB, xml, rels)
        const lists = new DOCXExporterLists(docContent, xml, rels)
        const citations = new DOCXExporterCitations(docContent, this.doc.settings, this.bibDB, this.csl, xml)

        const footnotes = new DOCXExporterFootnotes(
            this.doc,
            docContent,
            this.doc.settings,
            this.imageDB,
            this.bibDB,
            xml,
            citations,
            this.csl,
            lists,
            math,
            tables,
            rels
        )

        const richtext = new DOCXExporterRichtext(
            this.doc,
            this.doc.settings,
            lists,
            footnotes,
            math,
            tables,
            rels,
            citations,
            images,
        )

        const comments = new DOCXExporterComments(docContent, this.doc.comments, xml, rels, richtext)

        const render = new DOCXExporterRender(docContent, this.doc.settings, xml, citations, richtext)

        return xml.init().then(
            () => citations.init()
        ).then(
            () => metadata.init()
        ).then(
            () => tables.init()
        ).then(
            () => math.init()
        ).then(
            () => render.init()
        ).then(
            () => rels.init()
        ).then(
            () => images.init()
        ).then(
            () => comments.init()
        ).then(
            () => lists.init()
        ).then(
            () => footnotes.init()
        ).then(
            () => {
                const pmBib = footnotes.pmBib || citations.pmBib
                render.getTagData(pmBib)
                render.render()
                return xml.prepareBlob()
            }
        ).then(
            blob => this.download(blob)
        )
    }
    download(blob) {
        return download(blob, createSlug(this.docTitle) + ".docx", this.mimeType)
    }

}

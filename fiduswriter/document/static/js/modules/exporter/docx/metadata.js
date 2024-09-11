import {textContent} from "../tools/doc_content"
import {escapeText} from "../../common"


export class DOCXExporterMetadata {
    constructor(exporter, docContent) {
        this.exporter = exporter
        this.docContent = docContent
        this.coreXml = false
        this.metadata = {
            authors: this.docContent.content.reduce(
                (authors, part) => {
                    if (
                        part.type === "contributors_part" &&
                        part.attrs.metadata === "authors" &&
                        part.content
                    ) {
                        return authors.concat(part.content.map(authorNode => authorNode.attrs))
                    } else {
                        return authors
                    }
                },
                []),
            keywords: this.docContent.content.reduce(
                (keywords, part) => {
                    if (
                        part.type === "tags_part" &&
                        part.attrs.metadata === "keywords" &&
                        part.content
                    ) {
                        return keywords.concat(part.content.map(keywordNode => keywordNode.attrs.tag))
                    } else {
                        return keywords
                    }
                },
                []),
            title: textContent(this.docContent.content[0])
        }
    }

    init() {
        return this.exporter.xml.getXml("docProps/core.xml").then(
            coreXml => {
                this.coreXml = coreXml
                this.addMetadata()
                return Promise.resolve()
            }
        )
    }


    addMetadata() {
        const corePropertiesEl = this.coreXml.getElementByTagName("cp:coreProperties")

        // Title
        let titleEl = this.coreXml.getElementByTagName("dc:title")
        if (!titleEl) {
            corePropertiesEl.appendXML("<dc:title></dc:title>")
            titleEl = corePropertiesEl.lastElementChild
        }
        titleEl.innerXML = escapeText(this.metadata.title)
        // Authors

        const authors = this.metadata.authors.map(author => {
            const nameParts = []
            if (author.firstname) {
                nameParts.push(author.firstname)
            }
            if (author.lastname) {
                nameParts.push(author.lastname)
            }
            if (!nameParts.length && author.institution) {
                // We have an institution but no names. Use institution as name.
                nameParts.push(author.institution)
            }
            return nameParts.join(" ")
        })
        const lastAuthor = authors.length ? escapeText(authors[0]) : gettext("Unknown")
        const allAuthors = authors.length ? escapeText(authors.join(";")) : gettext("Unknown")
        let allAuthorsEl = this.coreXml.getElementByTagName("dc:creator")

        if (!allAuthorsEl) {
            corePropertiesEl.appendXML("<dc:creator></dc:creator>")
            allAuthorsEl = corePropertiesEl.lastElementChild
        }
        allAuthorsEl.innerXML = allAuthors
        let lastAuthorEl = this.coreXml.getElementByTagName("dc:lastModifiedBy")
        if (!lastAuthorEl) {
            corePropertiesEl.appendXML("<dc:lastModifiedBy></dc:lastModifiedBy>")
            lastAuthorEl = corePropertiesEl.lastElementChild
        }
        lastAuthorEl.innerXML = lastAuthor
        // Keywords
        if (this.metadata.keywords.length) {
            // It is not really clear how keywords should be separated in DOCX files,
            // so we use ", ".
            const keywordsString = escapeText(this.metadata.keywords.join(", "))

            let keywordsEl = this.coreXml.getElementByTagName("cp:keywords")
            if (!keywordsEl) {
                corePropertiesEl.appendXML("<cp:keywords></cp:keywords>")
                keywordsEl = corePropertiesEl.lastElementChild
            }
            keywordsEl.innerXML = keywordsString
        }

        // time
        const date = new Date()
        const dateString = date.toISOString().split(".")[0] + "Z"
        const createdEl = this.coreXml.getElementByTagName("dcterms:created")
        createdEl.innerXML = dateString
        let modifiedEl = this.coreXml.getElementByTagName("dcterms:modified")
        if (!modifiedEl) {
            corePropertiesEl.appendXML("<dcterms:modified xsi:type=\"dcterms:W3CDTF\"></dcterms:modified>")
            modifiedEl = corePropertiesEl.lastElementChild
        }
        modifiedEl.innerXML = dateString
    }

}

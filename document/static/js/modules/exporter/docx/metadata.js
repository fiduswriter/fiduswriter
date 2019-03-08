import {textContent} from "../tools/doc_contents"
import {escapeText} from "../../common"


export class DocxExporterMetadata {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.coreXml = false
        this.metadata = {
            authors: this.docContents.content.reduce(
                (authors, part) => {
                    if (
                        part.type==='contributors_part' &&
                        part.attrs.metadata === 'authors' &&
                        part.content
                    ) {
                        return authors.concat(part.content.map(authorNode => authorNode.attrs))
                    } else {
                        return authors
                    }
                },
            []),
            keywords: this.docContents.content.reduce(
                (keywords, part) => {
                    if (
                        part.type==='tags_part' &&
                        part.attrs.metadata === 'keywords' &&
                        part.content
                    ) {
                        return keywords.concat(part.content.map(keywordNode => keywordNode.attrs.tag))
                    } else {
                        return keywords
                    }
                },
            []),
            title: textContent(this.docContents.content[0])
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
        const corePropertiesEl = this.coreXml.querySelector('coreProperties')

        // Title
        let titleEl = this.coreXml.querySelector('title')
        if (!titleEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dc:title></dc:title>')
            titleEl = this.coreXml.querySelector('title')
        }
        titleEl.innerHTML = escapeText(this.metadata.title)

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
            return nameParts.join(' ')
        })
        const lastAuthor = authors.length ? escapeText(authors[0]) : gettext('Unknown')
        const allAuthors = authors.length ? escapeText(authors.join(';')): gettext('Unknown')
        let allAuthorsEl = this.coreXml.querySelector('creator')
        if (!allAuthorsEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dc:creator></dc:creator>')
            allAuthorsEl = this.coreXml.querySelector('creator')
        }
        allAuthorsEl.innerHTML = allAuthors
        let lastAuthorEl = this.coreXml.querySelector('lastModifiedBy')
        if (!lastAuthorEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dc:lastModifiedBy></dc:lastModifiedBy>')
            lastAuthorEl = this.coreXml.querySelector('lastModifiedBy')
        }
        lastAuthorEl.innerHTML = lastAuthor

        // Keywords
        if (this.metadata.keywords.length) {
            // It is not really clear how keywords should be separated in DOCX files,
            // so we use ", ".
            const keywordsString = escapeText(this.metadata.keywords.join(', '))

            let keywordsEl = this.coreXml.querySelector('keywords')
            if (!keywordsEl) {
                corePropertiesEl.insertAdjacentHTML('beforeEnd', '<cp:keywords></cp:keywords>')
                keywordsEl = this.coreXml.querySelector('keywords')
            }
            keywordsEl.innerHTML = keywordsString
        }



        // time
        const date = new Date()
        const dateString = date.toISOString().split('.')[0]+'Z'
        const createdEl = this.coreXml.querySelector('created')
        createdEl.innerHTML = dateString
        let modifiedEl = this.coreXml.querySelector('modified')
        if (!modifiedEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>')
            modifiedEl = this.coreXml.querySelector('modified')
        }
        modifiedEl.innerHTML = dateString
    }

}

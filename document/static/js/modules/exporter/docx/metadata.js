import {textContent} from "../tools/doc_contents"
import {escapeText} from "../../common"


export class DocxExporterMetadata {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.coreXml = false
        this.metadata = {
            authors: this.docContents.content[2].content ?
                this.docContents.content[2].content.map(authorNode => authorNode.attrs) :
                [],
            keywords: this.docContents.content[4].content ?
                this.docContents.content[4].content.map(keywordNode => keywordNode.attrs.keyword) :
                [],
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
        let corePropertiesEl = this.coreXml.querySelector('coreProperties')

        // Title
        let titleEl = this.coreXml.querySelector('title')
        if (!titleEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dc:title></dc:title>')
            titleEl = this.coreXml.querySelector('title')
        }
        titleEl.innerHTML = escapeText(this.metadata.title)

        // Authors

        let authors = this.metadata.authors.map(author => {
            let nameParts = []
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
        let lastAuthor = authors.length ? escapeText(authors[0]) : gettext('Unknown')
        let allAuthors = authors.length ? escapeText(authors.join(';')): gettext('Unknown')

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
            let keywordsString = escapeText(this.metadata.keywords.join(', '))

            let keywordsEl = this.coreXml.querySelector('keywords')
            if (!keywordsEl) {
                corePropertiesEl.insertAdjacentHTML('beforeEnd', '<cp:keywords></cp:keywords>')
                keywordsEl = this.coreXml.querySelector('keywords')
            }
            keywordsEl.innerHTML = keywordsString
        }



        // time
        let date = new Date()
        let dateString = date.toISOString().split('.')[0]+'Z'
        let createdEl = this.coreXml.querySelector('created')
        createdEl.innerHTML = dateString
        let modifiedEl = this.coreXml.querySelector('modified')
        if (!modifiedEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>')
            modifiedEl = this.coreXml.querySelector('modified')
        }
        modifiedEl.innerHTML = dateString
    }

}

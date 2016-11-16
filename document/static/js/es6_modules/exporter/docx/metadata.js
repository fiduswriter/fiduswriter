import {textContent} from "../tools/doc-contents"
import {escapeText} from "../tools/html"


export class DocxExporterMetadata {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.coreXml = false
        this.metadata = {
            authors: textContent(this.docContents.content[2]),
            keywords: textContent(this.docContents.content[4]),
            title: textContent(this.docContents.content[0])
        }
    }

    init() {
        let that = this
        return this.exporter.xml.getXml("docProps/core.xml").then(function(coreXml){
            that.coreXml = coreXml
            that.addMetadata()
            return Promise.resolve()
        })
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
        let lastAuthor = 'Unknown'
        let allAuthors = 'Unknown'
        let authors = this.metadata.authors.split(/[,;]/).map(entry => entry.trim()).filter(entry => entry.length)
        if (authors.length > 0) {
            lastAuthor = escapeText(authors[0])
            allAuthors = escapeText(authors.join(';'))
        }
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
        let keywordsEl = this.coreXml.querySelector('keywords')
        if (!keywordsEl) {
            corePropertiesEl.insertAdjacentHTML('beforeEnd', '<dc:keywords></dc:keywords>')
            keywordsEl = this.coreXml.querySelector('keywords')
        }
        keywordsEl.innerHTML = escapeText(this.metadata.keywords)

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

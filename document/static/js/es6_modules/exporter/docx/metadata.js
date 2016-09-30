import {escapeText} from "./tools"


export class DocxExporterMetadata {
    constructor(exporter) {
        this.exporter = exporter
        this.coreXml = false
        this.metadata = {
            authors: '',
            keywords: '',
            title: ''
        }
        this.docSettings = this.exporter.doc.settings
    }

    init() {
        let that = this
        return this.exporter.xml.fromZip("docProps/core.xml").then(function(coreXml){
            that.coreXml = coreXml
            that.findMetadata()
            that.addMetadata()
            return window.Promise.resolve()
        })
    }

    findMetadata() {
        this.metadata.authors = this.docSettings['metadata-authors'] ? this.exporter.pmDoc.child(2).textContent : ''
        this.metadata.keywords = this.docSettings['metadata-keywords'] ? this.exporter.pmDoc.child(4).textContent : ''
        this.metadata.title = this.exporter.pmDoc.child(0).textContent
    }

    addMetadata() {
        let corePropertiesEl = this.coreXml.querySelector('coreProperties')

        // Title
        let titleEl = this.coreXml.querySelector('title')
        if (!titleEl) {
            corePropertiesEl.insertAdjacentHTML('beforeend', '<dc:title></dc:title>')
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
            corePropertiesEl.insertAdjacentHTML('beforeend', '<dc:creator></dc:creator>')
            allAuthorsEl = this.coreXml.querySelector('creator')
        }
        allAuthorsEl.innerHTML = allAuthors
        let lastAuthorEl = this.coreXml.querySelector('lastModifiedBy')
        if (!lastAuthorEl) {
            corePropertiesEl.insertAdjacentHTML('beforeend', '<dc:lastModifiedBy></dc:lastModifiedBy>')
            lastAuthorEl = this.coreXml.querySelector('lastModifiedBy')
        }
        lastAuthorEl.innerHTML = lastAuthor

        // Keywords
        let keywordsEl = this.coreXml.querySelector('keywords')
        if (!keywordsEl) {
            corePropertiesEl.insertAdjacentHTML('beforeend', '<dc:keywords></dc:keywords>')
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
            corePropertiesEl.insertAdjacentHTML('beforeend', '<dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>')
            modifiedEl = this.coreXml.querySelector('modified')
        }
        modifiedEl.innerHTML = dateString
    }

}

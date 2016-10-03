import {textContent} from "../tools/pmJSON"
import {escapeText} from "../tools/html"


export class DocxExporterMetadata {
    constructor(exporter, pmJSON) {
        this.exporter = exporter
        this.pmJSON = pmJSON
        this.coreXml = false
        this.metadata = {
            authors: textContent(this.pmJSON.content[2]),
            keywords: textContent(this.pmJSON.content[4]),
            title: textContent(this.pmJSON.content[0])
        }
    }

    init() {
        let that = this
        return this.exporter.xml.fromZip("docProps/core.xml").then(function(coreXml){
            that.coreXml = coreXml
            that.addMetadata()
            return window.Promise.resolve()
        })
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

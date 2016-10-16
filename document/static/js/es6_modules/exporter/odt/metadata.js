import {textContent} from "../tools/pmJSON"
import {escapeText} from "../tools/html"


export class OdtExporterMetadata {
    constructor(exporter, pmJSON) {
        this.exporter = exporter
        this.pmJSON = pmJSON
        this.metaXml = false
        this.metadata = {
            authors: textContent(this.pmJSON.content[2]),
            keywords: textContent(this.pmJSON.content[4]),
            title: textContent(this.pmJSON.content[0])
        }
    }

    init() {
        let that = this
        return this.exporter.xml.getXml("meta.xml").then(function(metaXml){
            that.metaXml = metaXml
            that.addMetadata()
            return window.Promise.resolve()
        })
    }


    addMetadata() {
        let metaEl = this.metaXml.querySelector('meta')

        // Title
        let titleEl = this.metaXml.querySelector('title')
        if (!titleEl) {
            metaEl.insertAdjacentHTML('beforeEnd', '<dc:title></dc:title>')
            titleEl = this.metaXml.querySelector('title')
        }
        titleEl.innerHTML = escapeText(this.metadata.title)

        // Authors
        let initialAuthor = 'Unknown'
        let allAuthors = 'Unknown'
        let authors = this.metadata.authors.split(/[,;]/).map(entry => entry.trim()).filter(entry => entry.length)
        if (authors.length > 0) {
            initialAuthor = escapeText(authors[0])
            allAuthors = escapeText(authors.join(';'))
        }
        let allAuthorsEl = this.metaXml.querySelector('creator')
        if (!allAuthorsEl) {
            metaEl.insertAdjacentHTML('beforeEnd', '<dc:creator></dc:creator>')
            allAuthorsEl = this.metaXml.querySelector('creator')
        }
        allAuthorsEl.innerHTML = allAuthors
        let initialAuthorEl = this.metaXml.querySelector('initial-creator')
        if (!initialAuthorEl) {
            metaEl.insertAdjacentHTML('beforeEnd', '<meta:initial-creator></meta:initial-creator>')
            initialAuthorEl = this.metaXml.querySelector('initial-creator')
        }
        initialAuthorEl.innerHTML = initialAuthor

        // Keywords
        // Remove all existing keywords
        let keywordEls = [].slice.call(this.metaXml.querySelectorAll('keywords'))
        keywordEls.forEach(function(keywordEl){
            keywordEl.parentNode.removeChild(keywordEl)
        })
        // Add new keywords
        let keywords = this.metadata.keywords.split(/[,;]/).map(entry => entry.trim()).filter(entry => entry.length)
        keywords.forEach(function(keyword){
            metaEl.insertAdjacentHTML('beforeEnd', `<meta:keyword>${keyword}</meta:keyword>`)
        })

        // time
        let date = new Date()
        let dateString = date.toISOString().split('.')[0]
        let createdEl = this.metaXml.querySelector('creation-date')
        createdEl.innerHTML = dateString
        let dateEl = this.metaXml.querySelector('date')
        if (!dateEl) {
            metaEl.insertAdjacentHTML('beforeEnd', '<dc:date></dc:date>')
            dateEl = this.metaXml.querySelector('date')
        }
        dateEl.innerHTML = `${dateString}.000000000`
    }

}

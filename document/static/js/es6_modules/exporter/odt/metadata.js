import {textContent} from "../tools/doc-contents"
import {escapeText} from "../../common"


export class OdtExporterMetadata {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.metaXml = false
        this.metadata = {
            authors: textContent(this.docContents.content[2]),
            keywords: textContent(this.docContents.content[4]),
            title: textContent(this.docContents.content[0])
        }
    }

    init() {
        return this.exporter.xml.getXml("meta.xml").then(
            metaXml => {
                this.metaXml = metaXml
                this.addMetadata()
                return Promise.resolve()
            }
        )
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
        keywordEls.forEach(
            keywordEl => keywordEl.parentNode.removeChild(keywordEl)
        )
        // Add new keywords
        let keywords = this.metadata.keywords.split(/[,;]/).map(entry => entry.trim()).filter(entry => entry.length)
        keywords.forEach(
            keyword => metaEl.insertAdjacentHTML('beforeEnd', `<meta:keyword>${keyword}</meta:keyword>`)
        )

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

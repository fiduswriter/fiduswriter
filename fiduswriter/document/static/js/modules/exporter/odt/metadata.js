import {escapeText, createXMLNode} from "../../common"


export class ODTExporterMetadata {
    constructor(xml, styles, metadata) {
        this.xml = xml
        this.styles = styles
        this.metadata = metadata
        this.metaXml = false
    }

    init() {
        return this.xml.getXml("meta.xml").then(
            metaXml => {
                this.metaXml = metaXml
                this.addMetadata()
                return Promise.resolve()
            }
        )
    }


    addMetadata() {
        const metaEl = this.metaXml.getElementsByTagName("office:meta")[0]

        // Title
        let titleEl = this.metaXml.getElementsByTagName("dc:title")[0]
        if (!titleEl) {
            metaEl.appendChild(createXMLNode("<dc:title></dc:title>"))
            titleEl = this.metaXml.lastElementChild
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
            return nameParts.join(" ")
        })

        const initialAuthor = authors.length ?
            escapeText(authors[0]) :
            gettext("Unknown")
        // TODO: We likely want to differentiate between first and last author.
        const lastAuthor = initialAuthor

        let lastAuthorEl = this.metaXml.getElementsByTagName("dc:creator")[0]
        if (!lastAuthorEl) {
            metaEl.appendChild(createXMLNode("<dc:creator></dc:creator>"))
            lastAuthorEl = this.metaXml.lastElementChild
        }
        lastAuthorEl.innerHTML = lastAuthor
        let initialAuthorEl = this.metaXml.getElementsByTagName("meta:initial-creator")[0]
        if (!initialAuthorEl) {
            metaEl.appendChild(createXMLNode("<meta:initial-creator></meta:initial-creator>"))
            initialAuthorEl = this.metaXml.lastElementChild
        }
        initialAuthorEl.innerHTML = initialAuthor

        // Keywords
        // Remove all existing keywords
        const keywordEls = Array.from(this.metaXml.getElementsByTagName("meta:keywords"))
        keywordEls.forEach(
            keywordEl => keywordEl.parentNode.removeChild(keywordEl)
        )
        // Add new keywords
        const keywords = this.metadata.keywords
        keywords.forEach(
            keyword => metaEl.appendChild(createXMLNode(`<meta:keyword>${escapeText(keyword)}</meta:keyword>`))
        )

        // language
        // LibreOffice seems to ignore the value set in metadata and instead uses
        // the one set in default styles. So we set both.
        this.styles.setLanguage(this.metadata.language)
        let languageEl = this.metaXml.getElementsByTagName("dc:language")[0]
        if (!languageEl) {
            metaEl.appendChild(createXMLNode("<dc:language></dc:language>"))
            languageEl = this.metaXml.lastElementChild
        }
        languageEl.innerHTML = this.metadata.language
        // time
        const date = new Date()
        const dateString = date.toISOString().split(".")[0]
        const createdEl = metaEl.getElementsByTagName("meta:creation-date")[0]
        createdEl.innerHTML = dateString
        let dateEl = this.metaXml.getElementsByTagName("dc:date")[0]
        if (!dateEl) {
            metaEl.appendChild(createXMLNode("<dc:date></dc:date>"))
            dateEl = this.metaXml.lastElementChild
        }
        dateEl.innerHTML = `${dateString}.000000000`
    }

}

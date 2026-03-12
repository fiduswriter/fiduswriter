import {escapeText} from "../../common"

export class ODTExporterMetadata {
    constructor(xml, styles, metadata, csl = null) {
        this.xml = xml
        this.styles = styles
        this.metadata = metadata
        this.csl = csl
        this.metaXml = false
    }

    init() {
        return this.xml.getXml("meta.xml").then(metaXml => {
            this.metaXml = metaXml
            this.addMetadata()
            return this.addZoteroPrefs()
        })
    }

    async hasBibliography() {
        if (!this.csl || !this.metadata.citationStyle) {
            return "0"
        }
        try {
            const style = await this.csl.getStyle(this.metadata.citationStyle)
            // Check if the style has a bibliography section
            const hasBib = style.children.some(
                section => section.name === "bibliography"
            )
            return hasBib ? "1" : "0"
        } catch (_error) {
            return "0"
        }
    }

    addMetadata() {
        const metaEl = this.metaXml.query("office:meta")

        // Title
        const titleEl = this.metaXml.query("dc:title")
        if (titleEl) {
            titleEl.innerXML = escapeText(this.metadata.title)
        } else {
            metaEl.appendXML(
                `<dc:title>${escapeText(this.metadata.title)}</dc:title>`
            )
        }

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

        const initialAuthor = authors.length
            ? escapeText(authors[0])
            : gettext("Unknown")
        // TODO: We likely want to differentiate between first and last author.
        const lastAuthor = initialAuthor

        const lastAuthorEl = this.metaXml.query("dc:creator")
        if (lastAuthorEl) {
            lastAuthorEl.innerXML = lastAuthor
        } else {
            metaEl.appendXML(`<dc:creator>${lastAuthor}</dc:creator>`)
        }
        const initialAuthorEl = this.metaXml.query("meta:initial-creator")
        if (initialAuthorEl) {
            initialAuthorEl.innerXML = initialAuthor
        } else {
            metaEl.appendXML(
                `<meta:initial-creator>${initialAuthor}</meta:initial-creator>`
            )
        }

        // Keywords
        // Remove all existing keywords
        const keywordEls = this.metaXml.queryAll("meta:keywords")
        keywordEls.forEach(keywordEl =>
            keywordEl.parentElement.removeChild(keywordEl)
        )
        // Add new keywords
        const keywords = this.metadata.keywords
        keywords.forEach(keyword =>
            metaEl.appendXML(
                `<meta:keyword>${escapeText(keyword)}</meta:keyword>`
            )
        )

        // language
        // LibreOffice seems to ignore the value set in metadata and instead uses
        // the one set in default styles. So we set both.
        this.styles.setLanguage(this.metadata.language)
        const languageEl = this.metaXml.query("dc:language")
        if (languageEl) {
            languageEl.innerXML = this.metadata.language
        } else {
            metaEl.appendXML(
                `<dc:language>${this.metadata.language}</dc:language>`
            )
        }
        // time
        const date = new Date()
        const dateString = date.toISOString().split(".")[0]
        const createdEl = metaEl.query("meta:creation-date")
        createdEl.innerXML = dateString
        const dateEl = this.metaXml.query("dc:date")
        if (dateEl) {
            dateEl.innerXML = `${dateString}.000000000`
        } else {
            metaEl.appendXML(`<dc:date>${dateString}.000000000</dc:date>`)
        }
    }

    async addZoteroPrefs() {
        // Add citation style property to meta.xml
        if (!this.metadata.citationStyle) {
            return Promise.resolve()
        }

        const metaEl = this.metaXml.query("office:meta")

        // Remove any existing ZOTERO_PREF_ properties
        const existingZoteroProps = this.metaXml
            .queryAll("meta:user-defined")
            .filter(
                prop =>
                    prop.getAttribute("meta:name") &&
                    prop.getAttribute("meta:name").startsWith("ZOTERO_PREF_")
            )
        existingZoteroProps.forEach(prop =>
            prop.parentElement.removeChild(prop)
        )

        // Determine if the citation style has a bibliography
        const hasBib = await this.hasBibliography()

        // Create the data content
        const citationStyleUrl = `http://www.zotero.org/styles/${escapeText(this.metadata.citationStyle)}`
        const dataContent = escapeText(
            `<data data-version="3" zotero-version="8.0.2"><session id=""/><style id="${citationStyleUrl}" locale="${escapeText(this.metadata.language || "en-US")}" hasBibliography="${hasBib}" bibliographyStyleHasBeenSet="1"/><prefs><pref name="fieldType" value="ReferenceMark"/><pref name="automaticJournalAbbreviations" value="true"/></prefs></data>`
        )

        // Split content into chunks of 378 characters (ODT limit)
        const chunkSize = 378
        const chunks = []
        for (let i = 0; i < dataContent.length; i += chunkSize) {
            chunks.push(dataContent.substring(i, i + chunkSize))
        }

        // Create meta:user-defined elements for each chunk
        chunks.forEach((chunk, index) => {
            const propName = `ZOTERO_PREF_${index + 1}`
            const userDefinedEl = `<meta:user-defined meta:name="${propName}">${chunk}</meta:user-defined>`
            metaEl.appendXML(userDefinedEl)
        })

        return Promise.resolve()
    }
}

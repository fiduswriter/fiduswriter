import {escapeText} from "../../common"

export class DOCXExporterMetadata {
    constructor(xml, metadata, csl = null) {
        this.xml = xml
        this.metadata = metadata
        this.csl = csl
        this.coreXML = false
        this.customXML = false
    }

    init() {
        return this.xml.getXml("docProps/core.xml").then(coreXML => {
            this.coreXML = coreXML
            this.addMetadata()
            return this.addCustomProperties()
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
        const corePropertiesEl = this.coreXML.query("cp:coreProperties")

        // Title
        let titleEl = this.coreXML.query("dc:title")
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
        const lastAuthor = authors.length
            ? escapeText(authors[0])
            : gettext("Unknown")
        const allAuthors = authors.length
            ? escapeText(authors.join(";"))
            : gettext("Unknown")
        let allAuthorsEl = this.coreXML.query("dc:creator")

        if (!allAuthorsEl) {
            corePropertiesEl.appendXML("<dc:creator></dc:creator>")
            allAuthorsEl = corePropertiesEl.lastElementChild
        }
        allAuthorsEl.innerXML = allAuthors
        let lastAuthorEl = this.coreXML.query("dc:lastModifiedBy")
        if (!lastAuthorEl) {
            corePropertiesEl.appendXML(
                "<dc:lastModifiedBy></dc:lastModifiedBy>"
            )
            lastAuthorEl = corePropertiesEl.lastElementChild
        }
        lastAuthorEl.innerXML = lastAuthor
        // Keywords
        if (this.metadata.keywords.length) {
            // It is not really clear how keywords should be separated in DOCX files,
            // so we use ", ".
            const keywordsString = escapeText(this.metadata.keywords.join(", "))

            let keywordsEl = this.coreXML.query("cp:keywords")
            if (!keywordsEl) {
                corePropertiesEl.appendXML("<cp:keywords></cp:keywords>")
                keywordsEl = corePropertiesEl.lastElementChild
            }
            keywordsEl.innerXML = keywordsString
        }

        // time
        const date = new Date()
        const dateString = date.toISOString().split(".")[0] + "Z"
        const createdEl = this.coreXML.query("dcterms:created")
        createdEl.innerXML = dateString
        let modifiedEl = this.coreXML.query("dcterms:modified")
        if (!modifiedEl) {
            corePropertiesEl.appendXML(
                '<dcterms:modified xsi:type="dcterms:W3CDTF"></dcterms:modified>'
            )
            modifiedEl = corePropertiesEl.lastElementChild
        }
        modifiedEl.innerXML = dateString
    }

    async addCustomProperties() {
        // Create or update docProps/custom.xml with citation style information
        const customXmlContent = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/custom-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
</Properties>`

        const customXML = await this.xml.getXml(
            "docProps/custom.xml",
            Promise.resolve(customXmlContent)
        )
        this.customXML = customXML

        // Add citation style property
        if (this.metadata.citationStyle) {
            const propertiesEl = this.customXML.query("Properties")

            // Remove any existing ZOTERO_PREF_ properties
            const existingZoteroProps = this.customXML
                .queryAll("property")
                .filter(
                    prop =>
                        prop.getAttribute("name") &&
                        prop.getAttribute("name").startsWith("ZOTERO_PREF_")
                )
            existingZoteroProps.forEach(prop =>
                prop.parentElement.removeChild(prop)
            )

            // Find the highest pid to determine the next one
            const existingProperties = this.customXML.queryAll("property")
            let maxPid = 0
            existingProperties.forEach(prop => {
                const pid = parseInt(prop.getAttribute("pid"))
                if (pid > maxPid) {
                    maxPid = pid
                }
            })

            // Determine if the citation style has a bibliography
            const hasBib = await this.hasBibliography()

            // Create the data content
            const citationStyleUrl = `http://www.zotero.org/styles/${escapeText(this.metadata.citationStyle)}`
            const dataContent = `<data data-version="3" zotero-version="8.0.2"><session id=""/><style id="${citationStyleUrl}" locale="${escapeText(this.metadata.language || "en-US")}" hasBibliography="${hasBib}" bibliographyStyleHasBeenSet="1"/><prefs><pref name="fieldType" value="Field"/></prefs></data>`

            // Split content into chunks of 255 characters (DOCX limit)
            const chunkSize = 255
            const chunks = []
            for (let i = 0; i < dataContent.length; i += chunkSize) {
                chunks.push(dataContent.substring(i, i + chunkSize))
            }

            // Create properties for each chunk
            chunks.forEach((chunk, index) => {
                const propName = `ZOTERO_PREF_${index + 1}`
                const propertyXML = `<property fmtid="{D5CDD505-2E9C-101B-9397-08002B2CF9AE}" pid="${maxPid + index + 1}" name="${propName}">
<vt:lpwstr></vt:lpwstr>
</property>`
                propertiesEl.appendXML(propertyXML)
                // Set the text content after appending (textContent escapes XML characters)
                const lpwstrEl =
                    propertiesEl.lastElementChild.query("vt:lpwstr")
                if (lpwstrEl) {
                    lpwstrEl.textContent = chunk
                }
            })
        }

        return Promise.resolve()
    }
}

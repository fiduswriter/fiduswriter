import {parseCSL} from "biblatex-csl-converter"

import {xmlDOM} from "../../exporter/tools/xml"

export class OdtConvert {
    constructor(
        contentXml,
        stylesXml,
        manifestXml,
        importId,
        template,
        bibliography
    ) {
        this.importId = importId
        this.template = template
        this.bibliography = bibliography
        this.images = {}
        this.styles = {}

        this.contentDoc = contentXml ? xmlDOM(contentXml) : null
        this.stylesDoc = stylesXml ? xmlDOM(stylesXml) : null
        this.manifestDoc = manifestXml ? xmlDOM(manifestXml) : null
    }

    init() {
        this.parseStyles()

        return {
            content: this.convert(),
            settings: {
                import_id: this.importId,
                tracked: false,
                language: this.detectLanguage()
            }
        }
    }

    parseStyles() {
        if (!this.stylesDoc) {
            return
        }
        const styleNodes = this.stylesDoc.queryAll("style:style")
        styleNodes.forEach(node => {
            const styleName = node.getAttribute("style:name")
            this.styles[styleName] = this.parseStyle(node)
        })
    }

    parseStyle(styleNode) {
        const properties = {}

        // Get parent style name if it exists
        properties.parentStyleName = styleNode.getAttribute(
            "style:parent-style-name"
        )

        // Check if this is a section style
        properties.isSection =
            styleNode.getAttribute("style:family") === "section" ||
            Boolean(styleNode.query("style:section-properties"))

        // Get style title/display name
        properties.title = styleNode.getAttribute("style:display-name")

        // Check if it's a heading style
        properties.isHeading =
            styleNode.getAttribute("style:family") === "paragraph" &&
            (styleNode
                .getAttribute("style:name")
                .toLowerCase()
                .includes("heading") ||
                properties.parentStyleName?.toLowerCase().includes("heading"))

        // Parse text properties
        const textProperties = styleNode.query("style:text-properties")
        if (textProperties) {
            if (textProperties.getAttribute("fo:font-weight") === "bold") {
                properties.bold = true
            }
            if (textProperties.getAttribute("fo:font-style") === "italic") {
                properties.italic = true
            }
        }

        // Parse paragraph properties
        const paragraphProperties = styleNode.query(
            "style:paragraph-properties"
        )
        if (paragraphProperties) {
            properties.margin = {
                top: this.convertLength(
                    paragraphProperties.getAttribute("fo:margin-top")
                ),
                bottom: this.convertLength(
                    paragraphProperties.getAttribute("fo:margin-bottom")
                ),
                left: this.convertLength(
                    paragraphProperties.getAttribute("fo:margin-left")
                ),
                right: this.convertLength(
                    paragraphProperties.getAttribute("fo:margin-right")
                )
            }
        }

        return properties
    }

    convert() {
        const templateParts = this.template.content.content.slice()
        templateParts.shift()

        const document = {
            type: "doc",
            attrs: {
                import_id: this.importId
            },
            content: []
        }

        // Add title (required first element)
        const titleText = this.extractTitle() || gettext("Untitled")
        document.content.push({
            type: "title",
            content: [
                {
                    type: "text",
                    text: titleText
                }
            ]
        })

        // Get all content sections from the ODT
        const body = this.contentDoc.query("office:text")
        if (!body) {
            return document
        }

        // Look for metadata sections first (author, abstract, etc.)
        const metadataContent = this.extractMetadata()
        metadataContent.forEach(({type, attrs, content}) => {
            const templatePart = templateParts.find(
                part => part.attrs.metadata === type
            )
            if (templatePart) {
                document.content.push({
                    type: templatePart.type,
                    attrs: {
                        ...templatePart.attrs,
                        ...attrs
                    },
                    content
                })
            }
        })

        // Group remaining content by sections based on style names/titles
        const sections = this.groupContentIntoSections(body)

        // Map ODT sections to template parts
        sections.forEach(section => {
            // Find matching template part
            const templatePart = this.findMatchingTemplatePart(
                section.title,
                templateParts
            )

            if (templatePart) {
                // If template part found, use its configuration
                document.content.push({
                    type: "richtext_part",
                    attrs: {
                        title: templatePart.attrs.title,
                        id: templatePart.attrs.id,
                        metadata: templatePart.attrs.metadata || undefined,
                        marks: templatePart.attrs.marks || [
                            "strong",
                            "em",
                            "link"
                        ]
                    },
                    content: section.content
                })
            }
        })

        // Add remaining content to body section
        const unassignedContent = sections
            .filter(
                section =>
                    !this.findMatchingTemplatePart(section.title, templateParts)
            )
            .flatMap(section => section.content)

        if (unassignedContent.length) {
            // Find default body template part
            const bodyTemplatePart = templateParts.find(
                part => !part.attrs.metadata && part.type === "richtext_part"
            )

            document.content.push({
                type: "richtext_part",
                attrs: {
                    title: bodyTemplatePart
                        ? bodyTemplatePart.attrs.title
                        : "Body",
                    id: bodyTemplatePart ? bodyTemplatePart.attrs.id : "body",
                    marks: ["strong", "em", "link"]
                },
                content: unassignedContent
            })
        }

        return document
    }

    extractMetadata() {
        const metadata = []

        // Extract authors if present
        const authors = this.extractAuthors()
        if (authors.length) {
            metadata.push({
                type: "authors",
                content: authors.map(author => ({
                    type: "contributor",
                    attrs: author
                }))
            })
        }

        // Extract abstract if present
        const abstract = this.extractAbstract()
        if (abstract.length) {
            metadata.push({
                type: "abstract",
                content: abstract
            })
        }

        // Extract keywords if present
        const keywords = this.extractKeywords()
        if (keywords.length) {
            metadata.push({
                type: "keywords",
                content: keywords
            })
        }

        return metadata
    }

    extractAuthors() {
        const authors = []

        // Try to find author information in metadata
        const metaAuthors = this.contentDoc.queryAll("meta:user-defined", {
            "meta:name": "author"
        })
        metaAuthors.forEach(authorMeta => {
            const authorText = authorMeta.textContent
            const [firstname = "", lastname = ""] = authorText.split(" ", 2)
            authors.push({
                firstname,
                lastname,
                email: "",
                institution: ""
            })
        })

        // Also check for creator in document metadata
        const creator = this.contentDoc.query("meta:creator")
        if (creator && !authors.length) {
            const [firstname = "", lastname = ""] = creator.textContent.split(
                " ",
                2
            )
            authors.push({
                firstname,
                lastname,
                email: "",
                institution: ""
            })
        }

        return authors
    }

    extractAbstract() {
        // Look for section titled "Abstract" or with abstract style
        const abstractSection =
            this.contentDoc.query("text:section", {
                "text:style-name": "Abstract"
            }) ||
            this.contentDoc.query("text:h", {
                "text:outline-level": "1"
            }) // Then check content for "Abstract"

        if (
            abstractSection &&
            (abstractSection.getAttribute("text:style-name") === "Abstract" ||
                abstractSection.textContent.includes("Abstract"))
        ) {
            return this.convertContainer(abstractSection)
        }

        return []
    }

    extractKeywords() {
        // Look for keywords section or metadata
        const keywordsSection =
            this.contentDoc.query("text:p", {"text:style-name": "Keywords"}) ||
            this.contentDoc.query("meta:user-defined", {
                "meta:name": "keywords"
            })

        if (keywordsSection) {
            return [
                {
                    type: "paragraph",
                    content: [
                        {
                            type: "text",
                            text: keywordsSection.textContent
                        }
                    ]
                }
            ]
        }

        return []
    }

    findMatchingTemplatePart(sectionTitle, templateParts) {
        if (!sectionTitle) {
            return null
        }

        // Try exact match first
        let matchingPart = templateParts.find(
            part =>
                part.type === "richtext_part" &&
                !part.attrs.metadata &&
                part.attrs.title.toLowerCase() === sectionTitle.toLowerCase()
        )

        if (!matchingPart) {
            // Try fuzzy matching if exact match fails
            matchingPart = templateParts.find(
                part =>
                    part.type === "richtext_part" &&
                    !part.attrs.metadata &&
                    this.isSimilarTitle(part.attrs.title, sectionTitle)
            )
        }

        return matchingPart
    }

    isSimilarTitle(title1, title2) {
        // Remove special characters and extra spaces
        const normalize = str =>
            str
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .trim()

        const normalized1 = normalize(title1)
        const normalized2 = normalize(title2)

        // Check if one string contains the other
        return (
            normalized1.includes(normalized2) ||
            normalized2.includes(normalized1)
        )
    }

    extractTitle() {
        // First try to find paragraph with Title style
        const titleParagraph = this.contentDoc.query("text:p", {
            "text:style-name": "Title"
        })
        if (titleParagraph) {
            titleParagraph.parentElement.removeChild(titleParagraph)
            return titleParagraph.textContent
        }

        // Fall back to first heading
        const titleHeading = this.contentDoc.query("text:h", {
            "text:outline-level": "1"
        })
        if (titleHeading) {
            titleHeading.parentElement.removeChild(titleHeading)
            return titleHeading.textContent
        }

        // Check for other common title style names
        const commonTitleStyles = [
            "title",
            "doctitle",
            "document-title",
            "heading-title"
        ]
        for (const styleName of commonTitleStyles) {
            const titleElement = this.contentDoc.query("text:p", {
                "text:style-name": styleName
            })
            if (titleElement) {
                titleElement.parentElement.removeChild(titleElement)
                return titleElement.textContent
            }
        }

        // Check style properties for title-like formatting
        const firstParagraph = this.contentDoc.query("text:p")
        if (firstParagraph) {
            const styleName = firstParagraph.getAttribute("text:style-name")
            const style = this.styles[styleName]

            if (style && this.isTitleStyle(style)) {
                // Remove this node from the document so it's not processed again
                firstParagraph.parentNode.removeChild(firstParagraph)
                return firstParagraph.textContent
            }
        }

        return gettext("Untitled")
    }

    isTitleStyle(style) {
        // Check if style or its parent has characteristics of a title style
        if (!style) {
            return false
        }

        // Check style name
        if (style.title?.toLowerCase().includes("title")) {
            return true
        }

        // Check text properties for title-like formatting
        const textProps = style.textProperties
        if (textProps) {
            // Title usually has larger font size and/or bold weight
            if (textProps.fontSize > 14 || textProps.fontWeight === "bold") {
                return true
            }
        }

        // Check paragraph properties
        const paraProps = style.paragraphProperties
        if (paraProps) {
            // Titles are often centered and have larger margins
            if (
                paraProps.textAlign === "center" ||
                (paraProps.marginTop > 0.5 && paraProps.marginBottom > 0.5)
            ) {
                return true
            }
        }

        // Check parent style if exists
        if (style.parentStyleName) {
            const parentStyle = this.styles[style.parentStyleName]
            return this.isTitleStyle(parentStyle)
        }

        return false
    }

    getSectionTitle(node, styleName) {
        if (!node || !styleName) {
            return null
        }

        // For headings, use the text content as section title
        if (node.tagName === "text:h") {
            // Get the heading level
            const level = parseInt(node.getAttribute("text:outline-level")) || 1

            // Only use level 1 and 2 headings as section titles
            if (level <= 2) {
                return node.textContent.trim()
            }
        }

        // Check if the style indicates a section title
        const style = this.styles[styleName]
        if (style) {
            // Check for explicit section title style
            if (
                style.title ||
                styleName.toLowerCase().includes("section") ||
                styleName.toLowerCase().includes("title")
            ) {
                // If it's a styled paragraph, use its content as title
                if (node.tagName === "text:p") {
                    return node.textContent.trim()
                }
            }

            // Check if it's a custom section style
            const parentStyle = style.parentStyleName
                ? this.styles[style.parentStyleName]
                : null
            if (parentStyle?.isSection) {
                return node.textContent.trim()
            }
        }

        // For text:section elements, check for section-name attribute
        if (node.tagName === "text:section") {
            const sectionName = node.getAttribute("text:name")
            if (sectionName) {
                return this.formatSectionName(sectionName)
            }
        }

        return null
    }

    formatSectionName(name) {
        // Remove common suffixes
        name = name.replace(/_?(section|part|chapter)$/i, "")

        // Split by underscores or hyphens
        const words = name.split(/[_-]/)

        // Capitalize first letter of each word and join
        return words
            .map(
                word =>
                    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" ")
            .trim()
    }

    groupContentIntoSections(body) {
        const sections = []
        let currentSection = {
            title: null,
            content: []
        }

        body.children.forEach(node => {
            const styleName = node.getAttribute("text:style-name")
            const title = this.getSectionTitle(node, styleName)

            if (title && this.isHeadingStyle(styleName)) {
                // Start new section
                if (currentSection.content.length) {
                    sections.push(currentSection)
                }
                currentSection = {
                    title: title,
                    content: []
                }
            }

            const converted = this.convertNode(node)
            if (converted) {
                currentSection.content.push(converted)
            }
        })

        // Add final section
        if (currentSection.content.length) {
            sections.push(currentSection)
        }

        return sections
    }

    isHeadingStyle(styleName) {
        if (!styleName) {
            return false
        }

        const style = this.styles[styleName]
        if (!style) {
            return false
        }

        // Check multiple indicators that this might be a heading style
        return (
            // Direct heading indicators
            style.isHeading ||
            styleName.toLowerCase().includes("heading") ||
            styleName.toLowerCase().includes("title") ||
            // Check outline level property
            Boolean(style.outlineLevel) ||
            // Check if it's derived from a heading style
            (style.parentStyleName &&
                this.isHeadingStyle(style.parentStyleName)) ||
            // Check specific formatting that's typical for headings
            (style.paragraphProperties &&
                // Larger margins than normal paragraphs
                (style.paragraphProperties.marginTop > 0.3 ||
                    style.paragraphProperties.marginBottom > 0.3 ||
                    // Different alignment
                    style.paragraphProperties.textAlign === "center")) ||
            // Check text properties typical for headings
            (style.textProperties &&
                // Larger font size
                (style.textProperties.fontSize > 12 ||
                    // Bold text
                    style.textProperties.fontWeight === "bold" ||
                    // Different font family
                    style.textProperties.fontFamily))
        )
    }

    convertBody() {
        const body = this.contentDoc.query("office:text")
        if (!body) {
            return []
        }
        return this.convertContainer(body)
    }

    convertContainer(container) {
        return container.children
            .map(node => this.convertNode(node))
            .filter(node => node)
    }

    convertNode(node) {
        switch (node.tagName) {
            case "text:p":
                return this.convertParagraph(node)
            case "text:h":
                return this.convertHeading(node)
            case "text:list":
                return this.convertList(node)
            case "draw:frame":
                return this.convertImage(node)
            case "table:table":
                return this.convertTable(node)
            case "text:note":
                return this.convertFootnote(node)
            case "text:sequence-decls":
            case "office:forms":
                return null
            default:
                console.warn(`Unsupported node: ${node.tagName}`)
                return null
        }
    }

    convertParagraph(node) {
        return {
            type: "paragraph",
            content: this.convertTextContent(node)
        }
    }

    convertHeading(node) {
        const level = parseInt(node.getAttribute("text:outline-level")) || 1
        return {
            type: `heading${level}`,
            attrs: {
                id: "H" + Math.random().toString(36).substr(2, 7)
            },
            content: this.convertTextContent(node)
        }
    }

    convertTextContent(node) {
        const content = []
        let insideZoteroReferenceMark = false

        node.children.forEach(child => {
            if (child.tagName === "text:reference-mark-start") {
                // Store reference mark start for citation processing
                const name = child.getAttribute("text:name")
                if (name && name.startsWith("ZOTERO_ITEM CSL_CITATION")) {
                    insideZoteroReferenceMark = true
                }
            } else if (child.tagName === "text:reference-mark-end") {
                // Process citation when we hit the end mark
                const name = child.getAttribute("text:name")
                if (name && name.startsWith("ZOTERO_ITEM CSL_CITATION")) {
                    const citation = this.convertCitation(name)
                    if (citation) {
                        content.push(citation)
                    }
                    insideZoteroReferenceMark = false
                }
            } else if (!insideZoteroReferenceMark) {
                // Only process content that's not inside a reference mark
                if (child.tagName === "#text") {
                    content.push({
                        type: "text",
                        text: child.textContent
                    })
                } else if (child.tagName === "text:span") {
                    content.push(...this.convertSpan(child))
                } else if (child.tagName === "text:a") {
                    content.push(...this.convertLink(child))
                } else if (child.tagName === "text:note") {
                    const noteBody = child.query("text:note-body")
                    if (!noteBody) {
                        return
                    }

                    // Get the first paragraph in the footnote
                    const firstParagraph = noteBody.query("text:p")
                    if (!firstParagraph) {
                        return
                    }

                    // Check if this is a citation-only footnote
                    const referenceMarkStart = firstParagraph.query(
                        "text:reference-mark-start"
                    )
                    const referenceMarkEnd = firstParagraph.query(
                        "text:reference-mark-end"
                    )

                    if (
                        referenceMarkStart &&
                        referenceMarkEnd &&
                        referenceMarkStart
                            .getAttribute("text:name")
                            .startsWith("ZOTERO_ITEM CSL_CITATION") &&
                        // Check that there's no content outside the reference marks
                        firstParagraph.children.every(
                            child =>
                                child.tagName === "text:reference-mark-start" ||
                                child.tagName === "text:reference-mark-end" ||
                                (child.tagName === "text:span" &&
                                    child.previousElementSibling?.tagName ===
                                        "text:reference-mark-start" &&
                                    child.nextElementSibling?.tagName ===
                                        "text:reference-mark-end")
                        )
                    ) {
                        // If it's a citation-only footnote, convert it directly to a citation
                        const citationData =
                            referenceMarkStart.getAttribute("text:name")
                        const citation = this.convertCitation(citationData)
                        if (citation) {
                            content.push(citation)
                        }
                    } else {
                        // Otherwise, convert as regular footnote
                        content.push({
                            type: "footnote",
                            attrs: {
                                footnote: this.convertContainer(noteBody)
                            }
                        })
                    }
                } else {
                    console.warn(`Unhandled text content: ${child.tagName}`)
                }
            }
            // Skip any content while insideZoteroReferenceMark is true
        })
        return content
    }

    convertSpan(node) {
        const content = this.convertTextContent(node)
        const styleName = node.getAttribute("text:style-name")
        const style = this.styles[styleName]

        if (style?.bold) {
            return content.map(node => ({
                ...node,
                marks: [...(node.marks || []), {type: "strong"}]
            }))
        }
        if (style?.italic) {
            return content.map(node => ({
                ...node,
                marks: [...(node.marks || []), {type: "em"}]
            }))
        }
        return content
    }

    convertFootnote(node) {
        const noteBody = node.query("text:note-body")
        if (!noteBody) {
            return null
        }

        // Get the first paragraph in the footnote
        const firstParagraph = noteBody.query("text:p")
        if (!firstParagraph) {
            return null
        }

        // Check if this is a citation-only footnote
        const referenceMarkStart = firstParagraph.query(
            "text:reference-mark-start"
        )
        const referenceMarkEnd = firstParagraph.query("text:reference-mark-end")

        if (
            referenceMarkStart &&
            referenceMarkEnd &&
            referenceMarkStart
                .getAttribute("text:name")
                .startsWith("ZOTERO_ITEM CSL_CITATION") &&
            // Check that there's no content outside the reference marks
            firstParagraph.children.every(
                child =>
                    child.tagName === "text:reference-mark-start" ||
                    child.tagName === "text:reference-mark-end" ||
                    (child.tagName === "text:span" &&
                        child.previousElementSibling?.tagName ===
                            "text:reference-mark-start" &&
                        child.nextElementSibling?.tagName ===
                            "text:reference-mark-end")
            )
        ) {
            // If it's a citation-only footnote, convert it directly to a citation
            const citationData = referenceMarkStart.getAttribute("text:name")
            return this.convertCitation(citationData)
        }

        // Otherwise, convert as regular footnote
        return {
            type: "footnote",
            attrs: {
                footnote: this.convertContainer(noteBody)
            }
        }
    }

    convertCitation(citationData) {
        // Handle both string citation data and reference mark names
        if (typeof citationData !== "string") {
            // Existing citation node processing
            return this.convertCitationNode(citationData)
        }
        try {
            const jsonStr = citationData.replace(
                "ZOTERO_ITEM CSL_CITATION ",
                ""
            )

            // Parse the CSL citation data
            const lastBrace = jsonStr.lastIndexOf("}") + 1
            const cslData = JSON.parse(jsonStr.substring(0, lastBrace))

            // Create citation references
            const citations = cslData.citationItems
                .map(item => {
                    const id = String(item.itemData.id)

                    // Find in bibliography
                    let [bibKey, _] =
                        Object.entries(this.bibliography || {}).find(
                            ([_key, entry]) => entry.entry_key === id
                        ) || []

                    if (!bibKey && item.itemData) {
                        // Not yet present in bibliography. Parse the CSL data and add it.
                        const parseData = parseCSL({
                            [id]: item.itemData
                        })
                        const bibEntry = parseData["1"]
                        bibKey = `${Object.keys(this.bibliography || {}).length + 1}`
                        if (!this.bibliography) {
                            this.bibliography = {}
                        }
                        this.bibliography[bibKey] = bibEntry
                    }

                    return bibKey
                        ? {
                              id: bibKey,
                              prefix: item.prefix || "",
                              locator: item.locator || ""
                          }
                        : null
                })
                .filter(citation => citation)

            if (!citations.length) {
                return null
            }

            return {
                type: "citation",
                attrs: {
                    format: "cite", // Could be determined from properties if needed
                    references: citations
                }
            }
        } catch (error) {
            console.warn("Failed to parse CSL citation:", error)
            return null
        }
    }

    convertList(node) {
        const listStyle = node.getAttribute("text:style-name")
        const isOrdered = this.isOrderedList(listStyle)

        return {
            type: isOrdered ? "ordered_list" : "bullet_list",
            attrs: isOrdered ? {order: 1} : {},
            content: node.queryAll("text:list-item").map(item => ({
                type: "list_item",
                content: this.convertContainer(item)
            }))
        }
    }

    isOrderedList(styleName) {
        if (!this.stylesDoc) {
            return false
        }
        const listStyle = this.stylesDoc.query("text:list-style", {
            "style:name": styleName
        })
        return listStyle?.query("text:list-level-style-number") !== null
    }

    convertImage(node) {
        const imageElement = node.query("draw:image")
        if (!imageElement) {
            return null
        }

        const href = imageElement.getAttribute("xlink:href")
        if (!href) {
            return null
        }

        const imageId = Math.floor(Math.random() * 1000000)
        const width = this.convertLength(node.getAttribute("svg:width"))
        //const height = this.convertLength(node.getAttribute("svg:height"))

        this.images[imageId] = {
            id: imageId,
            title: href.split("/").pop(),
            copyright: {
                holder: false,
                year: false,
                freeToRead: true,
                licenses: []
            },
            image: href,
            file_type: this.getImageFileType(href),
            file: null,
            checksum: 0
        }

        const caption = node.query("text:p")
        const captionContent = caption ? this.convertTextContent(caption) : []

        return {
            type: "figure",
            attrs: {
                aligned: "center",
                width: Math.min(Math.round((width / 8.5) * 100), 100),
                caption: Boolean(captionContent.length)
            },
            content: [
                {
                    type: "image",
                    attrs: {
                        image: imageId
                    }
                },
                ...(captionContent.length
                    ? [
                          {
                              type: "figure_caption",
                              content: captionContent
                          }
                      ]
                    : [])
            ]
        }
    }

    convertLength(length) {
        if (!length) {
            return 0
        }

        // Match number and unit
        const match = length.match(/^(-?\d*\.?\d+)(pt|cm|mm|in|pc|px|%)?$/)
        if (!match) {
            return 0
        }

        const [_, value, unit = "pt"] = match
        const numValue = parseFloat(value)

        // Convert to inches first (as base unit)
        switch (unit) {
            case "pt": // points
                return numValue / 72
            case "pc": // picas (1 pica = 12 points)
                return (numValue * 12) / 72
            case "cm": // centimeters
                return numValue / 2.54
            case "mm": // millimeters
                return numValue / 25.4
            case "in": // inches
                return numValue
            case "px": // pixels (assuming 96 DPI)
                return numValue / 96
            case "%": // percentage (return as is)
                return numValue
            default:
                return 0
        }
    }

    convertTable(node) {
        return {
            type: "table",
            attrs: {
                width: 100,
                aligned: "center",
                layout: "fixed"
            },
            content: [
                {
                    type: "table_body",
                    content: node
                        .queryAll("table:table-row")
                        .map(row => this.convertTableRow(row))
                }
            ]
        }
    }

    convertTableRow(row) {
        return {
            type: "table_row",
            content: row
                .queryAll("table:table-cell")
                .map(cell => this.convertTableCell(cell))
        }
    }

    convertTableCell(cell) {
        return {
            type: "table_cell",
            attrs: {
                colspan:
                    parseInt(
                        cell.getAttribute("table:number-columns-spanned")
                    ) || 1,
                rowspan:
                    parseInt(cell.getAttribute("table:number-rows-spanned")) ||
                    1
            },
            content: this.convertContainer(cell)
        }
    }

    convertLink(node) {
        const href = node.getAttribute("xlink:href")
        const content = this.convertTextContent(node)
        return content.map(node => ({
            ...node,
            marks: [
                ...(node.marks || []),
                {
                    type: "link",
                    attrs: {href}
                }
            ]
        }))
    }

    detectLanguage() {
        // Try to detect document language in following order:
        // 1. From document content
        // 2. From document styles
        // 3. Default to "en-US"

        // Check content language
        if (this.contentDoc) {
            const langAttr =
                this.contentDoc.getAttribute("office:default-language") ||
                this.contentDoc.getAttribute("dc:language")
            if (langAttr) {
                return langAttr
            }

            const firstParagraph = this.contentDoc.query("text:p")
            if (firstParagraph) {
                const paraLang = firstParagraph.getAttribute("xml:lang")
                if (paraLang) {
                    return paraLang
                }
            }
        }

        // Check styles language
        if (this.stylesDoc) {
            const defaultStyle = this.stylesDoc.query("style:default-style")
            if (defaultStyle) {
                const styleLang =
                    defaultStyle.getAttribute("fo:language") ||
                    defaultStyle.getAttribute("style:language-complex")
                if (styleLang) {
                    return styleLang
                }
            }
        }

        // Default to "en-US"
        return "en-US"
    }
}

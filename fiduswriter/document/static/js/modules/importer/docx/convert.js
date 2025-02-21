import {xmlDOM} from "../../exporter/tools/xml"
import {randomFigureId, randomHeadingId} from "../../schema/common"
import {DocxParser} from "./parse"

export class DocxConvert {
    constructor(zip, importId, template, bibliography) {
        this.zip = zip
        this.importId = importId
        this.template = template
        this.bibliography = bibliography
        this.images = {}
        this.parser = new DocxParser(zip)
    }

    async init() {
        await this.parser.init()
        const body = this.parser.document.query("w:body")
        if (!body) {
            return {
                content: {
                    type: "doc",
                    content: []
                },
                settings: {
                    import_id: this.importId,
                    tracked: false,
                    language: "en-US"
                },
                comments: {}
            }
        }
        const convertedContent = this.convertDocument(body)
        // Convert document
        return {
            content: convertedContent,
            settings: {
                import_id: this.importId,
                tracked: this.hasTrackedChanges(this.parser.document),
                language: this.detectLanguage(this.parser.document)
            },
            comments: this.parser.comments
        }
    }

    convertDocument(body) {
        const templateParts = this.template.content.content.slice()
        templateParts.shift() // Remove first element

        const document = {
            type: "doc",
            attrs: {
                import_id: this.importId
            },
            content: []
        }
        // Add title (required first element)
        const title = this.extractTitle(body)
        document.content.push({
            type: "title",
            content: title.content || [
                {type: "text", text: gettext("Untitled")}
            ]
        })
        title.containerNodes.forEach(node => {
            node.parentElement.removeChild(node)
        })
        document.attrs.title =
            title.content.map(node => node.textContent).join("") ||
            gettext("Untitled")
        // Extract metadata sections
        const metadata = this.extractMetadata(body)
        metadata.forEach(({type, content}) => {
            const templatePart = templateParts.find(
                part => part.attrs.metadata === type
            )
            const attrs = {}
            if (templatePart.attrs.hidden) {
                attrs.hidden = false
            }
            if (templatePart) {
                document.content.push({
                    type: templatePart.type,
                    attrs: {
                        ...templatePart.attrs,
                        ...attrs
                    },
                    content: content.content
                })
                // Remove paragraphs from content so they are not added to body
                content.containerNodes.forEach(node => {
                    node.parentElement?.removeChild(node)
                })
            }
        })
        // Extract main content sections
        const sections = this.groupContentIntoSections(body)
        // Map sections to template parts
        sections.forEach(section => {
            const templatePart = this.findMatchingTemplatePart(
                section.title,
                templateParts
            )
            if (templatePart) {
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

    extractMetadata(body) {
        const metadata = []
        // Extract authors if present
        const authors = this.extractAuthors(body)
        if (authors.content.length) {
            metadata.push({
                type: "authors",
                content: authors
            })
        }
        // Extract abstract if present
        const abstract = this.extractAbstract(body)
        if (abstract.content.length) {
            metadata.push({
                type: "abstract",
                content: abstract
            })
        }

        // Extract keywords if present
        const keywords = this.extractKeywords(body)
        if (keywords.content.length) {
            metadata.push({
                type: "keywords",
                content: keywords
            })
        }
        return metadata
    }

    extractAuthors(body) {
        const authors = []

        // Try to find author information in metadata
        const authorNodes = body
            .queryAll("w:pStyle", {"w:val": "Author"})
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)
        authorNodes.forEach(authorNode => {
            const authorText = this.getTextContent(authorNode)
            const [firstname = "", lastname = ""] = authorText.split(" ", 2)
            authors.push({
                type: "contributor",
                attrs: {
                    firstname,
                    lastname,
                    email: "",
                    institution: ""
                }
            })
        })
        if (authors.length) {
            return {
                content: authors,
                containerNodes: authorNodes
            }
        }
        // Also check Creator in document properties
        const creator = this.parser.coreDoc.query("dc:creator")?.textContent

        if (creator) {
            const [firstname = "", lastname = ""] = creator.split(" ", 2)

            return {
                content: [
                    {
                        type: "contributor",
                        attrs: {
                            firstname,
                            lastname,
                            email: "",
                            institution: ""
                        }
                    }
                ],
                containerNodes: []
            }
        }
        return {content: [], containerNodes: []}
    }

    extractAbstract(body) {
        // Look for section with Abstract style or heading
        const abstractNodes = body
            .queryAll("w:pStyle", {"w:val": "Abstract"})
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)
        if (abstractNodes.length) {
            return {
                content: abstractNodes.map(abstractNode =>
                    this.convertBlock(abstractNode)
                ),
                containerNodes: abstractNodes
            }
        }
        const extractedPart = this.extractPartOnTitle(body, ["Abstract"])
        if (extractedPart.content.length) {
            return {
                content: extractedPart.content.map(abstractNode =>
                    this.convertBlock(abstractNode)
                ),
                containerNodes: extractedPart.content.concat([
                    extractedPart.header
                ])
            }
        }
        return {content: [], containerNodes: []}
    }

    extractKeywords(body) {
        let extraNodes = []
        // Look for keywords section or metadata
        let keywordNodes = body
            .queryAll("w:pStyle", {"w:val": "Keywords"})
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)

        if (!keywordNodes.length) {
            // If no keywords section is found, look for a title called "Keywords"
            const extractedPart = this.extractPartOnTitle(
                body,
                ["Keywords", "Keywords:", "Keyword"],
                1
            )

            if (extractedPart.content.length) {
                keywordNodes = extractedPart.content
                extraNodes = extractedPart.header ? [extractedPart.header] : []
            }
        }

        if (keywordNodes) {
            return {
                content: keywordNodes
                    .map(keywordsNode => this.getTextContent(keywordsNode))
                    .flatMap(str => str.split(/[,;|:]+/)) // Split on multiple separators
                    .map(keyword => keyword.trim()) // Trim whitespace
                    .filter(keyword => keyword.length > 0)
                    .map(keyword => ({
                        type: "tag",
                        attrs: {
                            tag: keyword
                        }
                    })),
                containerNodes: keywordNodes.concat(extraNodes)
            }
        }

        return {content: [], containerNodes: []}
    }

    extractPartOnTitle(body, titleWords, maxPars = false) {
        // Fall back to heading starting with TITLEWORD in text
        if (typeof titleWords === "string") {
            titleWords = [titleWords]
        }
        const headingPars = body
            .queryAll("w:pStyle", {
                "w:val": [
                    "Heading1",
                    "Heading2",
                    "Heading3",
                    "Heading4",
                    "Heading5",
                    "Heading6",
                    "Heading7",
                    "Heading8",
                    "Heading9"
                ]
            })
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)
        const header = headingPars.find(p =>
            titleWords.includes(this.getTextContent(p).trim())
        )
        const content = []
        if (header && header.nextSibling) {
            //const content = []
            //const containerNodes = [sectionHeader]
            const headerLevel = this.getParaStyle(header).level
            let searchPar = header

            // Add everything to abstract until next heading with the same or lower level
            while (
                searchPar.nextSibling &&
                (!maxPars || content.length < maxPars)
            ) {
                searchPar = searchPar.nextSibling
                const paraStyle = this.getParaStyle(searchPar)
                if (paraStyle.isHeading && paraStyle.level <= headerLevel) {
                    break
                }
                content.push(searchPar)
            }
        }

        return {header, content}
    }

    groupContentIntoSections(body) {
        const sections = []
        let currentSection = {
            title: null,
            content: []
        }

        const skippedBlocks = []

        body.children.forEach(node => {
            if (skippedBlocks.includes(node)) {
                return
            }
            if (node.tagName !== "w:p") {
                return
            }

            const style = this.getParaStyle(node)
            const title = this.getSectionTitle(node, style)
            if (title && style.isHeading) {
                if (currentSection.content.length) {
                    sections.push(currentSection)
                }
                currentSection = {
                    title,
                    content: []
                }
            }

            const block = this.convertBlock(node, skippedBlocks)
            if (block) {
                currentSection.content.push(block)
            }
        })

        if (currentSection.content.length) {
            sections.push(currentSection)
        }

        return sections
    }

    getSectionTitle(node, style) {
        if (!node || !style) {
            return null
        }

        // For headings, use text content as section title
        if (style.isHeading && style.level <= 4) {
            return this.getTextContent(node)
        }

        // Check style name for section indicators
        if (style.name) {
            const name = style.name.toLowerCase()
            if (name.includes("section") || name.includes("title")) {
                return this.getTextContent(node)
            }
        }

        return null
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
            // Try fuzzy matching
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
        const normalize = str =>
            str
                .toLowerCase()
                .replace(/[^a-z0-9]/g, "")
                .trim()

        const normalized1 = normalize(title1)
        const normalized2 = normalize(title2)

        return (
            normalized1.includes(normalized2) ||
            normalized2.includes(normalized1)
        )
    }

    getTextContent(node) {
        return node
            .queryAll("w:t")
            .map(t => t.textContent)
            .join("")
    }

    extractTitle(body) {
        // First try to find paragraph with Title style
        const titlePars = body
            .queryAll("w:pStyle", {"w:val": "Title"})
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)

        if (titlePars.length) {
            return {
                content: this.convertInline(titlePars[0]),
                containerNodes: [titlePars[0]]
            }
        }

        // Fall back to first heading
        const headingPars = body
            .queryAll("w:pStyle", {
                "w:val": [
                    "Heading1",
                    "Heading2",
                    "Heading3",
                    "Heading4",
                    "Heading5",
                    "Heading6",
                    "Heading7",
                    "Heading8",
                    "Heading9"
                ]
            })
            .map(pStyle => pStyle.closest("w:p"))
            .filter(p => p)
        if (headingPars.length) {
            return {
                content: this.convertInline(headingPars[0]),
                containerNodes: [headingPars[0]]
            }
        }

        return {
            content: [
                {
                    type: "text",
                    text: gettext("Untitled")
                }
            ],
            containerNodes: []
        }
    }

    convertBlock(node, skippedBlocks = []) {
        if (node.tagName !== "w:p") {
            return null
        }

        const style = this.getParaStyle(node)
        if (style.isHeading) {
            return this.convertHeading(node, style)
        }

        if (style.numbering) {
            return this.convertListItem(node, style)
        }

        if (
            style.isCaption &&
            (node.query("w:drawing") || node.query("w:pict"))
        ) {
            return this.convertFigure(node, node)
        }

        if (
            style.isCaption &&
            (node.nextSibling?.query("w:drawing") ||
                node.nextSibling?.query("w:pict")) &&
            !skippedBlocks.includes(node.nextSibling)
        ) {
            skippedBlocks.push(node.nextSibling)
            return this.convertFigure(node.nextSibling, node)
        }

        if (node.query("w:drawing") || node.query("w:pict")) {
            if (
                node.nextSibling &&
                this.getParaStyle(node.nextSibling).isCaption
            ) {
                skippedBlocks.push(node.nextSibling)
                return this.convertFigure(node, node.nextSibling)
            }
            return this.convertFigure(node)
        }
        return this.convertParagraph(node)
    }

    getParaStyle(node) {
        const pStyle = node.query("w:pStyle")
        const styleId = pStyle?.getAttribute("w:val")
        const style = this.parser.styles[styleId] || {}

        const numPr = node.query("w:numPr")
        const numId = numPr?.query("w:numId")?.getAttribute("w:val")
        const ilvl = parseInt(
            numPr?.query("w:ilvl")?.getAttribute("w:val") || "0"
        )

        return {
            ...style,
            numbering: numId
                ? {
                      id: numId,
                      level: ilvl,
                      definition: this.parser.numbering[numId]
                  }
                : null
        }
    }

    convertParagraph(node) {
        return {
            type: "paragraph",
            content: this.convertInline(node)
        }
    }

    convertHeading(node, style) {
        return {
            type: `heading${style.level}`,
            attrs: {
                id: randomHeadingId(),
                level: style.level
            },
            content: this.convertInline(node)
        }
    }

    convertListItem(node, style) {
        const numbering = style.numbering
        const level = numbering.definition?.levels[numbering.level]

        return {
            type: level?.format === "bullet" ? "bullet_list" : "ordered_list",
            attrs: {
                id: `L${Math.random().toString(36).slice(2)}`,
                level: numbering.level,
                start: level?.start || 1
            },
            content: [
                {
                    type: "list_item",
                    content: [this.convertParagraph(node)]
                }
            ]
        }
    }

    convertFigure(node, captionNode = null) {
        let captionBlock, captionOrder
        if (captionNode) {
            captionBlock = this.convertParagraph(captionNode)
            captionOrder = node.nextSibling === captionNode ? "after" : "before"
        }

        const drawing = node.query("w:drawing")
        if (!drawing) {
            return null
        }

        const blip = drawing.query("a:blip")
        if (!blip) {
            return null
        }

        const rId = blip.getAttribute("r:embed")
        const rel = this.parser.relationships[rId]
        if (!rel) {
            return null
        }

        const imagePath = rel.target.split("/").pop()
        const imageBlob = this.parser.images[imagePath]

        if (!imageBlob) {
            return null
        }

        // <a:ext cx="5753598" cy="4463556" />
        //
        const size = drawing.query("a:ext")
        const width = parseInt(size.getAttribute("cx") || 0) / 9525 // In EMUs
        const height = parseInt(size.getAttribute("cy") || 0) / 9525 // In EMUs

        const imageId = Math.floor(Math.random() * 1000000)
        this.images[imageId] = {
            id: imageId,
            title: imagePath,
            image: imagePath,
            file: imageBlob,

            copyright: {
                holder: false,
                year: false,
                freeToRead: true,
                licenses: []
            },
            checksum: 0,
            width,
            height
        }

        const image = {
            type: "image",
            attrs: {
                image: imageId
            }
        }

        const caption = {
            type: "figure_caption",
            content: captionBlock?.content || []
        }

        const content =
            captionOrder === "before" ? [caption, image] : [image, caption]

        return {
            type: "figure",
            attrs: {
                id: randomFigureId(),
                aligned: "center",
                width: 100,
                caption: !!captionBlock
            },
            content
        }
    }

    convertInline(node) {
        const content = []
        node.queryAll("w:r").forEach(run => {
            const text = run.query("w:t")?.textContent
            if (!text) {
                return
            }

            const rPr = run.query("w:rPr")
            const formatting = rPr ? this.parser.extractRunProperties(rPr) : {}

            content.push({
                type: "text",
                text,
                marks: this.createMarksFromFormatting(formatting)
            })
        })
        return content
    }

    createMarksFromFormatting(formatting) {
        const marks = []
        if (formatting.bold) {
            marks.push({type: "strong"})
        }
        if (formatting.italic) {
            marks.push({type: "em"})
        }
        if (formatting.underline) {
            marks.push({type: "underline"})
        }
        return marks
    }

    hasTrackedChanges(doc) {
        return Boolean(doc.query("w:ins") || doc.query("w:del"))
    }

    detectLanguage(doc) {
        return doc.query("w:lang")?.getAttribute("w:val") || "en-US"
    }
}

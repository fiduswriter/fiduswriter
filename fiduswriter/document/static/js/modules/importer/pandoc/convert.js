import {applyMarkToNodes, mergeTextNodes} from "./helpers"

export class PandocConvert {
    constructor(doc, importId) {
        this.doc = doc
        this.importId = importId
        this.citations = []
        this.imageIds = []
    }

    init() {
        try {
            this.validatePandocFormat()
        } catch (error) {
            console.error("Pandoc format validation failed:", error)
            throw new Error("Invalid Pandoc document format: " + error.message)
        }

        return {
            content: this.convert(),
            settings: {
                //documentstyle: "elephant",
                //template: "Standard Article",
                import_id: this.importId,
                //citationstyle: "apa",
                tracked: false,
                language: this.doc.meta?.lang?.c?.[0]?.c || "en-US"
            }
        }
    }

    validatePandocFormat() {
        // Check API version (Pandoc uses [major, minor, patch])
        if (
            !Array.isArray(this.doc["pandoc-api-version"]) ||
            this.doc["pandoc-api-version"].length !== 3 ||
            !this.doc["pandoc-api-version"].every(
                num => typeof num === "number"
            )
        ) {
            throw new Error("Invalid or missing Pandoc API version")
        }

        // Check for required top-level properties
        if (!this.doc.blocks || !Array.isArray(this.doc.blocks)) {
            throw new Error("Missing or invalid blocks property")
        }

        // Check meta property structure if it exists
        if (this.doc.meta && typeof this.doc.meta !== "object") {
            throw new Error("Invalid meta property")
        }

        // Basic validation of block structure
        if (
            !this.doc.blocks.every(
                block =>
                    block &&
                    typeof block === "object" &&
                    typeof block.t === "string" &&
                    ("c" in block || block.t === "Null")
            )
        ) {
            throw new Error("Invalid block structure")
        }

        return true
    }

    convert() {
        // Create the outer document structure
        const document = {
            type: "doc",
            attrs: {
                //documentstyle: "elephant",
                //template: "Standard Article",
                import_id: this.importId
            },
            content: []
        }

        // Add title (required first element)
        document.content.push({
            type: "title",
            content: this.convertInlines(
                this.doc.meta?.title?.c || [{t: "Str", c: "Untitled"}]
            )
        })

        // Add subtitle if present
        if (this.doc.meta?.subtitle?.c) {
            document.content.push({
                type: "heading_part",
                attrs: {
                    title: "Subtitle",
                    id: "subtitle",
                    metadata: "subtitle"
                },
                content: [
                    {
                        type: "heading1",
                        attrs: {
                            id: "H" + Math.random().toString(36).substr(2, 7)
                        },
                        content: this.convertInlines(this.doc.meta.subtitle.c)
                    }
                ]
            })
        }

        // Add authors if present
        if (this.doc.meta?.author?.c) {
            document.content.push({
                type: "contributors_part",
                attrs: {
                    title: "Authors",
                    id: "authors",
                    metadata: "authors"
                },
                content: this.doc.meta.author.c.map(author => ({
                    type: "contributor",
                    attrs: this.convertContributor(author)
                }))
            })
        }

        // Add abstract if present
        if (this.doc.meta?.abstract?.c) {
            document.content.push({
                type: "richtext_part",
                attrs: {
                    title: "Abstract",
                    id: "abstract",
                    metadata: "abstract"
                },
                content: this.convertBlocks(this.doc.meta.abstract.c)
            })
        }

        // Add main body content
        document.content.push({
            type: "richtext_part",
            attrs: {
                title: "Body",
                id: "body",
                marks: ["strong", "em", "link"]
            },
            content: this.convertBlocks(this.doc.blocks)
        })

        return document
    }

    convertMetadata(meta, output) {
        if (!output.content) {
            output.content = []
        }

        // Convert title
        if (meta.title) {
            output.content.unshift({
                type: "title",
                content: this.convertInlines(meta.title.c)
            })
        }

        // Convert subtitle if present
        if (meta.subtitle) {
            output.content.push({
                type: "heading_part",
                attrs: {
                    metadata: "subtitle",
                    id: "subtitle"
                },
                content: [
                    {
                        type: "paragraph",
                        content: this.convertInlines(meta.subtitle.c)
                    }
                ]
            })
        }

        // Convert abstract
        if (meta.abstract) {
            output.content.push({
                type: "richtext_part",
                attrs: {
                    metadata: "abstract",
                    id: "abstract"
                },
                content: this.convertBlocks(meta.abstract.c)
            })
        }

        // Convert authors
        if (meta.author?.c?.length) {
            const authors = {
                type: "contributors_part",
                attrs: {
                    metadata: "authors",
                    id: "authors"
                },
                content: meta.author.c.map(author =>
                    this.convertContributor(author)
                )
            }
            output.content.push(authors)
        }
    }

    convertContributor(author) {
        const attrs = {
            firstname: "",
            lastname: "",
            email: "",
            institution: ""
        }

        // Extract name components
        if (author.c) {
            const textParts = author.c
                .filter(part => part.t === "Str")
                .map(part => part.c)

            if (textParts.length > 1) {
                attrs.lastname = textParts.pop()
                attrs.firstname = textParts.join(" ")
            } else if (textParts.length === 1) {
                attrs.lastname = textParts[0]
            }

            // Extract email from notes if present
            const note = author.c.find(part => part.t === "Note")
            if (note) {
                attrs.email = this.convertInlines(note.c[0].c)
                    .map(node => node.text)
                    .join("")
            }
        }

        return attrs
    }

    convertBlocks(blocks) {
        if (!blocks) {
            return []
        }
        return blocks
            .map(block => this.convertBlock(block))
            .filter(block => block)
    }

    convertBlock(block) {
        switch (block.t) {
            case "Para":
                return {
                    type: "paragraph",
                    content: this.convertInlines(block.c)
                }
            case "Header":
                return {
                    type: `heading${block.c[0]}`,
                    attrs: {
                        id: block.c[1][0]
                    },
                    content: this.convertInlines(block.c[2])
                }
            case "BlockQuote":
                return {
                    type: "blockquote",
                    content: this.convertBlocks(block.c)
                }
            case "BulletList":
                return {
                    type: "bullet_list",
                    content: block.c.map(item => ({
                        type: "list_item",
                        content: this.convertBlocks(item)
                    }))
                }
            case "OrderedList":
                return {
                    type: "ordered_list",
                    attrs: {
                        order: block.c[0][0]
                    },
                    content: block.c[1].map(item => ({
                        type: "list_item",
                        content: this.convertBlocks(item)
                    }))
                }
            case "Table":
                return this.convertTable(block)
            case "Figure":
                return this.convertFigure(block)
            default:
                console.warn(`Unhandled block type: ${block.t}`)
                return null
        }
    }

    convertInlines(inlines) {
        if (!inlines) {
            return []
        }
        // Convert each inline element, flatten, and merge adjacent text nodes with same marks
        const convertedNodes = inlines
            .map(inline => this.convertInline(inline))
            .filter(inline => inline)
            .flat()

        return mergeTextNodes(convertedNodes)
    }

    convertInline(inline) {
        if (!inline) {
            return null
        }

        switch (inline.t) {
            case "Str":
                return {
                    type: "text",
                    text: inline.c
                }
            case "Space":
                return {
                    type: "text",
                    text: " "
                }
            case "Strong": {
                const innerNodes = this.convertInlines(inline.c)
                return mergeTextNodes(applyMarkToNodes(innerNodes, "strong"))
            }
            case "Emph": {
                const innerNodes = this.convertInlines(inline.c)
                return mergeTextNodes(applyMarkToNodes(innerNodes, "em"))
            }
            case "Underline": {
                const innerNodes = this.convertInlines(inline.c)
                return mergeTextNodes(applyMarkToNodes(innerNodes, "underline"))
            }
            case "Link": {
                const innerNodes = this.convertInlines(inline.c[1])
                return mergeTextNodes(
                    applyMarkToNodes(innerNodes, "link", {href: inline.c[2][0]})
                )
            }
            case "Cite":
                return this.convertCitation(inline)
            case "Math":
                return {
                    type: "equation",
                    attrs: {
                        equation: inline.c[1]
                    }
                }
            default:
                console.warn(`Unhandled inline type: ${inline.t}`)
                return null
        }
    }

    convertTable(table) {
        const attrs = {
            width: 100,
            aligned: "center",
            layout: "fixed"
        }

        // Extract table attributes
        const tableAttrs = table.c[0][2]
        tableAttrs.forEach(attr => {
            if (attr[0] === "width") {
                attrs.width = parseInt(attr[1])
            } else if (attr[0] === "aligned") {
                attrs.aligned = attr[1]
            } else if (attr[0] === "layout") {
                attrs.layout = attr[1]
            }
        })

        const rows = table.c[4][0][2].concat(table.c[4][0][3])

        return {
            type: "table",
            attrs,
            content: [
                {
                    type: "table_body",
                    content: rows.map(row => ({
                        type: "table_row",
                        content: row[1].map(cell => ({
                            type: "table_cell",
                            attrs: {
                                colspan: cell[3],
                                rowspan: cell[2]
                            },
                            content: this.convertBlocks(cell[4])
                        }))
                    }))
                }
            ]
        }
    }

    convertFigure(figure) {
        const attrs = {
            aligned: "center",
            width: 100,
            figureCategory: "none"
        }

        // Extract figure attributes
        const figureAttrs = figure.c[0][2]
        figureAttrs.forEach(attr => {
            if (attr[0] === "width") {
                attrs.width = parseInt(attr[1])
            } else if (attr[0] === "aligned") {
                attrs.aligned = attr[1]
            } else if (attr[0] === "category") {
                attrs.figureCategory = attr[1]
            }
        })

        return {
            type: "figure",
            attrs,
            content: [
                {
                    type: "image",
                    attrs: {
                        image: figure.c[2][0].c[0].c[2][0]
                    }
                }
            ].concat(
                figure.c[1][1].length
                    ? [
                          {
                              type: "figure_caption",
                              content: this.convertBlocks(figure.c[1][1])
                          }
                      ]
                    : []
            )
        }
    }

    convertCitation(cite) {
        const references = cite.c[0].map(ref => ({
            id: ref.citationId,
            prefix: ref.citationPrefix.map(prefix => prefix.c).join(" "),
            locator: ref.citationSuffix.map(suffix => suffix.c).join(" ")
        }))

        return {
            type: "citation",
            attrs: {
                format:
                    cite.c[0][0].citationMode.t === "AuthorInText"
                        ? "textcite"
                        : "cite",
                references
            }
        }
    }
}

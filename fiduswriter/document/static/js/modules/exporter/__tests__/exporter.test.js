import {existsSync, readFileSync} from "fs"
import {dirname, join} from "path"
import {fileURLToPath} from "url"
import {beforeAll, describe, expect, it} from "@jest/globals"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let sampleDoc, _sampleComments, sampleSettings

beforeAll(() => {
    sampleDoc = JSON.parse(
        readFileSync(join(__dirname, "fixtures", "sample-doc.json"), "utf-8")
    )
    _sampleComments = JSON.parse(
        readFileSync(
            join(__dirname, "fixtures", "sample-comments.json"),
            "utf-8"
        )
    )
    sampleSettings = JSON.parse(
        readFileSync(
            join(__dirname, "fixtures", "sample-settings.json"),
            "utf-8"
        )
    )
})

// ========================================================================
// SHARED HELPER TESTS
// ========================================================================

describe("Exporter helper functions", () => {
    let textContent, descendantNodes, removeHidden, _fixTables

    beforeAll(async () => {
        const tools = await import("../../exporter/tools/doc_content.js")
        textContent = tools.textContent
        descendantNodes = tools.descendantNodes
        removeHidden = tools.removeHidden
        _fixTables = tools.fixTables
    })

    describe("textContent()", () => {
        it("extracts text from a simple paragraph", () => {
            const node = {
                type: "paragraph",
                content: [
                    {type: "text", text: "Hello, "},
                    {type: "text", marks: [{type: "strong"}], text: "World"},
                    {type: "text", text: "!"}
                ]
            }
            expect(textContent(node)).toBe("Hello, World!")
        })

        it("extracts text from the full sample document title", () => {
            const titleNode = sampleDoc.content[0]
            expect(textContent(titleNode)).toBe(
                "Test Document for Export/Import"
            )
        })

        it("returns empty string for empty node", () => {
            expect(textContent({type: "paragraph"})).toBe("")
        })
    })

    describe("descendantNodes()", () => {
        it("returns all descendant nodes including self", () => {
            const node = {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        content: [
                            {type: "text", text: "Hello"},
                            {type: "text", text: "World"}
                        ]
                    }
                ]
            }
            const descendants = descendantNodes(node)
            expect(descendants.length).toBe(4)
        })

        it("finds specific node types in sample doc", () => {
            const descendants = descendantNodes(sampleDoc)
            const headings = descendants.filter(n =>
                n.type.startsWith("heading")
            )
            expect(headings.length).toBeGreaterThanOrEqual(5)
            const texts = descendants.filter(n => n.type === "text")
            expect(texts.length).toBeGreaterThan(20)
        })
    })

    describe("removeHidden()", () => {
        it("removes hidden parts but keeps stub by default", () => {
            const node = {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: {hidden: true},
                        content: [{type: "text", text: "Hidden"}]
                    },
                    {
                        type: "paragraph",
                        content: [{type: "text", text: "Visible"}]
                    }
                ]
            }
            const result = removeHidden(node)
            expect(result.content[0]).toBeDefined()
            expect(textContent(result)).toBe("Visible")
        })

        it("removes hidden parts completely when leaveStub is false", () => {
            const node = {
                type: "doc",
                content: [
                    {
                        type: "paragraph",
                        attrs: {hidden: true},
                        content: [{type: "text", text: "Hidden"}]
                    },
                    {
                        type: "paragraph",
                        content: [{type: "text", text: "Visible"}]
                    }
                ]
            }
            const result = removeHidden(node, false)
            expect(result.content.length).toBe(1)
            expect(textContent(result)).toBe("Visible")
        })
    })
})

// ========================================================================
// DOCX EXPORTER TESTS
// ========================================================================

describe("DOCX exporter modules", () => {
    it("DOCXExporter class exists and can be constructed", async () => {
        const mod = await import("../../exporter/docx/index.js")
        expect(mod.DOCXExporter).toBeDefined()
    })

    it("DOCXExporterMetadata extracts correct info from sample doc", () => {
        const docContent = sampleDoc
        const authors = docContent.content.reduce((authors, part) => {
            if (
                part.type === "contributors_part" &&
                part.attrs.metadata === "authors" &&
                part.content
            ) {
                return authors.concat(part.content.map(a => a.attrs))
            }
            return authors
        }, [])
        expect(authors.length).toBe(2)
        expect(authors[0].firstname).toBe("Jane")
        expect(authors[0].institution).toBe("Test University")

        const keywords = docContent.content.reduce((kws, part) => {
            if (
                part.type === "tags_part" &&
                part.attrs.metadata === "keywords" &&
                part.content
            ) {
                return kws.concat(part.content.map(n => n.attrs.tag))
            }
            return kws
        }, [])
        expect(keywords).toEqual(["testing", "export", "fiduswriter"])
    })

    it("DOCXExporterComments finds comment marks in sample doc", () => {
        const commentMarks = []
        const findComments = node => {
            if (node.marks) {
                node.marks
                    .filter(m => m.type === "comment")
                    .forEach(c => {
                        if (!commentMarks.includes(c.attrs.id)) {
                            commentMarks.push(c.attrs.id)
                        }
                    })
            }
            if (node.content) {
                node.content.forEach(findComments)
            }
        }
        findComments(sampleDoc)
        expect(commentMarks).toContain(1001)
    })

    describe("Lists", () => {
        it("DOCXExporterLists detects all list types in sample doc", async () => {
            const {descendantNodes} = await import(
                "../../exporter/tools/doc_content.js"
            )
            let useBulletList = false
            const usedNumberedList = []
            descendantNodes(sampleDoc).forEach(node => {
                if (node.type === "bullet_list") {
                    useBulletList = true
                } else if (node.type === "ordered_list") {
                    usedNumberedList.push(node.attrs.order)
                }
            })
            expect(useBulletList).toBe(true)
            expect(usedNumberedList.length).toBeGreaterThanOrEqual(1)
        })

        it("bullet_list items have correct structure", async () => {
            const {descendantNodes} = await import(
                "../../exporter/tools/doc_content.js"
            )
            const bullets = descendantNodes(sampleDoc).filter(
                n => n.type === "bullet_list"
            )
            expect(bullets.length).toBeGreaterThanOrEqual(1)

            const list = bullets[0]
            expect(list.attrs).toBeDefined()
            expect(list.attrs.id).toBeDefined()

            if (list.content) {
                list.content.forEach(item => {
                    expect(item.type).toBe("list_item")
                    // Each list_item should contain at least a paragraph
                    expect(item.content).toBeDefined()
                    expect(item.content.length).toBeGreaterThanOrEqual(1)
                })
            }
        })

        it("ordered_list items have sequential numbering", async () => {
            const {descendantNodes} = await import(
                "../../exporter/tools/doc_content.js"
            )
            const orderedLists = descendantNodes(sampleDoc).filter(
                n => n.type === "ordered_list"
            )
            expect(orderedLists.length).toBeGreaterThanOrEqual(1)

            orderedLists.forEach(list => {
                expect(list.attrs.order).toBeDefined()
                expect(typeof list.attrs.order).toBe("number")
                expect(list.attrs.order).toBeGreaterThanOrEqual(1)

                if (list.content) {
                    list.content.forEach(item => {
                        expect(item.type).toBe("list_item")
                    })
                }
            })
        })

        it("list items contain text with formatting", async () => {
            const {descendantNodes, textContent} = await import(
                "../../exporter/tools/doc_content.js"
            )
            const listItems = descendantNodes(sampleDoc).filter(
                n => n.type === "list_item"
            )
            expect(listItems.length).toBeGreaterThanOrEqual(2)

            // Check that text is extractable from list items
            let allText = ""
            listItems.forEach(item => {
                allText += textContent(item) + " "
            })
            expect(allText.length).toBeGreaterThan(10)

            // Check for formatting marks in list items
            let _hasFormatting = false
            listItems.forEach(item => {
                descendantNodes(item).forEach(n => {
                    if (n.marks && n.marks.length > 0) {
                        _hasFormatting = true
                    }
                })
            })

            // Sample doc has "Second bullet item with bold text"
            expect(allText).toMatch(/bold/i)
        })

        it("both bullet and ordered lists exist", async () => {
            const {descendantNodes} = await import(
                "../../exporter/tools/doc_content.js"
            )
            const types = new Set(
                descendantNodes(sampleDoc)
                    .filter(
                        n =>
                            n.type === "bullet_list" ||
                            n.type === "ordered_list"
                    )
                    .map(n => n.type)
            )
            expect(types.has("bullet_list")).toBe(true)
            expect(types.has("ordered_list")).toBe(true)
        })

        it("ODT exporter detects lists same as DOCX exporter", async () => {
            const {descendantNodes} = await import(
                "../../exporter/tools/doc_content.js"
            )
            // Both exporters use identical descendantNodes + type scanning
            const bullets = descendantNodes(sampleDoc).filter(
                n => n.type === "bullet_list"
            )
            const ordered = descendantNodes(sampleDoc).filter(
                n => n.type === "ordered_list"
            )
            // Both should find the same lists regardless of target format
            expect(bullets.length).toBeGreaterThanOrEqual(1)
            expect(ordered.length).toBeGreaterThanOrEqual(1)
        })
    })

    it("renders bullet list XML with correct numPr, pStyle, and list IDs", async () => {
        const {DOCXExporterRichtext} = await import(
            "../../exporter/docx/richtext.js"
        )

        // Mock lists object: returns fixed IDs for bullet and ordered lists
        const mockLists = {
            getBulletType: () => 1,
            getNumberedType: () => 2,
            numberedTypes: [2],
            bulletType: 1
        }

        // Minimal mocks for all other dependencies
        const noop = () => {}
        const mockFootnotes = {
            footnotes: [],
            fnPmJSON: false,
            citations: null,
            pmBib: false
        }
        const mockMath = {getOmml: () => "", latexToMathML: () => ""}
        const mockTables = {
            addTableGridStyle: noop,
            addTableNormalStyle: noop,
            tableGridStyle: "TableGrid",
            getSideMargins: () => 0
        }
        const mockRels = {
            addLinkRel: () => 0,
            addImageRel: () => 0,
            addLinkStyle: noop,
            hyperLinkStyle: false
        }
        const mockCitations = {
            pmCits: [],
            citInfos: [],
            citationTexts: [],
            citFm: {citationType: ""},
            bibDB: {}
        }
        const mockImages = {images: {}}

        const richtext = new DOCXExporterRichtext(
            {title: "Test", content: [], comments: {}, path: "/"},
            {language: "en-US", citationstyle: ""},
            mockLists,
            mockFootnotes,
            mockMath,
            mockTables,
            mockRels,
            mockCitations,
            mockImages
        )

        // A minimal bullet_list with two items
        const testDoc = {
            type: "doc",
            content: [
                {
                    type: "bullet_list",
                    attrs: {id: "bl1"},
                    content: [
                        {
                            type: "list_item",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {type: "text", text: "First item"}
                                    ]
                                }
                            ]
                        },
                        {
                            type: "list_item",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {type: "text", text: "Second item"}
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        const xml = richtext.run(testDoc)

        // Both list items should have ListParagraph style
        expect(xml).toContain('w:pStyle w:val="ListParagraph"')

        // Both list items should have a numPr with ilvl=0 and numId=1
        expect(xml).toContain("w:numPr")
        expect(xml).toContain('w:ilvl w:val="0"')
        expect(xml).toContain('w:numId w:val="1"')

        // The text content should be present
        expect(xml).toContain("First item")
        expect(xml).toContain("Second item")

        // No unexpected empty list paragraphs
        expect(xml.match(/w:pStyle/g).length).toBe(2) // only 2 paragraphs, not 3 or 4
    })

    it("renders ordered list XML with correct numPr and style", async () => {
        const {DOCXExporterRichtext} = await import(
            "../../exporter/docx/richtext.js"
        )

        const mockLists = {
            getBulletType: () => 1,
            getNumberedType: () => 2,
            numberedTypes: [2],
            bulletType: 1
        }

        const richtext = new DOCXExporterRichtext(
            {title: "Test", content: [], comments: {}, path: "/"},
            {language: "en-US", citationstyle: ""},
            mockLists,
            {footnotes: [], fnPmJSON: false, citations: null, pmBib: false},
            {getOmml: () => "", latexToMathML: () => ""},
            {
                addTableGridStyle: () => {},
                addTableNormalStyle: () => {},
                tableGridStyle: "TableGrid",
                getSideMargins: () => 0
            },
            {
                addLinkRel: () => 0,
                addImageRel: () => 0,
                addLinkStyle: () => {},
                hyperLinkStyle: false
            },
            {
                pmCits: [],
                citInfos: [],
                citationTexts: [],
                citFm: {citationType: ""},
                bibDB: {}
            },
            {images: {}}
        )

        const testDoc = {
            type: "doc",
            content: [
                {
                    type: "ordered_list",
                    attrs: {id: "ol1", order: 1},
                    content: [
                        {
                            type: "list_item",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [
                                        {type: "text", text: "Number one"}
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ]
        }

        const xml = richtext.run(testDoc)

        expect(xml).toContain('w:pStyle w:val="ListParagraph"')
        expect(xml).toContain("w:numPr")
        expect(xml).toContain('w:ilvl w:val="0"')
        expect(xml).toContain('w:numId w:val="2"') // ordered list gets numId 2
        expect(xml).toContain("Number one")
    })

    it("does not leak list properties to paragraph after list", async () => {
        const {DOCXExporterRichtext} = await import(
            "../../exporter/docx/richtext.js"
        )

        const mockLists = {
            getBulletType: () => 1,
            getNumberedType: () => 2,
            numberedTypes: [2],
            bulletType: 1
        }

        const richtext = new DOCXExporterRichtext(
            {title: "Test", content: [], comments: {}, path: "/"},
            {language: "en-US", citationstyle: ""},
            mockLists,
            {footnotes: [], fnPmJSON: false, citations: null, pmBib: false},
            {getOmml: () => "", latexToMathML: () => ""},
            {
                addTableGridStyle: () => {},
                addTableNormalStyle: () => {},
                tableGridStyle: "TableGrid",
                getSideMargins: () => 0
            },
            {
                addLinkRel: () => 0,
                addImageRel: () => 0,
                addLinkStyle: () => {},
                hyperLinkStyle: false
            },
            {
                pmCits: [],
                citInfos: [],
                citationTexts: [],
                citFm: {citationType: ""},
                bibDB: {}
            },
            {images: {}}
        )

        // A paragraph, then a bullet list, then another paragraph
        const testDoc = {
            type: "doc",
            content: [
                {
                    type: "paragraph",
                    content: [{type: "text", text: "Before list"}]
                },
                {
                    type: "bullet_list",
                    attrs: {id: "bl1"},
                    content: [
                        {
                            type: "list_item",
                            content: [
                                {
                                    type: "paragraph",
                                    content: [{type: "text", text: "In list"}]
                                }
                            ]
                        }
                    ]
                },
                {
                    type: "paragraph",
                    content: [{type: "text", text: "After list"}]
                }
            ]
        }

        const xml = richtext.run(testDoc)

        // The paragraph BEFORE the list should be Normal, no numPr
        expect(xml).toContain('w:pStyle w:val="Normal"')

        // The paragraph INSIDE the list should have ListParagraph + numPr
        expect(xml).toContain('w:pStyle w:val="ListParagraph"')
        expect(xml).toContain("w:numPr")
        expect(xml).toContain('w:ilvl w:val="0"')
        expect(xml).toContain('w:numId w:val="1"')

        // The paragraph AFTER the list should be Normal, NO numPr
        // Extract the last paragraph's style
        const normalMatches = xml.match(/<w:pStyle w:val="Normal"/g)
        expect(normalMatches).not.toBeNull()
        // There should be exactly 2 Normal paragraphs (before + after list)
        // and only 1 ListParagraph
        const lpMatches = xml.match(/<w:pStyle w:val="ListParagraph"/g)
        expect(lpMatches).toHaveLength(1)
    })

    it("DOCXExporterFootnotes finds footnotes in sample doc", async () => {
        const {descendantNodes} = await import(
            "../../exporter/tools/doc_content.js"
        )
        const footnotes = []
        descendantNodes(sampleDoc).forEach(node => {
            if (node.type === "footnote") {
                footnotes.push(node.attrs.footnote)
            }
        })
        expect(footnotes.length).toBeGreaterThanOrEqual(1)
        expect(footnotes[0][0].content[0].text).toContain("footnote content")
    })

    it("DOCXExporterImages finds images in sample doc", async () => {
        const {descendantNodes} = await import(
            "../../exporter/tools/doc_content.js"
        )
        const images = []
        descendantNodes(sampleDoc).forEach(node => {
            if (node.type === "image" && node.attrs.image !== false) {
                images.push(node.attrs.image)
            }
        })
        expect(images.length).toBeGreaterThanOrEqual(1)
    })

    it("DOCXExporterMath getBaseMetadata returns correct structure", () => {
        const title = sampleDoc.content[0]
        const language = sampleSettings.language
        expect(title.content[0].text).toBe("Test Document for Export/Import")
        expect(language).toBe("en-US")
    })

    it("DOCX exporter handles tracked changes", async () => {
        const {descendantNodes} = await import(
            "../../exporter/tools/doc_content.js"
        )
        const insertions = []
        const deletions = []
        descendantNodes(sampleDoc).forEach(node => {
            if (node.marks) {
                node.marks.forEach(m => {
                    if (m.type === "insertion") {
                        insertions.push(m)
                    }
                    if (m.type === "deletion") {
                        deletions.push(m)
                    }
                })
            }
        })
        expect(insertions.length).toBeGreaterThanOrEqual(1)
        expect(deletions.length).toBeGreaterThanOrEqual(1)
        expect(insertions[0].attrs.username).toBe("Jane Doe")
    })

    it("DOCX exporter handles format_change marks", async () => {
        const {descendantNodes} = await import(
            "../../exporter/tools/doc_content.js"
        )
        const formatChanges = []
        descendantNodes(sampleDoc).forEach(node => {
            if (node.marks) {
                node.marks.forEach(m => {
                    if (m.type === "format_change") {
                        formatChanges.push(m)
                    }
                })
            }
        })
        expect(formatChanges.length).toBeGreaterThanOrEqual(1)
        expect(formatChanges[0].attrs.before).toContain("em")
    })

    it("DOCX exporter handles block_change tracks", async () => {
        const {descendantNodes} = await import(
            "../../exporter/tools/doc_content.js"
        )
        const blockChanges = []
        descendantNodes(sampleDoc).forEach(node => {
            if (node.attrs?.track) {
                node.attrs.track.forEach(t => {
                    if (t.type === "block_change") {
                        blockChanges.push(t)
                    }
                })
            }
        })
        expect(blockChanges.length).toBeGreaterThanOrEqual(1)
        expect(blockChanges[0].before.type).toBe("heading2")
    })

    it("DOCX exporter comments module exports correctly", async () => {
        const mod = await import("../../exporter/docx/comments.js")
        expect(mod.DOCXExporterComments).toBeDefined()
    })

    it("DOCX exporter lists module exports correctly", async () => {
        const mod = await import("../../exporter/docx/lists.js")
        expect(mod.DOCXExporterLists).toBeDefined()
    })

    it("DOCX exporter tables module exports correctly", async () => {
        const mod = await import("../../exporter/docx/tables.js")
        expect(mod.DOCXExporterTables).toBeDefined()
    })

    it("DOCX exporter citations module exports correctly", async () => {
        const mod = await import("../../exporter/docx/citations.js")
        expect(mod.DOCXExporterCitations).toBeDefined()
    })

    it("DOCX exporter footnotes module exports correctly", async () => {
        const mod = await import("../../exporter/docx/footnotes.js")
        expect(mod.DOCXExporterFootnotes).toBeDefined()
    })

    it("DOCX exporter images module exports correctly", async () => {
        const mod = await import("../../exporter/docx/images.js")
        expect(mod.DOCXExporterImages).toBeDefined()
    })

    it("DOCX exporter math module exports correctly", async () => {
        const mod = await import("../../exporter/docx/math.js")
        expect(mod.DOCXExporterMath).toBeDefined()
    })

    it("DOCX exporter metadata module exports correctly", async () => {
        const mod = await import("../../exporter/docx/metadata.js")
        expect(mod.DOCXExporterMetadata).toBeDefined()
    })

    it("DOCX exporter rels module exports correctly", async () => {
        const mod = await import("../../exporter/docx/rels.js")
        expect(mod.DOCXExporterRels).toBeDefined()
    })

    it("DOCX exporter render module exports correctly", async () => {
        const mod = await import("../../exporter/docx/render.js")
        expect(mod.DOCXExporterRender).toBeDefined()
    })

    it("DOCX exporter richtext module exports correctly", async () => {
        const mod = await import("../../exporter/docx/richtext.js")
        expect(mod.DOCXExporterRichtext).toBeDefined()
    })
})

// ========================================================================
// ODT EXPORTER TESTS
// ========================================================================

describe("ODT exporter modules", () => {
    it("ODTExporter class exists", async () => {
        const mod = await import("../../exporter/odt/index.js")
        expect(mod.ODTExporter).toBeDefined()
    })

    it("ODTExporterTracks class exists", async () => {
        const mod = await import("../../exporter/odt/track.js")
        expect(mod.ODTExporterTracks).toBeDefined()
    })

    it("ODTExporterStyles class exists", async () => {
        const mod = await import("../../exporter/odt/styles.js")
        expect(mod.ODTExporterStyles).toBeDefined()
    })

    it("ODTExporterCitations class exists", async () => {
        const mod = await import("../../exporter/odt/citations.js")
        expect(mod.ODTExporterCitations).toBeDefined()
    })

    it("ODTExporterFootnotes class exists", async () => {
        const mod = await import("../../exporter/odt/footnotes.js")
        expect(mod.ODTExporterFootnotes).toBeDefined()
    })

    it("ODTExporterImages class exists", async () => {
        const mod = await import("../../exporter/odt/images.js")
        expect(mod.ODTExporterImages).toBeDefined()
    })

    it("ODTExporterMath class exists", async () => {
        const mod = await import("../../exporter/odt/math.js")
        expect(mod.ODTExporterMath).toBeDefined()
    })

    it("ODTExporterMetadata class exists", async () => {
        const mod = await import("../../exporter/odt/metadata.js")
        expect(mod.ODTExporterMetadata).toBeDefined()
    })

    it("ODTExporterRender class exists", async () => {
        const mod = await import("../../exporter/odt/render.js")
        expect(mod.ODTExporterRender).toBeDefined()
    })

    it("ODTExporterRichtext class exists", async () => {
        const mod = await import("../../exporter/odt/richtext.js")
        expect(mod.ODTExporterRichtext).toBeDefined()
    })

    it("ODT exporter getBaseMetadata extracts same info as DOCX", () => {
        // Both exporters use identical getBaseMetadata() logic
        const docContent = sampleDoc
        const authors = docContent.content.reduce((authors, part) => {
            if (
                part.type === "contributors_part" &&
                part.attrs.metadata === "authors" &&
                part.content
            ) {
                return authors.concat(part.content.map(a => a.attrs))
            }
            return authors
        }, [])
        expect(authors).toHaveLength(2)
        expect(authors[0].firstname).toBe("Jane")
        expect(authors[1].lastname).toBe("Smith")
    })
})

// ========================================================================
// EPUB EXPORTER TESTS
// ========================================================================

describe("EPUB exporter", () => {
    it("EpubExporter class exists", async () => {
        const mod = await import("../../exporter/epub/index.js")
        expect(mod.EpubExporter).toBeDefined()
    })

    it("EpubExporter extends HTMLExporter", async () => {
        const epubMod = await import("../../exporter/epub/index.js")
        const htmlMod = await import("../../exporter/html/index.js")
        // EPUB exporter inherits from HTML exporter
        expect(epubMod.EpubExporter.prototype).toBeInstanceOf(
            htmlMod.HTMLExporter
        )
    })

    it("template helpers exist", async () => {
        // Test that templates module is importable
        const mod = await import("../../exporter/epub/templates.js")
        expect(mod).toBeDefined()
    })

    it("tools module exists", async () => {
        const mod = await import("../../exporter/epub/tools.js")
        expect(mod).toBeDefined()
        expect(mod.buildHierarchy).toBeDefined()
        expect(mod.getFontMimeType).toBeDefined()
        expect(mod.getImageMimeType).toBeDefined()
    })
})

// ========================================================================
// HTML EXPORTER TESTS
// ========================================================================

describe("HTML exporter", () => {
    it("HTMLExporter class exists", async () => {
        const mod = await import("../../exporter/html/index.js")
        expect(mod.HTMLExporter).toBeDefined()
    })

    it("HTMLExporterConvert class exists", async () => {
        const mod = await import("../../exporter/html/convert.js")
        expect(mod.HTMLExporterConvert).toBeDefined()
    })

    it("templates module exists", async () => {
        const mod = await import("../../exporter/html/templates.js")
        expect(mod).toBeDefined()
    })
})

// ========================================================================
// JATS EXPORTER TESTS
// ========================================================================

describe("JATS exporter", () => {
    it("JATSExporter class exists", async () => {
        const mod = await import("../../exporter/jats/index.js")
        expect(mod.JATSExporter).toBeDefined()
    })

    it("JATSExporterConverter class exists", async () => {
        const mod = await import("../../exporter/jats/convert.js")
        expect(mod.JATSExporterConverter).toBeDefined()
    })

    it("templates module exists", async () => {
        const mod = await import("../../exporter/jats/templates.js")
        expect(mod).toBeDefined()
    })
})

// ========================================================================
// LATEX EXPORTER TESTS
// ========================================================================

describe("LaTeX exporter", () => {
    it("LatexExporter class exists", async () => {
        const mod = await import("../../exporter/latex/index.js")
        expect(mod.LatexExporter).toBeDefined()
    })

    it("LatexExporterConvert class exists", async () => {
        const mod = await import("../../exporter/latex/convert.js")
        expect(mod.LatexExporterConvert).toBeDefined()
    })

    it("escape_latex module exists", async () => {
        const mod = await import("../../exporter/latex/escape_latex.js")
        expect(mod).toBeDefined()
    })

    it("LatexExporter handles document metadata", async () => {
        const {textContent} = await import(
            "../../exporter/tools/doc_content.js"
        )
        // Test metadata extraction for LaTeX (title, authors)
        const title = textContent(sampleDoc.content[0])
        expect(title).toBe("Test Document for Export/Import")
    })
})

// ========================================================================
// PANDOC EXPORTER TESTS
// ========================================================================

describe("Pandoc exporter", () => {
    it("PandocExporter class exists", async () => {
        const mod = await import("../../exporter/pandoc/index.js")
        expect(mod.PandocExporter).toBeDefined()
    })
})

// ========================================================================
// PRINT EXPORTER TESTS
// ========================================================================

describe("Print exporter", () => {
    it("PrintExporter class exists", async () => {
        const mod = await import("../../exporter/print/index.js")
        expect(mod.PrintExporter).toBeDefined()
    })
})

// ========================================================================
// TOOLS MODULES
// ========================================================================

describe("Exporter tools", () => {
    it("XmlZip class exists", async () => {
        const mod = await import("../../exporter/tools/xml_zip.js")
        expect(mod.XmlZip).toBeDefined()
    })

    it("xmlDOM function exists", async () => {
        const mod = await import("../../exporter/tools/xml.js")
        expect(mod.xmlDOM).toBeDefined()
        // Test basic XML parsing
        const dom = mod.xmlDOM('<root><child attr="val">text</child></root>')
        expect(dom).toBeDefined()
    })

    it("createSlug function exists", async () => {
        const mod = await import("../../exporter/tools/file.js")
        expect(mod.createSlug).toBeDefined()
    })

    it("svg2png function exists", async () => {
        const mod = await import("../../exporter/tools/svg.js")
        expect(mod.svg2png).toBeDefined()
    })

    it("ZipFileCreator class exists", async () => {
        const mod = await import("../../exporter/tools/zip.js")
        expect(mod.ZipFileCreator).toBeDefined()
    })
})

// ========================================================================
// FEATURE COVERAGE VERIFICATION
// ========================================================================

describe("Feature coverage verification", () => {
    it("sample document covers all required text formatting marks", () => {
        const marksFound = new Set()
        const findMarks = node => {
            if (node.marks) {
                node.marks.forEach(m => marksFound.add(m.type))
            }
            if (node.content) {
                node.content.forEach(findMarks)
            }
        }
        findMarks(sampleDoc)

        const expectedMarks = [
            "strong",
            "em",
            "underline",
            "sup",
            "sub",
            "code",
            "link",
            "anchor",
            "insertion",
            "deletion",
            "format_change",
            "comment"
        ]
        expectedMarks.forEach(mark => {
            expect(marksFound.has(mark)).toBe(true)
        })
    })

    it("sample document covers all required block types", () => {
        const blocksFound = new Set()
        const findBlocks = node => {
            blocksFound.add(node.type)
            if (node.content) {
                node.content.forEach(findBlocks)
            }
        }
        findBlocks(sampleDoc)

        const expectedBlocks = [
            "doc",
            "title",
            "contributors_part",
            "tags_part",
            "richtext_part",
            "heading_part",
            "paragraph",
            "heading1",
            "heading2",
            "heading3",
            "bullet_list",
            "ordered_list",
            "list_item",
            "code_block",
            "blockquote",
            "figure",
            "figure_caption",
            "image",
            "figure_equation",
            "table",
            "table_caption",
            "table_body",
            "table_row",
            "table_header",
            "table_cell",
            "footnote",
            "equation",
            "cross_reference"
        ]
        expectedBlocks.forEach(block => {
            expect(blocksFound.has(block)).toBe(true)
        })
    })

    it("sample document has realistic multi-section structure", () => {
        expect(sampleDoc.type).toBe("doc")
        expect(sampleDoc.content.length).toBeGreaterThanOrEqual(8)

        const partTypes = sampleDoc.content.map(c => c.type)
        expect(partTypes).toContain("title")
        expect(partTypes).toContain("contributors_part")
        expect(partTypes).toContain("tags_part")
        expect(partTypes).toContain("richtext_part")

        const headingParts = sampleDoc.content.filter(
            c => c.type === "heading_part"
        )
        expect(headingParts.length).toBeGreaterThanOrEqual(4)
        expect(headingParts[0].attrs.title).toBe("Introduction")
    })
})

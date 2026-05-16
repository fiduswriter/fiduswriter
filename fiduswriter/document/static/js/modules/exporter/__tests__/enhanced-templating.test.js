import {beforeAll, describe, expect, it} from "@jest/globals"
import {xmlDOM} from "../../exporter/tools/xml"

let DOCXExporterRender, ODTExporterRender

beforeAll(async () => {
    const docxMod = await import("../../exporter/docx/render.js")
    DOCXExporterRender = docxMod.DOCXExporterRender
    const odtMod = await import("../../exporter/odt/render.js")
    ODTExporterRender = odtMod.ODTExporterRender
})

// Helper to create a mock DOCX paragraph block with text
function createDocxBlock(text) {
    const dom = xmlDOM(`<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`)
    return dom.query("w:p")
}

// Helper to create a mock ODT paragraph block with text
function createOdtBlock(text) {
    const dom = xmlDOM(`<text:p>${text}</text:p>`)
    return dom.query("text:p")
}

// Helper to create a sample document with contributors and tags
function createSampleDoc() {
    return {
        content: [
            {
                type: "title",
                content: [{type: "text", text: "Test Document"}]
            },
            {
                type: "contributors_part",
                attrs: {id: "authors", metadata: "authors"},
                content: [
                    {
                        type: "contributor",
                        attrs: {
                            firstname: "Jane",
                            lastname: "Doe",
                            institution: "Test University",
                            email: "jane@example.com",
                            id_type: "ORCID",
                            id_value: "0000-0001-2345-6789"
                        }
                    },
                    {
                        type: "contributor",
                        attrs: {
                            firstname: "John",
                            lastname: "Smith",
                            institution: "Another University",
                            email: false,
                            id_type: false,
                            id_value: false
                        }
                    }
                ]
            },
            {
                type: "tags_part",
                attrs: {id: "keywords", metadata: "keywords"},
                content: [
                    {type: "tag", attrs: {tag: "testing"}},
                    {type: "tag", attrs: {tag: "export"}},
                    {type: "tag", attrs: {tag: "fiduswriter"}}
                ]
            }
        ]
    }
}

describe("Enhanced Templating - DOCX", () => {
    describe("getTagData", () => {
        it("returns structured objects for contributors", () => {
            const render = new DOCXExporterRender(null)
            const doc = createSampleDoc()
            const tags = render.getTagData(doc, false, {
                bibliography_header: {},
                language: "en-US"
            })
            const authorsTag = tags.find(t => t.title === "authors")
            expect(authorsTag).toBeDefined()
            expect(Array.isArray(authorsTag.content)).toBe(true)
            expect(authorsTag.content).toHaveLength(2)
            expect(authorsTag.content[0].firstname).toBe("Jane")
            expect(authorsTag.content[0].lastname).toBe("Doe")
            expect(authorsTag.content[0].id_type).toBe("ORCID")
            expect(authorsTag.content[1].firstname).toBe("John")
        })

        it("returns array of strings for tags", () => {
            const render = new DOCXExporterRender(null)
            const doc = createSampleDoc()
            const tags = render.getTagData(doc, false, {
                bibliography_header: {},
                language: "en-US"
            })
            const keywordsTag = tags.find(t => t.title === "keywords")
            expect(keywordsTag).toBeDefined()
            expect(Array.isArray(keywordsTag.content)).toBe(true)
            expect(keywordsTag.content).toEqual([
                "testing",
                "export",
                "fiduswriter"
            ])
        })
    })

    describe("inlineRender", () => {
        it("renders backward-compatible contributors without format string", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock("{authors}")
            const tag = {
                title: "authors",
                block,
                content: [
                    {
                        firstname: "Jane",
                        lastname: "Doe",
                        institution: "Test University",
                        email: "jane@example.com"
                    },
                    {
                        firstname: "John",
                        lastname: "Smith",
                        institution: "Another University",
                        email: false
                    }
                ]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe(
                "Jane Doe, Test University, jane@example.com; John Smith, Another University"
            )
        })

        it("renders backward-compatible tags without format string", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock("{keywords}")
            const tag = {
                title: "keywords",
                block,
                content: ["testing", "export", "fiduswriter"]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe("testing, export, fiduswriter")
        })

        it("renders format string with semicolon delimiter for contributors", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{authors:format=%lastname, %firstname|; }"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "Jane", lastname: "Doe"},
                    {firstname: "John", lastname: "Smith"}
                ]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe("Doe, Jane; Smith, John")
        })

        it("renders format string with line break delimiter", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{authors:format=%firstname %lastname|\\n}"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "Jane", lastname: "Doe"},
                    {firstname: "John", lastname: "Smith"}
                ]
            }
            render.inlineRender(tag)
            expect(block.textContent).toContain("Jane Doe")
            expect(block.textContent).toContain("John Smith")
            // The delimiter should produce <w:br/> in the XML
            expect(block.innerXML).toContain("<w:br/>")
        })

        it("renders format string for tags", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock("{keywords:format=%tag|, }")
            const tag = {
                title: "keywords",
                block,
                content: ["testing", "export", "fiduswriter"]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe("testing, export, fiduswriter")
        })

        it("skips inlineRender when no inline tag is present", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock("{BEGIN_authors}content{END_authors}")
            const tag = {
                title: "authors",
                block,
                content: [{firstname: "Jane", lastname: "Doe"}]
            }
            render.inlineRender(tag)
            // Block should be unchanged
            expect(block.textContent).toBe(
                "{BEGIN_authors}content{END_authors}"
            )
        })
    })

    describe("parseStructuredTags - loops", () => {
        it("processes BEGIN...END loop for contributors", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{BEGIN_authors}<w:tc><w:p>{%firstname} {%lastname}</w:p></w:tc>{END_authors}"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "Jane", lastname: "Doe"},
                    {firstname: "John", lastname: "Smith"}
                ]
            }
            render.parseStructuredTags(block, tag)
            const xml = block.innerXML
            expect(xml).toContain("Jane Doe")
            expect(xml).toContain("John Smith")
            expect(xml).not.toContain("{BEGIN_authors}")
            expect(xml).not.toContain("{END_authors}")
        })

        it("processes BEGIN...END loop with limit", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{BEGIN_authors:limit=1}<w:tc>{%lastname}</w:tc>{END_authors}"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "Jane", lastname: "Doe"},
                    {firstname: "John", lastname: "Smith"}
                ]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).toContain("Doe")
            expect(block.textContent).not.toContain("Smith")
        })

        it("escapes field values in loops", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{BEGIN_authors}<w:p>{%firstname}</w:p>{END_authors}"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "<script>alert(1)</script>", lastname: "Doe"}
                ]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).toContain("<script>alert(1)</script>")
            // The serialized XML should contain escaped text
            expect(block.toString()).toContain(
                "&lt;script&gt;alert(1)&lt;/script&gt;"
            )
        })
    })

    describe("parseStructuredTags - conditionals", () => {
        it("processes IF...ENDIF when condition is true", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{IF(authors.count >= 2)}<w:p>Multiple authors</w:p>{ENDIF}"
            )
            const tag = {
                title: "authors",
                block,
                content: [{firstname: "Jane"}, {firstname: "John"}]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).toContain("Multiple authors")
            expect(block.textContent).not.toContain("{IF")
            expect(block.textContent).not.toContain("}")
        })

        it("processes IF...ENDIF when condition is false", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{IF(authors.count >= 3)}<w:p>Many authors</w:p>{ENDIF}"
            )
            const tag = {
                title: "authors",
                block,
                content: [{firstname: "Jane"}, {firstname: "John"}]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).not.toContain("Many authors")
            expect(block.textContent).not.toContain("{IF")
        })

        it("processes IF...ELIF...ELSE...ENDIF", () => {
            const render = new DOCXExporterRender(null)
            const block = createDocxBlock(
                "{IF(authors.count === 1)}<w:p>One</w:p>{ELIF(authors.count === 2)}<w:p>Two</w:p>{ELSE}<w:p>Many</w:p>{ENDIF}"
            )
            const tag = {
                title: "authors",
                block,
                content: [{firstname: "Jane"}, {firstname: "John"}]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).toContain("Two")
            expect(block.textContent).not.toContain("One")
            expect(block.textContent).not.toContain("Many")
            expect(block.textContent).not.toContain("{IF")
        })
    })

    describe("evaluateExpression", () => {
        it("evaluates ctx.count comparisons", () => {
            const render = new DOCXExporterRender(null)
            expect(
                render.evaluateExpression("ctx.count >= 2", {
                    tagName: "authors",
                    count: 3
                })
            ).toBe(true)
            expect(
                render.evaluateExpression("ctx.count >= 2", {
                    tagName: "authors",
                    count: 1
                })
            ).toBe(false)
            expect(
                render.evaluateExpression("ctx.count === 0", {
                    tagName: "authors",
                    count: 0
                })
            ).toBe(true)
        })

        it("evaluates logical operators", () => {
            const render = new DOCXExporterRender(null)
            expect(
                render.evaluateExpression("ctx.count >= 2 && ctx.count < 5", {
                    tagName: "authors",
                    count: 3
                })
            ).toBe(true)
            expect(
                render.evaluateExpression("ctx.count >= 2 && ctx.count < 5", {
                    tagName: "authors",
                    count: 5
                })
            ).toBe(false)
            expect(
                render.evaluateExpression(
                    "ctx.count === 1 || ctx.count === 2",
                    {tagName: "authors", count: 2}
                )
            ).toBe(true)
        })

        it("evaluates tag name references", () => {
            const render = new DOCXExporterRender(null)
            expect(
                render.evaluateExpression("authors.count >= 2", {
                    tagName: "authors",
                    count: 3
                })
            ).toBe(true)
            expect(
                render.evaluateExpression("keywords.count === 0", {
                    tagName: "keywords",
                    count: 0
                })
            ).toBe(true)
        })

        it("handles ctx.first and ctx.last", () => {
            const render = new DOCXExporterRender(null)
            expect(
                render.evaluateExpression("ctx.first === true", {
                    tagName: "authors",
                    first: true
                })
            ).toBe(true)
            expect(
                render.evaluateExpression("ctx.last === false", {
                    tagName: "authors",
                    last: false
                })
            ).toBe(true)
        })

        it("rejects unsafe expressions", () => {
            const render = new DOCXExporterRender(null)
            expect(
                render.evaluateExpression("alert(1)", {
                    tagName: "authors",
                    count: 1
                })
            ).toBe(false)
            expect(
                render.evaluateExpression("process.exit()", {
                    tagName: "authors",
                    count: 1
                })
            ).toBe(false)
        })
    })

    describe("processMultiBlockStructuredTags - loops", () => {
        it("processes BEGIN...END loop across multiple paragraphs", () => {
            const render = new DOCXExporterRender(null)
            const dom = xmlDOM(`<w:body>
                <w:p><w:r><w:t>{BEGIN_authors}</w:t></w:r></w:p>
                <w:p><w:r><w:t>{%firstname} {%lastname}</w:t></w:r></w:p>
                <w:p><w:r><w:t>{END_authors}</w:t></w:r></w:p>
            </w:body>`)
            const body = dom.query("w:body")
            const blocks = body.queryAll("w:p")
            const tags = [
                {
                    title: "authors",
                    content: [
                        {firstname: "Jane", lastname: "Doe"},
                        {firstname: "John", lastname: "Smith"}
                    ]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).toContain("Jane Doe")
            expect(allText).toContain("John Smith")
            expect(allText).not.toContain("{BEGIN_authors}")
            expect(allText).not.toContain("{END_authors}")
        })

        it("processes BEGIN...END with limit across multiple paragraphs", () => {
            const render = new DOCXExporterRender(null)
            const dom = xmlDOM(`<w:body>
                <w:p><w:r><w:t>{BEGIN_authors:limit=1}</w:t></w:r></w:p>
                <w:p><w:r><w:t>{%lastname}</w:t></w:r></w:p>
                <w:p><w:r><w:t>{END_authors}</w:t></w:r></w:p>
            </w:body>`)
            const body = dom.query("w:body")
            const blocks = body.queryAll("w:p")
            const tags = [
                {
                    title: "authors",
                    content: [
                        {firstname: "Jane", lastname: "Doe"},
                        {firstname: "John", lastname: "Smith"}
                    ]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).toContain("Doe")
            expect(allText).not.toContain("Smith")
        })
    })

    describe("processMultiBlockStructuredTags - conditionals", () => {
        it("processes IF...ENDIF across multiple paragraphs when true", () => {
            const render = new DOCXExporterRender(null)
            const dom = xmlDOM(`<w:body>
                <w:p><w:r><w:t>{IF(authors.count >= 2)}</w:t></w:r></w:p>
                <w:p><w:r><w:t>Multiple authors present</w:t></w:r></w:p>
                <w:p><w:r><w:t>{ENDIF}</w:t></w:r></w:p>
            </w:body>`)
            const body = dom.query("w:body")
            const blocks = body.queryAll("w:p")
            const tags = [
                {
                    title: "authors",
                    content: [{firstname: "Jane"}, {firstname: "John"}]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).toContain("Multiple authors present")
            expect(allText).not.toContain("{IF")
            expect(allText).not.toContain("{ENDIF}")
            expect(allText).not.toContain("}")
            expect(allText).not.toContain("}")
        })

        it("processes IF...ENDIF across multiple paragraphs when false", () => {
            const render = new DOCXExporterRender(null)
            const dom = xmlDOM(`<w:body>
                <w:p><w:r><w:t>{IF(authors.count >= 3)}</w:t></w:r></w:p>
                <w:p><w:r><w:t>Many authors present</w:t></w:r></w:p>
                <w:p><w:r><w:t>{ENDIF}</w:t></w:r></w:p>
            </w:body>`)
            const body = dom.query("w:body")
            const blocks = body.queryAll("w:p")
            const tags = [
                {
                    title: "authors",
                    content: [{firstname: "Jane"}, {firstname: "John"}]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).not.toContain("Many authors present")
            expect(allText).not.toContain("{IF")
            expect(allText).not.toContain("{ENDIF}")
            expect(allText).not.toContain("}")
            expect(allText).not.toContain("}")
        })
    })
})

describe("Enhanced Templating - ODT", () => {
    describe("inlineRender", () => {
        it("renders backward-compatible contributors without format string", () => {
            const render = new ODTExporterRender(null)
            const block = createOdtBlock("{authors}")
            const tag = {
                title: "authors",
                block,
                content: [
                    {
                        firstname: "Jane",
                        lastname: "Doe",
                        institution: "Test University",
                        email: false
                    },
                    {
                        firstname: "John",
                        lastname: "Smith",
                        institution: false,
                        email: false
                    }
                ]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe(
                "Jane Doe, Test University; John Smith"
            )
        })

        it("renders format string with delimiter for tags", () => {
            const render = new ODTExporterRender(null)
            const block = createOdtBlock("{keywords:format=%tag|; }")
            const tag = {
                title: "keywords",
                block,
                content: ["testing", "export"]
            }
            render.inlineRender(tag)
            expect(block.textContent).toBe("testing; export")
        })
    })

    describe("parseStructuredTags - loops", () => {
        it("processes BEGIN...END loop for contributors", () => {
            const render = new ODTExporterRender(null)
            const block = createOdtBlock(
                "{BEGIN_authors}<text:tc><text:p>{%firstname} {%lastname}</text:p></text:tc>{END_authors}"
            )
            const tag = {
                title: "authors",
                block,
                content: [
                    {firstname: "Jane", lastname: "Doe"},
                    {firstname: "John", lastname: "Smith"}
                ]
            }
            render.parseStructuredTags(block, tag)
            const xml = block.innerXML
            expect(xml).toContain("Jane Doe")
            expect(xml).toContain("John Smith")
            expect(xml).not.toContain("{BEGIN_authors}")
        })
    })

    describe("parseStructuredTags - conditionals", () => {
        it("processes IF...ENDIF", () => {
            const render = new ODTExporterRender(null)
            const block = createOdtBlock(
                "{IF(authors.count >= 2)}<text:p>Multiple</text:p>{ENDIF}"
            )
            const tag = {
                title: "authors",
                block,
                content: [{firstname: "Jane"}, {firstname: "John"}]
            }
            render.parseStructuredTags(block, tag)
            expect(block.textContent).toContain("Multiple")
            expect(block.textContent).not.toContain("{IF")
            expect(block.textContent).not.toContain("}")
        })
    })

    describe("processMultiBlockStructuredTags - loops", () => {
        it("processes BEGIN...END loop across multiple paragraphs", () => {
            const render = new ODTExporterRender(null)
            const dom = xmlDOM(`<office:text>
                <text:p>{BEGIN_authors}</text:p>
                <text:p>{%firstname} {%lastname}</text:p>
                <text:p>{END_authors}</text:p>
            </office:text>`)
            const text = dom.query("office:text")
            const blocks = text.queryAll(["text:p", "text:h"])
            const tags = [
                {
                    title: "authors",
                    content: [
                        {firstname: "Jane", lastname: "Doe"},
                        {firstname: "John", lastname: "Smith"}
                    ]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).toContain("Jane Doe")
            expect(allText).toContain("John Smith")
            expect(allText).not.toContain("{BEGIN_authors}")
            expect(allText).not.toContain("{END_authors}")
        })
    })

    describe("processMultiBlockStructuredTags - conditionals", () => {
        it("processes IF...ENDIF across multiple paragraphs when true", () => {
            const render = new ODTExporterRender(null)
            const dom = xmlDOM(`<office:text>
                <text:p>{IF(authors.count >= 2)}</text:p>
                <text:p>Multiple authors present</text:p>
                <text:p>{ENDIF}</text:p>
            </office:text>`)
            const text = dom.query("office:text")
            const blocks = text.queryAll(["text:p", "text:h"])
            const tags = [
                {
                    title: "authors",
                    content: [{firstname: "Jane"}, {firstname: "John"}]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).toContain("Multiple authors present")
            expect(allText).not.toContain("{IF")
            expect(allText).not.toContain("{ENDIF}")
        })

        it("processes IF...ENDIF across multiple paragraphs when false", () => {
            const render = new ODTExporterRender(null)
            const dom = xmlDOM(`<office:text>
                <text:p>{IF(authors.count >= 3)}</text:p>
                <text:p>Many authors present</text:p>
                <text:p>{ENDIF}</text:p>
            </office:text>`)
            const text = dom.query("office:text")
            const blocks = text.queryAll(["text:p", "text:h"])
            const tags = [
                {
                    title: "authors",
                    content: [{firstname: "Jane"}, {firstname: "John"}]
                }
            ]
            render.processMultiBlockStructuredTags(blocks, tags)
            const allText = blocks.map(b => b.textContent).join(" ")
            expect(allText).not.toContain("Many authors present")
            expect(allText).not.toContain("{IF")
            expect(allText).not.toContain("{ENDIF}")
        })
    })
})

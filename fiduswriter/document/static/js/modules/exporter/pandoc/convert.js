import {convertText, convertContributor} from "./tools"

export class PandocExporterConvert {
    constructor(exporter, imageDB, bibDB, settings) {
        this.exporter = exporter
        this.settings = settings
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.imageIds = []
        this.usedBibDB = {}

        this.internalLinks = []
        this.categoryCounter = {} // counters for each type of figure (figure/table/photo)
    }

    init(article) {
        const meta = {
            lang: {"t": "MetaInlines", "c": [{"t": "Str", "c": this.settings.language.split("-")[0]}]}
        }
        const json = {
            "pandoc-api-version": [1, 23, 1],
            meta,
            blocks: this.convertContent(article.content, meta)
        }
        const returnObject = {
            json,
            imageIds: this.imageIds,
            usedBibDB: this.usedBibDB
        }
        return returnObject
    }


    // Function to convert Fidus Writer content to Pandoc format
    convertContent(docContent, meta, options = {inFootnote: false, inCode: false}) {
        const pandocContent = []
        for (const node of docContent) {
            const pandocElement = {}
            switch (node.type) {

            case "article":
                // // TODO:
                break
            case "blockquote": {
                pandocElement.t = "BlockQuote"
                break
            }
            case "bullet_list": {
                const c = []
                pandocContent.push({
                    t: "BulletList",
                    c
                })
                if (node.content) {
                    node.content.forEach(listItem => c.push(this.convertContent(listItem.content || [], meta, options)))
                }
                break
            }
            case "citation": {
                if (options.inFootnote) {
                    // TODO: handle citations in footnotes
                    break
                }
                const cit = this.exporter.citations.pmCits.shift()

                const pandocReferences = node.attrs.references.map(
                    reference => {
                        const bibDBEntry = this.bibDB.db[reference.id]
                        if (!bibDBEntry) {
                            // Not present in bibliography database, skip it.
                            return false
                        }
                        if (!this.usedBibDB[reference.id]) {
                            const citationKey = this.createUniqueCitationKey(
                                bibDBEntry.entry_key
                            )
                            this.usedBibDB[reference.id] = Object.assign({}, bibDBEntry)
                            this.usedBibDB[reference.id].entry_key = citationKey
                        }

                        return {
                            "citationId": this.usedBibDB[reference.id].entry_key,
                            "citationPrefix": convertText(reference.prefix || ""),
                            "citationSuffix": convertText(reference.locator || ""),
                            "citationMode": {
                                "t": node.attrs.format === "textcite" ? "AuthorInText" : "NormalCitation"
                            },
                            "citationNoteNum": 1,
                            "citationHash": 0
                        }
                    }
                ).filter(reference => reference)
                if (!pandocReferences.length) {
                    break
                }
                const pandocRendering = this.convertContent(cit.content, meta, options)

                pandocElement.t = "Cite"
                pandocElement.c = [
                    pandocReferences,
                    pandocRendering
                ]
                break
            }
            case "code_block": {
                options = Object.assign({}, options)
                options.inCode = true
                pandocElement.t = "Plain"
                break
            }
            case "contributor":
                // dealt with in contributors_part
                break
            case "contributors_part": {
                if (!node.content || !node.content.length) {
                    break
                }
                if (node.attrs.metadata === "authors") {
                    if (!meta.author) {
                        meta.author = {t: "MetaList", c: []}
                    }
                    const convertedContributors = node.content.map(contributor => convertContributor(contributor.attrs)).filter(convertedContributor => convertedContributor)
                    convertedContributors.forEach(contributor => meta.author.c.push(contributor))
                } else {
                    pandocElement.t = "Para"
                    const contributorText = node.content.map(contributor => `${contributor.attrs.firstname} ${contributor.attrs.lastname}, ${contributor.attrs.institution}, ${contributor.attrs.email}`).join("; ")
                    pandocElement.c = convertText(contributorText)
                }
                break
            }
            case "cross_reference": {
                // TODO: use real cross reference instead of link.
                pandocContent.push(
                    {
                        "t": "Link",
                        "c": [
                          ["", ["reference"], []],
                          convertText(node.attrs.title || "MISSING TARGET")
                          [

                            { "t": "Str", "c": "Second" },
                            { "t": "Space" },
                            { "t": "Str", "c": "heading" }
                          ],
                          [node.attrs.id, ""]
                        ]
                     }
                )
                break
            }
            case "heading_part":
            {
                if (!node.content || !node.content.length) {
                    break
                }
                if (node.attrs?.metadata === "subtitle" && !meta.subtitle) {
                    if (node.content?.length && node.content[0].content) {
                        meta.subtitle = {
                            t: "MetaInlines",
                            c: this.convertContent(
                                node.content[0].content,
                                meta,
                                options
                            )
                        }
                    }
                } else {
                    pandocElement.t = "Header"
                    pandocElement.c = [2, [node.attrs?.metadata || "", [], []]]
                }
                break
            }
            case "equation": {
                pandocContent.push({
                  "t": "Span",
                  "c": [
                    ["", ["equation"], []],
                    [
                      {
                        "t": "Math",
                        "c": [
                          { "t": "InlineMath" },
                          node.attrs.equation
                        ]
                      },
                    ]
                  ]
                })
                break
            }
            case "figure":
            {
                const image = node.content.find(node => node.type === "image")?.attrs.image || false
                const caption = node.attrs.caption ? node.content.find(node => node.type === "figure_caption")?.content || [] : []
                const equation = node.content.find(node => node.type === "figure_equation")?.attrs.equation
                if (image !== false) {
                    this.imageIds.push(image)
                    const imageDBEntry = this.imageDB.db[image],
                        filePathName = imageDBEntry.image
                    const copyright = imageDBEntry.copyright
                    const imageFilename = filePathName.split("/").pop()
                    if (
                        node.attrs.category === "none" &&
                            imageFilename &&
                            !caption.length &&
                            (!copyright || !copyright.holder)
                    ) {
                        pandocContent.push({
                            t: "Image",
                            c: [
                                [node.attrs.id, [], []],
                                [],
                                [imageFilename, ""]
                            ]
                        })
                    } else {
                        pandocContent.push({
                            t: "Figure",
                            c: [
                                [
                                    node.attrs.id,
                                    [
                                        `aligned-${node.attrs.aligned}`,
                                        `image-width-${node.attrs.width}`
                                    ],
                                    [
                                        ["aligned", node.attrs.aligned],
                                        ["data-width", String(node.attrs.width)],
                                        ["category", node.attrs.category]
                                    ]
                                ],
                                [
                                    null,
                                    caption.length ?
                                        [{
                                            t: "Para",
                                            c: this.convertContent(caption, meta, options),
                                        }] :
                                        []
                                ],
                                [{
                                    t: "Plain",
                                    c: [{
                                        t: "Image",
                                        c: [
                                            ["", [],
                                                []
                                            ],
                                            [],
                                            [imageFilename, ""]
                                        ]
                                    }]
                                }]
                            ]
                        })
                    }
                } else if (equation) {
                    pandocContent.push({
                        t: "Figure",
                        c: [
                            [
                                node.attrs.id,
                                [
                                    `aligned-${node.attrs.aligned}`,
                                    `image-width-${node.attrs.width}`
                                ],
                                [
                                    ["aligned", node.attrs.aligned],
                                    ["data-width", String(node.attrs.width)],
                                    ["category", node.attrs.category]
                                ]
                            ],
                            [
                                null,
                                caption.length ?
                                    [{
                                        t: "Para",
                                        c: this.convertContent(caption, meta, options),
                                    }] :
                                    []
                            ],
                            [{
                              "t": "Math",
                              "c": [
                                { "t": "DisplayMath" },
                                node.attrs.equation
                              ]
                            }]
                        ]
                    })
                }
                // TODO: figure attributes like 50% width, copyright info etc.
                break
            }
            case "figure_caption":
            case "figure_equation":
                // Dealt with in figure
                break
            case "footnote":
            {
                options = Object.assign({}, options)
                options.inFootnote = true
                pandocContent.push({
                    t: "Note",
                    c: this.convertContent(node.attrs.footnote, meta, options)
                })
                break
            }
            case "footnotecontainer":
                // Dealt with in footnote
                break
            case "hard_break":
                // TODO
                break
            case "heading1":
            case "heading2":
            case "heading3":
            case "heading4":
            case "heading5":
            case "heading6":
            {
                const level = parseInt(node.type.slice(-1))
                pandocContent.push({
                    t: "Header",
                    c: [level, [node.attrs.id, [], []], this.convertContent(node.content || [], meta, options)]
                })
                break
            }
            case "image":
                // Handled by figure
                break
            case "list_item":
                // handled by ordered_list and bullet_list
                break
            case "ordered_list": {
                const c = []
                pandocContent.push({
                    t: "OrderedList",
                    c: [
                        [node.attrs?.order || 1, {t: "DefaultStyle"}, {t: "DefaultDelim"}], // list attributes
                        c
                    ]
                })

                if (node.content) {
                    node.content.forEach(
                        listItem => c.push(
                            this.convertContent(listItem.content || [], meta, options)
                        )
                    )
                }
                break
            }
            case "paragraph": {
                pandocElement.t = "Para"
                break
            }
            case "richtext_part": {
                if (!node.content || !node.content.length) {
                    break
                }
                if (node.attrs?.metadata === "abstract" && !meta.abstract) {
                    meta.abstract = {
                        t: "MetaBlocks",
                        c: this.convertContent(node.content, meta, options)
                    }
                } else {
                    pandocContent.push(...this.convertContent(node.content, meta, options))
                }
                break
            }
            case "separator_part":
                // TODO
                break
            case "tag":
                // Handled by tags_part
                break
            case "tags_part": {
                if (!node.content || !node.content.length) {
                    break
                }
                pandocContent.push({
                    t: "Para",
                    c: convertText(node.content.map(tag => tag.attrs.tag).join("; "))
                })
                break
            }
            case "table": {
                // Tables seem to have this structure in pandoc json:
                // If table has no rows with content, skip.
                const tableBodyNode = node.content.find(childNode => childNode.type === "table_body" && childNode.content && childNode.content.length)
                const tableFirstRow = tableBodyNode ? tableBodyNode.content.find(childNode => childNode.type === "table_row" && childNode.content && childNode.content.length) : false
                if (!tableFirstRow) {
                    break
                }

                const c = []
                pandocContent.push({
                    t: "Table",
                    c
                })
                // child 0: attributes of the table.
                c.push(["", [
                    `table-${node.attrs.width}`,
                    `table-${node.attrs.aligned}`,
                    `table-${node.attrs.layout}`
                ], [
                    ["data-width", String(node.attrs.width)],
                    ["aligned", node.attrs.aligned],
                    ["layout", node.attrs.layout],
                    ["category", node.attrs.category]
                ]]) // TODO: Add table width attribute
                // child 1: table caption
                const tableCaptionNode =  node.content.find(childNode => childNode.type === "table_caption" && childNode.content && childNode.content.length)
                if (tableCaptionNode) {
                    c.push([null, [{t: "Plain", c: this.convertContent(tableCaptionNode.content, meta, options)}]])
                } else {
                    c.push([null, []])
                }
                // child 2: settings for each column
                c.push(tableFirstRow.content.map(_column => [{t: "AlignDefault"}, {t: "ColWidthDefault"}]))
                // child 3: ?
                c.push([["", [], []], []])
                // child 4: Each child represents one table row
                const tableHead = []
                const tableBody = []
                c.push([[["", [], []], 0, tableHead, tableBody]])
                let currentTablePart = tableHead

                this.convertContent(tableBodyNode.content, meta, options).forEach((row, index) => {
                    if (currentTablePart === tableHead && tableBodyNode.content[index].content?.find(node => node.type === "table_cell")) {
                        // If at least one regular table cell is found in the row, we assume the table header hs finished.
                        currentTablePart = tableBody
                    }
                    currentTablePart.push(row)
                })
                // last child: Unclear meaning
                c.push([["", [], []], []])
                // Don't process content as we do that by calling convertContent above already.
                //processContent = false
                break
            }
            case "table_body":
            case "table_caption":
                // Handled directly through table tag.
                break
            case "table_cell":
            case "table_header": {
                if (node.content) {
                    pandocContent.push([
                        ["", [], []],
                        {t: "AlignDefault"},
                        node.attrs?.rowspan || 1,
                        node.attrs?.colspan || 1,
                        this.convertContent(node.content, meta, options)
                    ])
                }
                break
            }
            case "table_part":
                // TODO
                break
            case "table_of_contents":
                // TODO
                break
            case "table_row": {
                pandocContent.push([["", [], []], this.convertContent(node.content, meta, options)])
                break
            }
            case "text": {
                if (node.text) {
                    let containerContent = pandocContent
                    let strong, em, underline, hyperlink
                    if (node.marks) {
                        strong = node.marks.find(mark => mark.type === "strong")
                        em = node.marks.find(mark => mark.type === "em")
                        underline = node.marks.find(mark => mark.type === "underline")
                        hyperlink = node.marks.find(mark => mark.type === "link")
                    }
                    if (em) {
                        const c = []
                        containerContent.push({
                            t: "Emph",
                            c
                        })
                        containerContent = c
                    }
                    if (strong) {
                        const c = []
                        containerContent.push({
                            t: "Strong",
                            c
                        })
                        containerContent = c
                    }
                    if (underline) {
                        const c = []
                        containerContent.push({
                            t: "Underline",
                            c
                        })
                        containerContent = c
                    }
                    if (hyperlink) {
                        const c = []
                        containerContent.push({
                            t: "Link",
                            c
                        })
                        containerContent = c
                    }
                    if (options.inCode) {
                        containerContent.push({
                            t: "Code",
                            c: [
                                ["", [], []],
                                node.text
                            ]
                        })
                    } else {
                        containerContent.push(...convertText(node.text || ""))
                    }

                    if (hyperlink) {
                        // link address is added at end of content
                        containerContent.push([hyperlink.attrs.href, ""])
                    }

                }
                break
            }
            case "title": {
                if (!node.content || !node.content.length) {
                    break
                }
                if (!meta.title) {
                    meta.title = {
                        t: "MetaInlines",
                        c: this.convertContent(node.content, meta, options)
                    }
                } else {
                    pandocElement.t = "Header"
                    pandocElement.c = [1, ["title", [], []]]
                }
                break
            }
            default: {
                console.log(`Not handled: ${node.type}`, {node})
                break
            }
            }
            if (pandocElement.t) {
                if (node.content) {
                    pandocElement.c = pandocElement.c || []
                    this.convertContent(node.content, meta, options).forEach(el => pandocElement.c.push(el))
                }
                pandocContent.push(pandocElement)
            }
        }
        return pandocContent
    }

    // The database doesn't ensure that citation keys are unique.
    // So here we need to make sure that the same key is not used twice in one
    // document.
    createUniqueCitationKey(suggestedKey) {
        const usedKeys = Object.keys(this.usedBibDB).map(key => {
            return this.usedBibDB[key].entry_key
        })
        if (usedKeys.includes(suggestedKey)) {
            suggestedKey += "X"
            return this.createUniqueCitationKey(suggestedKey)
        } else {
            return suggestedKey
        }
    }

}

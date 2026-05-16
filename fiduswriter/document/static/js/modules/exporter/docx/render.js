import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/i18n"
import {textContent} from "../tools/doc_content"
import {xmlDOM} from "../tools/xml"

export class DOCXExporterRender {
    constructor(xml) {
        this.xml = xml

        this.filePath = false // "word/document.xml" or "word/document2.xml" in some cases
        this.ctXML = false
        this.text = false
    }

    init() {
        return this.xml
            .getXml("[Content_Types].xml")
            .then(ctXML => {
                this.ctXML = ctXML
                const documentOverride = this.ctXML.query("Override", {
                    ContentType:
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
                })
                this.filePath = documentOverride
                    .getAttribute("PartName")
                    .slice(1)
                return this.xml.getXml(this.filePath)
            })
            .then(xml => {
                this.text = xml
                // Ensure we support the three latest docx feature sets:
                // wp14 (drawing 2010), w14 (word 2010), w15 (word 2012)
                const documentEl = this.text.query("w:document")
                if (!documentEl.getAttribute("xmlns:wp14")) {
                    documentEl.setAttribute(
                        "xmlns:wp14",
                        "http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
                    )
                }
                if (!documentEl.getAttribute("xmlns:w14")) {
                    documentEl.setAttribute(
                        "xmlns:w14",
                        "http://schemas.microsoft.com/office/word/2010/wordml"
                    )
                }
                if (!documentEl.getAttribute("xmlns:w15")) {
                    documentEl.setAttribute(
                        "xmlns:w15",
                        "http://schemas.microsoft.com/office/word/2012/wordml"
                    )
                }
                const ignorable = [
                    ...new Set(
                        ["w14", "wp14", "w15"].concat(
                            documentEl
                                .getAttribute("mc:Ignorable", "")
                                .split(" ")
                                .filter(item => item.length)
                        )
                    )
                ]
                documentEl.setAttribute("mc:Ignorable", ignorable.join(" "))
                return Promise.resolve()
            })
    }

    parseStructuredTags(block, tag) {
        let blockText = block.textContent
        const tagName = tag.title

        // Check for BEGIN...END loops (with optional limit)
        const beginStartRegex = new RegExp(
            `\\{BEGIN_${tagName}(?::limit=(\\d+))?\\}`
        )
        const beginStartMatch = blockText.match(beginStartRegex)

        if (
            beginStartMatch &&
            tag.content &&
            Array.isArray(tag.content) &&
            tag.content.length > 0
        ) {
            const limit = beginStartMatch[1]
                ? parseInt(beginStartMatch[1])
                : null
            const beginStart = beginStartMatch.index
            const beginEnd = beginStart + beginStartMatch[0].length

            // Find matching {END_tag}
            const endTag = `{END_${tagName}}`
            const endPos = blockText.indexOf(endTag, beginEnd)
            if (endPos === -1) {
                console.warn(`Missing ${endTag} for ${tagName}`)
                return
            }

            const templateXml = blockText.slice(beginEnd, endPos)
            const replacementXml = this.processLoop(
                templateXml,
                tag.content,
                tagName,
                limit
            )

            const beforeText = blockText.slice(0, beginStart)
            const afterText = blockText.slice(endPos + endTag.length)
            const fullReplacement = beforeText + replacementXml + afterText

            block.innerXML = fullReplacement
            return
        }

        // Check for IF...ELIF...ELSE...ENDIF conditionals
        blockText = this.processConditionals(blockText, {
            tagName,
            count: tag.content ? tag.content.length : 0,
            content: tag.content || []
        })

        if (blockText !== block.textContent) {
            block.innerXML = blockText
        }
    }

    processLoop(templateXml, items, tagName, limit = null) {
        const effectiveItems = limit !== null ? items.slice(0, limit) : items
        const results = []

        effectiveItems.forEach((item, index) => {
            const loopCtx = {
                count: items.length,
                index: index,
                first: index === 0,
                last: index === effectiveItems.length - 1,
                item: item,
                content: [item],
                odd: index % 2 === 1,
                even: index % 2 === 0
            }

            let itemXml = templateXml

            // Replace field placeholders
            if (typeof item === "string") {
                itemXml = itemXml.replace(/%tag/g, escapeText(item))
            } else {
                itemXml = itemXml
                    .replace(
                        /\{?%firstname\}?/g,
                        escapeText(item.firstname || "")
                    )
                    .replace(
                        /\{?%lastname\}?/g,
                        escapeText(item.lastname || "")
                    )
                    .replace(
                        /\{?%institution\}?/g,
                        escapeText(item.institution || "")
                    )
                    .replace(/\{?%email\}?/g, escapeText(item.email || ""))
                    .replace(/\{?%id_type\}?/g, escapeText(item.id_type || ""))
                    .replace(
                        /\{?%id_value\}?/g,
                        escapeText(item.id_value || "")
                    )
            }

            // Handle conditionals inside the loop
            itemXml = this.processConditionals(itemXml, {tagName, ...loopCtx})

            // Handle special delimiters for DOCX
            itemXml = itemXml.replace(/\\n/g, "<w:br/>")
            itemXml = itemXml.replace(/\\p/g, "</w:p><w:p>")

            results.push(itemXml)
        })

        return results.join("")
    }

    processConditionals(text, ctx) {
        let result = text
        let changed = true
        while (changed) {
            changed = false
            const ifStart = result.indexOf("{IF(")
            if (ifStart === -1) {
                break
            }

            let depth = 1
            let pos = ifStart + 4 // skip {IF(
            // Find the closing ) of the IF expression
            while (pos < result.length && result[pos] !== ")") {
                pos++
            }
            if (pos >= result.length) {
                break
            }
            pos++ // skip )

            // Now scan for matching {ENDIF}
            while (pos < result.length && depth > 0) {
                if (result.substr(pos, 4) === "{IF(") {
                    depth++
                    pos += 4
                } else if (result.substr(pos, 7) === "{ENDIF}") {
                    depth--
                    if (depth > 0) {
                        pos += 7
                    }
                } else {
                    pos++
                }
            }

            if (depth === 0) {
                const exprEnd = result.indexOf(")", ifStart + 4)
                const ifExpr = result.slice(ifStart + 4, exprEnd)
                // Skip the closing } of {IF(...)} if present
                let innerStart = exprEnd + 1
                if (result[innerStart] === "}") {
                    innerStart++
                }
                const innerContent = result.slice(innerStart, pos)

                const conditions = []
                conditions.push({expr: ifExpr, content: ""})

                const remaining = innerContent
                let lastIndex = 0

                const elifRegex = /\{ELIF\(([^)]+)\)\}/g
                let elifMatch
                while ((elifMatch = elifRegex.exec(remaining)) !== null) {
                    conditions[conditions.length - 1].content = remaining.slice(
                        lastIndex,
                        elifMatch.index
                    )
                    conditions.push({expr: elifMatch[1], content: ""})
                    lastIndex = elifMatch.index + elifMatch[0].length
                }

                const elseMatch = remaining.slice(lastIndex).match(/\{ELSE\}/)
                if (elseMatch) {
                    conditions[conditions.length - 1].content = remaining.slice(
                        lastIndex,
                        lastIndex + elseMatch.index
                    )
                    conditions.push({
                        expr: null,
                        content: remaining.slice(
                            lastIndex + elseMatch.index + elseMatch[0].length
                        )
                    })
                } else {
                    conditions[conditions.length - 1].content =
                        remaining.slice(lastIndex)
                }

                let replacement = ""
                for (const cond of conditions) {
                    if (
                        cond.expr === null ||
                        this.evaluateExpression(cond.expr, ctx)
                    ) {
                        replacement = cond.content
                        break
                    }
                }

                result =
                    result.slice(0, ifStart) +
                    replacement +
                    result.slice(pos + 7)
                changed = true
            }
        }
        return result
    }

    evaluateExpression(expr, ctx) {
        try {
            // Allow explicit tag name references (e.g., authors.count -> ctx.count)
            if (ctx.tagName) {
                const safeTagName = ctx.tagName.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                )
                expr = expr.replace(
                    new RegExp(`\\b${safeTagName}\\b`, "g"),
                    "ctx"
                )
            }

            // Replace ctx.property accesses with literal values
            const evalExpr = expr.replace(
                /ctx\.(\w+)(?:\.(\w+))?(?:\[(\d+)\])?/g,
                (_match, p1, p2, p3) => {
                    let val = ctx[p1]
                    if (p2 !== undefined && val !== undefined) {
                        val = val[p2]
                    }
                    if (p3 !== undefined && val !== undefined) {
                        val = val[parseInt(p3)]
                    }
                    return JSON.stringify(val)
                }
            )

            // Remove string literals before character check
            const safeExpr = evalExpr.replace(
                /"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g,
                '""'
            )

            // Check for unknown identifiers
            const bareIdRegex = /\b[a-zA-Z_]\w*\b/g
            const allowed = ["true", "false", "null", "undefined"]
            let m
            while ((m = bareIdRegex.exec(safeExpr)) !== null) {
                if (!allowed.includes(m[0])) {
                    console.warn(
                        "Unknown identifier in expression:",
                        m[0],
                        "expression:",
                        expr
                    )
                    return false
                }
            }

            // Check for unsafe characters
            if (/[^ \t\n\r0-9a-zA-Z_\.\+\-*\/%==<>!&|()\[\]]/.test(safeExpr)) {
                console.warn("Unsafe characters in expression:", expr)
                return false
            }

            return new Function(`return (${evalExpr})`)()
        } catch (e) {
            console.warn("Error evaluating expression:", expr, e)
            return false
        }
    }

    processMultiBlockStructuredTags(blocks, tags) {
        const tagMap = {}
        tags.forEach(tag => {
            if (tag.title) {
                tagMap[tag.title] = tag
            }
        })

        // Process from end to start to avoid index shifting issues
        for (let i = blocks.length - 1; i >= 0; i--) {
            const block = blocks[i]
            const text = block.textContent

            // Check for multi-block BEGIN...END loops
            for (const tag of tags) {
                if (!tag.title || !tag.content || !Array.isArray(tag.content)) {
                    continue
                }
                const tagName = tag.title
                const beginRegex = new RegExp(
                    `\\{BEGIN_${tagName}(?::limit=(\\d+))?\\}`
                )
                const beginMatch = text.match(beginRegex)
                if (!beginMatch) {
                    continue
                }

                // Find matching END in a later block
                let endIndex = -1
                for (let j = i + 1; j < blocks.length; j++) {
                    if (blocks[j].textContent.includes(`{END_${tagName}}`)) {
                        endIndex = j
                        break
                    }
                }

                if (endIndex === -1 || endIndex === i) {
                    continue
                }

                // Found multi-block loop - process it
                const limit = beginMatch[1] ? parseInt(beginMatch[1]) : null
                this._replaceMultiBlockLoop(blocks, i, endIndex, tag, limit)
                // Adjust i since blocks array was modified
                i = Math.min(i, blocks.length - 1)
                break // Only process one loop per block per iteration
            }
        }

        // Process multi-block conditionals from end to start
        for (let i = blocks.length - 1; i >= 0; i--) {
            const block = blocks[i]
            const text = block.textContent
            const ifMatch = text.match(/\{IF\(([^)]+)\)\}/)
            if (!ifMatch) {
                continue
            }

            // Find matching ENDIF in a later block
            let endIndex = -1
            for (let j = i + 1; j < blocks.length; j++) {
                if (/\{ENDIF\}/.test(blocks[j].textContent)) {
                    endIndex = j
                    break
                }
            }

            if (endIndex === -1 || endIndex === i) {
                continue
            }

            this._replaceMultiBlockConditional(
                blocks,
                i,
                endIndex,
                ifMatch[1],
                tagMap
            )
            i = Math.min(i, blocks.length - 1)
        }
    }

    _replaceMultiBlockLoop(blocks, beginIndex, endIndex, tag, limit) {
        const tagName = tag.title
        const beginBlock = blocks[beginIndex]

        // Concatenate all blocks from begin to end
        let combinedXml = ""
        for (let i = beginIndex; i <= endIndex; i++) {
            combinedXml += blocks[i].toString()
        }

        // Find the BEGIN and END tags in the combined XML
        const beginRegex = new RegExp(`\\{BEGIN_${tagName}(?::limit=\\d+)?\\}`)
        const beginMatch = combinedXml.match(beginRegex)
        const endTag = `{END_${tagName}}`
        const endPos = combinedXml.indexOf(endTag)

        if (!beginMatch || endPos === -1) {
            return
        }

        const beforeXml = combinedXml.slice(0, beginMatch.index)
        const templateXml = combinedXml.slice(
            beginMatch.index + beginMatch[0].length,
            endPos
        )
        const afterXml = combinedXml.slice(endPos + endTag.length)

        // Decode &gt; so expressions like >= work in nested conditionals
        const decodedTemplateXml = templateXml.replace(/&gt;/g, ">")
        const replacementXml = this.processLoop(
            decodedTemplateXml,
            tag.content,
            tagName,
            limit
        )
        const fullReplacement = beforeXml + replacementXml + afterXml

        // Parse replacement
        const parent = beginBlock.parentElement
        const dom = xmlDOM(`<root>${fullReplacement}</root>`)
        const root = dom.query("root")
        const newBlocks = root.children.filter(
            child => child.tagName === "w:p" || child.tagName === "w:sectPr"
        )

        // Insert new blocks before begin block
        for (let i = newBlocks.length - 1; i >= 0; i--) {
            parent.insertBefore(newBlocks[i], beginBlock)
        }

        // Remove old blocks
        for (let i = endIndex; i >= beginIndex; i--) {
            parent.removeChild(blocks[i])
        }

        // Update blocks array
        blocks.splice(beginIndex, endIndex - beginIndex + 1, ...newBlocks)
    }

    _replaceMultiBlockConditional(blocks, ifIndex, endIndex, expr, tagMap) {
        const ifBlock = blocks[ifIndex]

        // Concatenate all blocks from if to endif
        let combinedXml = ""
        for (let i = ifIndex; i <= endIndex; i++) {
            combinedXml += blocks[i].toString()
        }

        // Determine which tag the expression references
        let ctx = {count: 0, content: []}
        for (const tagName in tagMap) {
            const safeTagName = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
            if (new RegExp(`\\b${safeTagName}\\b`).test(expr)) {
                const tag = tagMap[tagName]
                ctx = {
                    tagName: tag.title,
                    count: tag.content ? tag.content.length : 0,
                    content: tag.content || []
                }
                break
            }
        }

        // Decode &gt; so expressions like >= work in conditionals
        const decodedXml = combinedXml.replace(/&gt;/g, ">")
        // Process conditionals on the combined XML
        const processedXml = this.processConditionals(decodedXml, ctx)

        if (processedXml === combinedXml) {
            return
        }

        // Parse and replace
        const parent = ifBlock.parentElement
        const dom = xmlDOM(`<root>${processedXml}</root>`)
        const root = dom.query("root")
        const newBlocks = root.children.filter(
            child => child.tagName === "w:p" || child.tagName === "w:sectPr"
        )

        for (let i = newBlocks.length - 1; i >= 0; i--) {
            parent.insertBefore(newBlocks[i], ifBlock)
        }

        for (let i = endIndex; i >= ifIndex; i--) {
            parent.removeChild(blocks[i])
        }

        blocks.splice(ifIndex, endIndex - ifIndex + 1, ...newBlocks)
    }

    // Define the tags that are to be looked for in the document
    getTagData(docContent, pmBib, settings) {
        const tags = docContent.content.map(node => {
            const tag = {}
            switch (node.type) {
                case "title":
                    tag.title = "title"
                    tag.content = textContent(node)
                    break
                case "heading_part":
                    tag.title = node.attrs.id
                    tag.content = textContent(node)
                    break
                case "table_part":
                case "richtext_part":
                    tag.title = `@${node.attrs.id}`
                    tag.content = node.content
                    break
                case "contributors_part":
                    tag.title = node.attrs.id
                    // Return array of structured objects for format with delimiter support
                    tag.content = node.content
                        ? node.content.map(node => {
                              const c = node.attrs
                              return {
                                  firstname: c.firstname || "",
                                  lastname: c.lastname || "",
                                  institution: c.institution || "",
                                  email: c.email || "",
                                  id_type: c.id_type || "",
                                  id_value: c.id_value || ""
                              }
                          })
                        : []
                    break
                case "tags_part":
                    tag.title = node.attrs.id
                    // Return array of tag strings for format with delimiter support
                    tag.content = node.content
                        ? node.content.map(node => node.attrs.tag)
                        : []
                    break
            }
            return tag
        })

        let bibliographyContent
        if (pmBib && pmBib.content && pmBib.content.length > 0) {
            // Add bibliography heading and mark first/last items
            const firstPmBib = pmBib.content[0]
            const lastPmBib = pmBib.content[pmBib.content.length - 1]
            firstPmBib.attrs = firstPmBib.attrs || {}
            firstPmBib.attrs.first = true
            lastPmBib.attrs = lastPmBib.attrs || {}
            lastPmBib.attrs.last = true
            const bibliographyHeader =
                settings.bibliography_header[settings.language] ||
                BIBLIOGRAPHY_HEADERS[settings.language]
            bibliographyContent = [
                {
                    type: "bibliography_heading",
                    content: [{type: "text", text: bibliographyHeader}]
                },
                pmBib
            ]
        } else {
            // No bibliography content, add a placeholder paragraph
            bibliographyContent = [
                {type: "paragraph", content: [{type: "text", text: " "}]}
            ]
        }

        // Add bibliography content
        tags.push({
            title: "@bibliography", // The '@' triggers handling as block
            content: bibliographyContent
        })

        tags.push({
            title: "@copyright", // The '@' triggers handling as block
            content:
                settings.copyright && settings.copyright.holder
                    ? [
                          {
                              type: "paragraph",
                              content: [
                                  {
                                      type: "text",
                                      text: `© ${settings.copyright.year ? settings.copyright.year : new Date().getFullYear()} ${settings.copyright.holder}`
                                  }
                              ]
                          }
                      ]
                    : [
                          {
                              type: "paragraph",
                              content: [{type: "text", text: " "}]
                          }
                      ]
        })
        tags.push({
            title: "@licenses", // The '@' triggers handling as block
            content:
                settings.copyright && settings.copyright.licenses.length
                    ? settings.copyright.licenses.map(license => ({
                          type: "paragraph",
                          content: [
                              {
                                  type: "text",
                                  marks: [
                                      {
                                          type: "link",
                                          attrs: {
                                              href: license.url,
                                              title: license.title
                                          }
                                      }
                                  ],
                                  text: license.title
                              },
                              {
                                  type: "text",
                                  text: license.start
                                      ? ` (${license.start})`
                                      : ""
                              }
                          ]
                      }))
                    : [
                          {
                              type: "paragraph",
                              content: [{type: "text", text: " "}]
                          }
                      ]
        })

        return tags
    }

    // go through document.xml looking for tags and replace them with the given
    // replacements.
    render(docContent, pmBib, settings, richtext, citations) {
        const tags = this.getTagData(docContent, pmBib, settings)

        // Including global page definition at end
        const blocks = this.text.queryAll(["w:p", "w:sectPr"])

        // Process multi-block structured tags first (BEGIN...END across paragraphs)
        this.processMultiBlockStructuredTags(blocks, tags)

        const currentTags = []
        blocks.forEach(block => {
            // Assuming there is nothing outside of <w:t>...</w:t>
            const text = block.textContent
            tags.forEach(tag => {
                const tagString = tag.title
                const hasInlineTag =
                    text.includes(`{${tagString}}`) ||
                    text.includes(`{${tagString}:format=`)
                const hasBeginTag = text.includes(`{BEGIN_${tagString}}`)
                const hasIfTag =
                    text.includes(`{IF(${tagString}.`) ||
                    text.includes(`{IF(ctx.`)
                if (hasInlineTag || hasBeginTag || hasIfTag) {
                    currentTags.push(tag)
                    tag.block = block
                    // We don't worry about the same tag appearing twice in the document,
                    // as that would make no sense.
                }
            })

            // Parse structured tags (BEGIN...END and IF...ENDIF)
            currentTags.forEach(tag => {
                if (tag.block) {
                    this.parseStructuredTags(tag.block, tag)
                }
            })

            const pageSize = block.query("w:pgSz")
            const pageMargins = block.query("w:pgMar")
            const cols = block.query("w:cols")
            if (pageSize && pageMargins) {
                // Not sure if these all need to come together
                let width =
                    Number.parseInt(pageSize.getAttribute("w:w")) -
                    Number.parseInt(pageMargins.getAttribute("w:right")) -
                    Number.parseInt(pageMargins.getAttribute("w:left"))
                const height =
                    Number.parseInt(pageSize.getAttribute("w:h")) -
                    Number.parseInt(pageMargins.getAttribute("w:bottom")) -
                    Number.parseInt(pageMargins.getAttribute("w:top")) -
                    Number.parseInt(pageMargins.getAttribute("w:header")) -
                    Number.parseInt(pageMargins.getAttribute("w:footer"))

                const colCount = cols
                    ? Number.parseInt(cols.getAttribute("w:num"))
                    : 1
                if (colCount > 1) {
                    const colSpace = Number.parseInt(
                        cols.getAttribute("w:space")
                    )
                    width = width - colSpace * (colCount - 1)
                    width = width / colCount
                }
                while (currentTags.length) {
                    const tag = currentTags.pop()
                    tag.dimensions = {
                        width: width * 635, // convert to EMU
                        height: height * 635 // convert to EMU
                    }
                }
            }
        })
        tags.forEach(tag => {
            if (!tag.title) {
                return
            } else if (tag.title[0] === "@") {
                this.blockRender(tag, citations, richtext)
            } else {
                this.inlineRender(tag)
            }
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        if (!tag.block) {
            return
        }
        const blockText = tag.block.textContent
        const tagString = `{${tag.title}}`

        if (!blockText.includes(`{${tag.title}`)) {
            // No inline tag present - structured tags only
            return
        }

        // Check for format string with delimiter: {tag:format=%firstname|; }
        const formatRegex = new RegExp(
            `\\{${tag.title}:format=([^|]+)\\|?([^}]*)?\\}`
        )
        const formatMatch = blockText.match(formatRegex)

        let fullText = ""

        if (formatMatch && tag.content && Array.isArray(tag.content)) {
            // Find format string and delimiter
            const [, format, delimiter = "; "] = formatMatch

            // Process each item with the format string
            const formattedItems = tag.content
                .map(item => {
                    if (typeof item === "string") {
                        // For tags (simple strings)
                        return format.replace(/%tag/g, item)
                    } else {
                        // For contributors (objects)
                        return format
                            .replace(/%firstname/g, item.firstname || "")
                            .replace(/%lastname/g, item.lastname || "")
                            .replace(/%institution/g, item.institution || "")
                            .replace(/%email/g, item.email || "")
                            .replace(/%id_type/g, item.id_type || "")
                            .replace(/%id_value/g, item.id_value || "")
                    }
                })
                .filter(s => s.trim() !== "")

            // Handle special delimiters
            let delimiterText = delimiter
            delimiterText = delimiterText.replace(/\\n/g, "\n")
            delimiterText = delimiterText.replace(/\\p/g, "\n\n")

            const replacement = formattedItems.join(delimiterText)
            fullText = blockText.replace(formatRegex, replacement)
        } else {
            // Fall back to simple string replacement (backward compatible)
            let contentStr = tag.content || ""
            if (Array.isArray(contentStr)) {
                if (contentStr.length === 0) {
                    contentStr = ""
                } else if (typeof contentStr[0] === "string") {
                    contentStr = contentStr.join(", ")
                } else {
                    // Contributors - backward compatible formatting
                    contentStr = contentStr
                        .map(item => {
                            const nameParts = []
                            let affiliation = false
                            if (item.firstname) {
                                nameParts.push(item.firstname)
                            }
                            if (item.lastname) {
                                nameParts.push(item.lastname)
                            }
                            if (item.institution) {
                                if (nameParts.length) {
                                    affiliation = item.institution
                                } else {
                                    nameParts.push(item.institution)
                                }
                            }
                            const parts = [nameParts.join(" ")]
                            if (affiliation) {
                                parts.push(affiliation)
                            }
                            if (item.email) {
                                parts.push(item.email)
                            }
                            return parts.join(", ")
                        })
                        .join("; ")
                }
            }
            const texts = blockText.split(tagString)
            fullText = texts[0] + contentStr + texts[1]
        }

        // Apply the replacement
        const rs = tag.block.queryAll("w:r").reverse()
        let lastR
        // Remove all <w:r> with text in them (<w:t>).
        // Exclude <w:r> used for other things, like page breaks.
        rs.forEach(r => {
            if (r.query("w:t")) {
                if (lastR) {
                    r.parentElement.removeChild(r)
                } else {
                    lastR = r
                }
            }
        })
        if (!lastR) {
            // This should not be possible. Error.
            return
        }
        if (fullText.length) {
            if (fullText.includes("\n")) {
                // Split on newlines and create <w:t> elements separated by <w:br/>
                const parts = fullText.split("\n").map(part => escapeText(part))
                lastR.innerXML = parts
                    .map((part, index) => {
                        const br = index > 0 ? "<w:br/>" : ""
                        return `${br}<w:t xml:space="preserve">${part}</w:t>`
                    })
                    .join("")
            } else {
                let textAttr = ""
                if (
                    fullText[0] === " " ||
                    fullText[fullText.length - 1] === " "
                ) {
                    textAttr += 'xml:space="preserve"'
                }
                lastR.innerXML = `<w:t ${textAttr}>${escapeText(fullText)}</w:t>`
            }
        } else {
            lastR.parentElement.removeChild(lastR)
        }
    }

    // Render tags that exchange paragraphs
    blockRender(tag, citations, richtext) {
        if (!tag.block) {
            return
        }
        const pStyle = tag.block.query("w:pStyle")
        const options = {
            dimensions: tag.dimensions,
            citationType: citations.citFm.citationType,
            section: pStyle ? pStyle.getAttribute("w:val") : "Normal",
            tag: tag.title.slice(1)
        }
        const outXML = tag.content
            ? tag.content
                  .map((content, i) =>
                      richtext.run(content, options, tag.content[i + 1])
                  )
                  .join("")
            : ""
        if (!outXML.length) {
            // If there is no content, we need to put in a space to prevent the
            // tag from being removed.
            tag.block.innerXML = '<w:r><w:t xml:space="preserve"> </w:t></w:r>'
            return
        }
        const parentElement = tag.block.parentElement
        const dom = xmlDOM(outXML)
        const domPars = dom.node["#document"]?.slice() || [dom]
        domPars.forEach(node => parentElement.insertBefore(node, tag.block))
        // sectPr contains information about columns, etc. We need to move this
        // to the last paragraph we will be adding.
        const sectPr = tag.block.query("w:sectPr")
        if (sectPr) {
            const pPr = tag.block.previousSibling.query("w:pPr")
            pPr.appendChild(sectPr)
        }
        parentElement.removeChild(tag.block)
    }
}

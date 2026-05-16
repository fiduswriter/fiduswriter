import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/i18n"
import {textContent} from "../tools/doc_content"
import {xmlDOM} from "../tools/xml"

/**
 * Create Zotero bibliography reference mark name for ODT.
 * @returns {string} Reference mark name
 */
export function createOdtBibliographyMark() {
    return "ZOTERO_BIBL CSL_BIBLIOGRAPHY"
}

export class ODTExporterRender {
    constructor(xml) {
        this.xml = xml

        this.filePath = "content.xml"
        this.text = false
    }

    init() {
        return this.xml.getXml(this.filePath).then(xml => {
            this.text = xml.query("office:text")
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

            // Handle special delimiters for ODT
            itemXml = itemXml.replace(/\\n/g, "<text:line-break/>")
            itemXml = itemXml.replace(/\\p/g, "</text:p><text:p>")

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
        const bibliographyHeader =
            settings.bibliography_header[settings.language] ||
            BIBLIOGRAPHY_HEADERS[settings.language]
        tags.push({
            title: "@bibliography", // The '@' triggers handling as block
            content: pmBib
                ? [
                      {
                          type: "bibliography_heading",
                          content: [{type: "text", text: bibliographyHeader}]
                      },
                      pmBib
                  ]
                : [{type: "paragraph", content: [{type: "text", text: " "}]}]
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
                                              title: license.url
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
                i = Math.min(i, blocks.length - 1)
                break
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
            child => child.tagName === "text:p" || child.tagName === "text:h"
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
            child => child.tagName === "text:p" || child.tagName === "text:h"
        )

        for (let i = newBlocks.length - 1; i >= 0; i--) {
            parent.insertBefore(newBlocks[i], ifBlock)
        }

        for (let i = endIndex; i >= ifIndex; i--) {
            parent.removeChild(blocks[i])
        }

        blocks.splice(ifIndex, endIndex - ifIndex + 1, ...newBlocks)
    }

    // go through content.xml looking for tags and replace them with the given
    // replacements.
    render(docContent, pmBib, settings, richtext, citations) {
        const tags = this.getTagData(docContent, pmBib, settings)
        const textBlocks = this.text.queryAll(["text:p", "text:h"])

        // Process multi-block structured tags first (BEGIN...END across paragraphs)
        this.processMultiBlockStructuredTags(textBlocks, tags)

        textBlocks.forEach(block => {
            if (block.parentElement.nodeName === "text:deletion") {
                // Inside of tracked changes deletion, don't do anything
                return
            }
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
                    tag.block = block
                    if (hasInlineTag && tag.title[0] === "@") {
                        this.blockRender(tag, richtext, citations)
                    } else if (hasInlineTag && tag.title[0] !== "@") {
                        this.inlineRender(tag)
                    }
                }
            })

            // Parse structured tags (BEGIN...END and IF...ENDIF)
            tags.forEach(tag => {
                if (tag.block) {
                    this.parseStructuredTags(tag.block, tag)
                }
            })
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        const blockText = tag.block.textContent
        const tagString = tag.title

        if (!blockText.includes(`{${tag.title}`)) {
            // No inline tag present - structured tags only
            return
        }

        // Check for format string with delimiter: {tag:format=%firstname|; }
        const formatRegex = new RegExp(
            `\\{${tagString}:format=([^|]+)\\|?([^}]*)?\\}`
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

            // Handle special delimiters for ODT
            let delimiterXml = delimiter
            delimiterXml = delimiterXml.replace(/\\n/g, "<text:line-break/>")
            delimiterXml = delimiterXml.replace(
                /\\p/g,
                "<text:line-break/><text:line-break/>"
            )

            const replacement = formattedItems.join(delimiterXml)
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
            const texts = blockText.split(`{${tagString}}`)
            fullText = texts[0] + contentStr + texts[1]
        }

        // Escape text but restore ODT XML line break tags
        fullText = escapeText(fullText).replace(
            /&lt;text:line-break\/&gt;/g,
            "<text:line-break/>"
        )

        tag.block.innerXML = fullText.replace(/^\s+|\s+$/g, match =>
            "<text:s/>".repeat(match.length)
        )
    }

    // Render tags that exchange text blocks
    blockRender(tag, richtext, citations) {
        const section = tag.block.hasAttribute("text:style-name")
            ? tag.block.getAttribute("text:style-name")
            : "Text_20_body"
        const outXML = tag.content
            ? tag.content
                  .map((content, contentIndex) =>
                      richtext.run(
                          content,
                          {
                              citationType: citations.citFm.citationType,
                              section,
                              tag: tag.title.slice(1)
                          },
                          tag,
                          contentIndex
                      )
                  )
                  .join("")
            : ""

        if (!outXML.length) {
            // If there is no content, we need to put in a space to prevent the
            // tag from being removed by LibreOffice.
            tag.block.innerXML = "<text:s/>"
            return
        }
        const parentElement = tag.block.parentElement
        const dom = xmlDOM(outXML)
        const domPars = dom.node["#document"]?.slice() || [dom]
        domPars.forEach(node => parentElement.insertBefore(node, tag.block))

        parentElement.removeChild(tag.block)
    }
}

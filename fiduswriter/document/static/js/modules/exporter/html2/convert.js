import {convertLatexToMarkup} from "mathlive"
import pretty from "pretty"

import {escapeText} from "../../common"
import {CATS} from "../../schema/i18n"

import {htmlExportTemplate} from "./templates"

export class HTMLExporterConvert {
    constructor(exporter, imageDB, bibDB, settings, xhtml = false, epub = false) {
        this.exporter = exporter
        this.settings = settings
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.xhtml = xhtml
        this.epub = epub
        this.endSlash = this.xhtml ? "/" : ""

        this.imageIds = []
        this.categoryCounter = {} // counters for each type of figure (figure/table/photo)
        this.affiliations = {} // affiliations of authors and editors
        this.affCounter = 0
        this.parCounter = 0
        this.headingCounter = 0
        this.currentSectionLevel = 0
        this.listCounter = 0
        this.orderedListLengths = []
        this.footnotes = []
        this.fnCounter = 0
        this.metaData = {
            title: this.exporter.docTitle,
            contributors: [],
            abstract: false,
            keywords: [],
            copyright: {
                licenses: []
            }
        }
        this.features = {
            math: false
        }
        this.citInfos = []
        this.citationCount = 0
    }

    init(docContent) {
        this.preWalkJson(docContent)
        this.findCitations(docContent)
        return this.exporter.citations.init(this.citInfos).then(() => {
            const body = this.assembleBody(docContent)
            const back = this.assembleBack()
            const head = this.assembleHead()
            const html = htmlExportTemplate({
                head,
                body,
                back,
                settings: this.exporter.doc.settings,
                lang: this.exporter.doc.settings.language.split("-")[0],
                xhtml: this.xhtml
            })
            return {
                html,
                imageIds: this.imageIds
            }
        })
    }

    // Find information for meta tags in header
    preWalkJson(node, parentNode = false) {
        switch (node.type) {
        case "article":
            this.metaData.copyright = node.attrs.copyright
            break
        case "title":
        {
            const title = this.textWalkJson(node)
            if (title.length) {
                this.metaData.title = title
            }
            break
        }
        case "richtext_part":
            if (
                node.attrs.metadata === "abstract" &&
                    !node.attrs.language &&
                    this.metaData.abstract
            ) {
                this.metaData.abstract = this.walkJson(node)
            }
            break
        case "tags_part":
            if (
                node.attrs.metadata === "keywords" &&
                node.content
            ) {
                node.content.forEach(tag => {
                    this.metaData.keywords.push(tag.attrs.tag)
                })
            }
            break
        case "contributors_part":
            this.metaData.contributors.push(node)
            parentNode.content = parentNode.content.filter(child => child !== node)
            break
        case "equation":
        case "figure_equation":
            this.features.math = true
            this.exporter.addMathliveStylesheet()
            break
        default:
            break
        }
        if (node.content) {
            node.content.forEach(child => this.preWalkJson(child, node))
        }
    }

    findCitations(node) {
        switch (node.type) {
        case "citation":
            this.citInfos.push(JSON.parse(JSON.stringify(node.attrs)))
            break
        case "footnote":
            node.attrs.footnote.forEach(child => this.findCitations(child))
            break
        default:
            break
        }
        if (node.content) {
            node.content.forEach(child => this.findCitations(child))
        }
    }

    assembleHead() {
        let head = `<title>${escapeText(this.metaData.title)}</title>`
        this.metaData.contributors.forEach(contributors => {
            head += this.walkJson(contributors)
        })
        Object.entries(this.affiliations).forEach(([institution, index]) => head += `<aff id="aff${index}"><institution>${escapeText(institution)}</institution></aff>`)
        // https://validator.jats4r.org/ requires a <permissions> element here, but is OK with it being empty.
        if (this.metaData.copyright.holder) {
            head  += `<link rel="schema.dcterms" href="http://purl.org/dc/terms/"${this.endSlash}>`
            const year = this.metaData.copyright.year ? this.metaData.copyright.year : new Date().getFullYear()
            head += `<meta name="dcterms.dateCopyrighted" content="${year}"${this.endSlash}>`
            head += `<meta name="dcterms.rightsHolder" content="${escapeText(this.metaData.copyright.holder)}"${this.endSlash}>`
            // TODO: Add this.metaData.copyright.freeToRead if present

            head += this.metaData.copyright.licenses.map(license =>
                `<link rel="license" href="${escapeText(license.url)}"${this.endSlash}>` // TODO: Add this.metaData.copyright.license.start info if present
            ).join("")
        }
        if (this.metaData.abstract.default) {
            head += this.walkJson(this.metaData.abstract.default)
        }
        Object.keys(this.metaData.abstract).filter(language => language !== "default").forEach(language => {
            head += this.walkJson(this.metaData.abstract[language])
        })
        if (this.metaData.keywords.length) {
            head += `<meta name="keywords" content="${escapeText(this.metaData.keywords.join(", "))}"${this.endSlash}>`
        }
        head += this.exporter.styleSheets.map(
            sheet => sheet.filename ?
                `<link rel="stylesheet" type="text/css" href="${sheet.filename}"${this.endSlash}>` :
                `<style>${sheet.contents}</style>`
        ).join("")
        return head
    }

    // Only allow for text output
    textWalkJson(node) {
        let content = ""
        if (node.type === "text") {
            content += escapeText(node.text).normalize("NFC")
        } else if (node.content) {
            node.content.forEach(child => {
                content += this.textWalkJson(child)
            })
        }
        return content
    }


    walkJson(node, options = {}) {
        let start = "", content = "", end = ""
        switch (node.type) {
        case "article":
            break
        case "title":
            start += "<div class=\"article-part article-title\" id=\"title\">"
            end = "</div>" + end
            break
        case "heading_part":
            // Ignore - we deal with the heading inside
            break
        case "contributor":
            // Ignore - we deal with contributors_part instead.
            break
        case "contributors_part":
            if (node.content) {
                start += `<div class="article-part article-contributors ${node.attrs.metadata || "other"}">`
                end = "</div>" + end
                const contributorTypeId = node.attrs.id
                let counter = 1
                const contributorOutputs = []
                node.content.forEach(childNode => {
                    const contributor = childNode.attrs
                    let output = ""
                    if (contributor.firstname || contributor.lastname) {
                        output += `<span id="${contributorTypeId}-${counter++}" class="person">`
                        const nameParts = []
                        if (contributor.lastname) {
                            nameParts.push(`<span class="lastname">${escapeText(contributor.lastname)}</span>`)
                        }
                        if (contributor.firstname) {
                            nameParts.push(`<span class="firstname">${escapeText(contributor.firstname)}</span>`)
                        }
                        if (nameParts.length) {
                            output += `<span class="name">${nameParts.join(" ")}</span>`
                        }
                        if (contributor.institution) {
                            let affNumber
                            if (this.affiliations[contributor.institution]) {
                                affNumber = this.affiliations[contributor.institution]
                            } else {
                                affNumber = ++this.affCounter
                                this.affiliations[contributor.institution] = affNumber
                            }
                            output += `<a class="affiliation" href="#aff${affNumber}">${affNumber}</a>`
                        }
                        output += "</span>"
                    } else if (contributor.institution) {
                        // There is an affiliation but no first/last name. We take this
                        // as a group collaboration.
                        output += `<span id="${contributorTypeId}-${counter++}" class="group">`
                        output += `<span class="name">${escapeText(contributor.institution)}</span>`
                        output += "</span>"
                    }
                    contributorOutputs.push(output)
                })
                content += contributorOutputs.join(" ")
            }
            break
        case "tags_part":
            if (node.content) {
                start += `<div class="article-part article-tags" id="${node.attrs.id}"${ node.attrs.language ? ` lang="${node.attrs.language}"` : ""}>`
                end = "</div>" + end
            }
            break
        case "tag":
            content += `<span class='tag'>${escapeText(node.attrs.tag)}</span>`
            break
        case "richtext_part":
            if (node.content) {
                start += `<div class="article-part article-richtext article-${node.attrs.id}"${ node.attrs.language ? ` lang="${node.attrs.language}"` : ""}>`
                end = "</div>" + end
            }
            break
        case "table_of_contents":
            content += `<div class="article-part table-of-contents"><h1>${escapeText(node.attrs.title)}</h1></div>`
            break
        case "separator_part":
            content += `<hr class="article-separator_part article-${node.attrs.id}">`
            break
        case "table_part":
            // table parts will simply show the table inside of them.
            break
        case "paragraph":
            start += `<p id="p-${++this.parCounter}">`
            end = "</p>" + end
            break
        case "heading1":
        case "heading2":
        case "heading3":
        case "heading4":
        case "heading5":
        case "heading6": {
            const level = parseInt(node.type.slice(-1))
            start += `<h${level}>`
            end = `</h${level}>` + end
            break
        }
        case "code_block":
            start += "<code>"
            end = "</code>" + end
            break
        case "blockquote":
            start += "<blockquote>"
            end = "</blockquote>" + end
            break
        case "ordered_list": {
            if (node.attrs.order == 1) {
                start += `<ol id="list-${++this.listCounter}">`
            } else {
                start += `<ol id="list-${++this.listCounter}" start="${node.attrs.order}">`
            }
            end = "</ol>" + end
            break
        }
        case "bullet_list":
            start += `<ul id="list-${++this.listCounter}">`
            end = "</ul>" + end
            break
        case "list_item":
            start += "<li>"
            end = "</li>" + end
            break
        case "footnote":
            content += `<a class="footnote"${this.epub ? "epub:type=\"noteref\" " : ""} href="#fn-${++this.fnCounter}">${this.fnCounter}</a>`
            options = Object.assign({}, options)
            options.inFootnote = true
            this.footnotes.push(this.walkJson({
                type: "footnotecontainer",
                attrs: {
                    id: `fn-${this.fnCounter}`,
                    label: this.fnCounter // Note: it's unclear whether the footnote number is required as a label
                },
                content: node.attrs.footnote
            }, options))
            break
        case "footnotecontainer":
            start += `<aside class="footnote"${this.epub ? "epub:type=\"footnote\" " : ""} id="${node.attrs.id}"><label>${node.attrs.label}</label>`
            end = "</aside>" + end
            break
        case "text": {
            let strong, em, underline, hyperlink
            // Check for hyperlink, bold/strong, italic/em and underline
            if (node.marks) {
                strong = node.marks.find(mark => mark.type === "strong")
                em = node.marks.find(mark => mark.type === "em")
                underline = node.marks.find(mark => mark.type === "underline")
                hyperlink = node.marks.find(mark => mark.type === "link")
            }
            if (em) {
                start += "<em>"
                end = "</em>" + end
            }
            if (strong) {
                start += "<strong>"
                end = "</strong>" + end
            }
            if (underline) {
                start += "<span class=\"underline\">"
                end = "</span>" + end
            }
            if (hyperlink) {
                start += `<a href="${hyperlink.attrs.href}">`
                end = "</a>" + end
            }
            content += escapeText(node.text).normalize("NFC")
            break
        }
        case "cross_reference": {
            start += `<a href="#${node.attrs.id}">`
            content += escapeText(node.attrs.title || "MISSING TARGET")
            end = "</a>" + end
            break
        }
        case "citation": {
            const citationText = this.exporter.citations.citationTexts[this.citationCount++]
            if (options.inFootnote || this.exporter.citations.citFm.citationType !== "note") {
                content += citationText
            } else {
                content += `<a class="footnote"${this.epub ? "epub:type=\"noteref\" " : ""} href="#fn-${++this.fnCounter}">${this.fnCounter}</a>`
                this.footnotes.push(
                    `<aside class="footnote"${this.epub ? "epub:type=\"footnote\" " : ""} id="fn-${this.fnCounter}"><label>${this.fnCounter}</label><p id="p-${++this.parCounter}">${citationText}</p></fn>`
                )
            }
            break
        }
        case "figure": {
            // Note: width and alignment are not stored due to lack of corresponding attributes in JATS.
            if (options.inFootnote) {
                // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                break
            }
            let imageFilename, copyright
            const image = node.content.find(node => node.type === "image")?.attrs.image || false
            if (image !== false) {
                this.imageIds.push(image)
                const imageDBEntry = this.imageDB.db[image],
                    filePathName = imageDBEntry.image
                copyright = imageDBEntry.copyright
                imageFilename = filePathName.split("/").pop()
            }
            const caption = node.attrs.caption ? node.content.find(node => node.type === "figure_caption")?.content || [] : []
            if (
                node.attrs.category === "none" &&
                    imageFilename &&
                    !caption.length &&
                    (!copyright || !copyright.holder)
            ) {
                content += `<img id="${node.attrs.id}" src="images/${imageFilename}"${this.endSlash}>`
            } else {
                start += `<figure id="${node.attrs.id}">`
                end = "</figure>" + end

                const category = node.attrs.category
                if (caption.length || category !== "none") {
                    let figcaption = "<figcaption>"
                    if (category !== "none") {
                        if (!this.categoryCounter[category]) {
                            this.categoryCounter[category] = 0
                        }
                        const catCount = ++this.categoryCounter[category]
                        const catLabel = `${CATS[category][this.settings.language]} ${catCount}`
                        figcaption += `<label>${escapeText(catLabel)}</label>`
                    }
                    if (caption.length) {
                        figcaption += `<p>${caption.map(node => this.walkJson(node)).join("")}</p>`
                    }
                    figcaption += "</figcaption>"
                    if (category === "table") {
                        end = figcaption + end
                    } else {
                        start += figcaption
                    }
                }

                const equation = node.content.find(node => node.type === "figure_equation")?.attrs.equation
                if (equation) {
                    start += `<div class="figure-equation" data-equation="${escapeText(equation)}">`
                    end = "</div>" + end
                    content = convertLatexToMarkup(equation, {mathstyle: "displaystyle"})
                } else {
                    if (copyright?.holder) {
                        start += `<footer class="copyright ${copyright.freeToRead ? "free-to-read" : "not-free-to-read"}"><small>`
                        const year = copyright.year ? copyright.year : new Date().getFullYear()
                        start += `<span class="copyright-year">${year}</span>`
                        start += `<span class="copyright-holder">${escapeText(copyright.holder)}</span>`
                        start += copyright.licenses.map(license =>
                            `<div class="license"><a rel="license"${license.start ? ` data-start="${license.start}"` : ""}>${escapeText(license.url)}</a></div>`
                        ).join("")
                        start += "</small></footer>"
                    }
                    if (imageFilename) {
                        content += `<img src="images/${imageFilename}"${this.endSlash}>`
                    }
                }
            }
            break
        }
        case "figure_caption":
            // We are already dealing with this in the figure. Prevent content from being added a second time.
            return ""
        case "figure_equation":
            // We are already dealing with this in the figure.
            break
        case "image":
            // We are already dealing with this in the figure.
            break
        case "table": {
            // Note: We ignore right/left/center aligned and table layout
            start += `<table class="table-${node.attrs.width} table-${node.attrs.aligned} table-${node.attrs.layout}">`
            end = "</table>" + end
            const category = node.attrs.category
            if (category !== "none") {
                if (!this.categoryCounter[category]) {
                    this.categoryCounter[category] = 0
                }
                const catCount = ++this.categoryCounter[category]
                const catLabel = `${CATS[category][this.settings.language]} ${catCount}`
                start += `<label>${escapeText(catLabel)}</label>`
            }
            const caption = node.attrs.caption ? node.content[0].content || [] : []
            if (caption.length) {
                start += `<caption><p>${caption.map(node => this.walkJson(node)).join("")}</p></caption>`
            }
            start += "<tbody>"
            end = "</tbody>" + end
            break
        }
        case "table_body":
            // Pass through to table.
            break
        case "table_caption":
            // We already deal with this in 'table'.
            return ""
        case "table_row":
            start += "<tr>"
            end = "</tr>" + end
            break
        case "table_cell":
            start += `<td${node.attrs.colspan === 1 ? "" : ` colspan="${node.attrs.colspan}"`}${node.attrs.rowspan === 1 ? "" : ` rowspan="${node.attrs.rowspan}"`}>`
            end = "</td>" + end
            break
        case "table_header":
            start += `<th${node.attrs.colspan === 1 ? "" : ` colspan="${node.attrs.colspan}"`}${node.attrs.rowspan === 1 ? "" : ` rowspan="${node.attrs.rowspan}"`}>`
            end = "</th>" + end
            break
        case "equation":
            start += "<span class=\"equation\">"
            end = "</span>" + end
            content = convertLatexToMarkup(node.attrs.equation, {mathstyle: "textstyle"})
            break
        case "hard_break":
            content += `<br${this.endSlash}>`
            break
        default:
            break
        }

        if (!content.length && node.content) {
            node.content.forEach(child => {
                content += this.walkJson(child, options)
            })
        }

        return start + content + end
    }

    assembleBody(docContent) {
        return `<div id="body">${this.walkJson(docContent)}</div>`
    }

    assembleBack() {
        let back = ""
        if (this.footnotes.length || this.exporter.citations.bibHTML.length) {
            back += "<div id=\"back\">"
            if (this.footnotes.length) {
                back += `<div id="footnotes">${this.footnotes.join("")}</div>`
            }
            if (this.exporter.citations.bibHTML.length) {
                back += `<div id="references">${this.exporter.citations.bibHTML}</div>`
                this.exporter.styleSheets.push({filename: "css/bibliography.css", contents: pretty(this.exporter.citations.bibCSS, {ocd: true})})
            }
            back += "</div>"
        }
        return back
    }

}

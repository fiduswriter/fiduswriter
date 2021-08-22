import {convertLatexToMarkup} from "mathlive"

import {escapeText} from "../../common"
import {CATS} from "../../schema/i18n"

import {articleTemplate} from "./templates"

export class HTMLExporterConvert {
    constructor(exporter, imageDB, bibDB, settings, xhtml = false) {
        this.exporter = exporter
        this.settings = settings
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.xhtml = xhtml

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
            title: {},
            subtitle: {},
            contributors: [],
            abstract: {},
            keywords: [],
            tags: [],
            copyright: {
                licenses: []
            }
        }
        this.citInfos = []
        this.citationCount = 0
    }

    init(docContent) {
        this.preWalkJson(docContent)
        this.findAllCitations(docContent)
        return this.exporter.citations.init(this.citInfos).then(() => {
            const front = this.assembleFront()
            const body = this.assembleBody(docContent)
            const back = this.assembleBack()
            const html = articleTemplate({front, body, back})
            return {
                html,
                imageIds: this.imageIds
            }
        })
    }

    // Find information for meta tags in header
    preWalkJson(node, parentNode = false) {
        switch (node.type) {
        case 'article':
            this.metaData.copyright = node.attrs.copyright
            break
        case 'title':
            this.metaData.title['default'] = node
            parentNode.content = parentNode.content.filter(child => child !== node)
            break
        case 'heading_part':
            if (
                ['title', 'subtitle'].includes(node.attrs.metadata) &&
                    !this.metaData[node.attrs.metadata][node.attrs.language || 'default'] &&
                    node.content &&
                    node.content.length
            ) {
                // We only take the first instance of title/subtitle per language
                this.metaData[node.attrs.metadata][node.attrs.language || 'default'] = {
                    type: node.attrs.language ? `trans_${node.attrs.metadata}` : node.attrs.metadata,
                    attrs: {
                        id: node.content[0].attrs.id,
                        language: node.attrs.language
                    },
                    content: node.content[0].content
                }
                parentNode.content = parentNode.content.filter(child => child !== node)
            }
            break
        case 'richtext_part':
            if (
                node.attrs.metadata === 'abstract' &&
                    !this.metaData.abstract[node.attrs.language || 'default']
            ) {
                // We only take the first instance of abstract per language
                this.metaData.abstract[node.attrs.language || 'default'] = {
                    type: node.attrs.language ? 'trans_abstract' : 'abstract',
                    attrs: {
                        id: node.attrs.id,
                        language: node.attrs.language
                    },
                    content: node.content
                }
                parentNode.content = parentNode.content.filter(child => child !== node)
            }
            break
        case 'tags_part':
            if (
                node.attrs.metadata === 'keywords'
            ) {
                this.metaData.keywords.push({
                    type: 'keywords',
                    attrs: {
                        language: node.attrs.language
                    },
                    content: node.content
                })
            } else {
                this.metaData.tags.push(node)
            }
            parentNode.content = parentNode.content.filter(child => child !== node)
            break
        case 'contributors_part':
            this.metaData.contributors.push(node)
            parentNode.content = parentNode.content.filter(child => child !== node)
            break
        default:
            break
        }
        if (node.content) {
            node.content.forEach(child => this.preWalkJson(child, node))
        }
    }

    findAllCitations(docContent) {
        // We need to look for citations in the same order they will be found in front + body
        // to get the formatting right.
        if (this.metaData.subtitle.default) {
            this.findCitations(this.metaData.subtitle.default)
        }
        Object.keys(this.metaData.title).filter(language => language !== 'default').forEach(language => {
            this.findCitations(this.metaData.title[language])
            if (this.metaData.subtitle[language]) {
                this.findCitations(this.metaData.subtitle[language])
            }
        })
        if (this.metaData.abstract.default) {
            this.findCitations(this.metaData.abstract.default)
        }
        Object.keys(this.metaData.abstract).filter(language => language !== 'default').forEach(language => {
            this.findCitations(this.metaData.abstract[language])
        })
        this.findCitations(docContent)
    }

    findCitations(node) {
        switch (node.type) {
        case 'citation':
            this.citInfos.push(JSON.parse(JSON.stringify(node.attrs)))
            break
        case 'footnote':
            node.attrs.footnote.forEach(child => this.findCitations(child))
            break
        default:
            break
        }
        if (node.content) {
            node.content.forEach(child => this.findCitations(child))
        }
    }

    assembleFront() {
        let front = '<front><article-meta>'
        if (this.metaData.tags.length) {
            front += `<article-categories>${this.metaData.tags.map(node => this.walkJson(node)).join('')}</article-categories>`
        }
        Object.keys(this.metaData.subtitle).filter(language => language !== 'default').forEach(language => {
            // Making sure there is a title for each subtitle
            if (!this.metaData.title[language]) {
                this.metaData.title[language] = {type: 'trans_title', attrs: {language}}
            }
        })
        front += '<title-group>'
        front += this.walkJson(this.metaData.title.default)
        if (this.metaData.subtitle.default) {
            front += this.walkJson(this.metaData.subtitle.default)
        }
        Object.keys(this.metaData.title).filter(language => language !== 'default').forEach(language => {
            front += `<trans-title-group @xml:lang="${language}">`
            front += this.walkJson(this.metaData.title[language])
            if (this.metaData.subtitle[language]) {
                front += this.walkJson(this.metaData.subtitle[language])
            }
            front += '</trans-title-group>'
        })
        front += '</title-group>'
        this.metaData.contributors.forEach(contributors => {
            front += this.walkJson(contributors)
        })
        Object.entries(this.affiliations).forEach(([institution, index]) => front += `<aff id="aff${index}"><institution>${escapeText(institution)}</institution></aff>`)
        // https://validator.jats4r.org/ requires a <permissions> element here, but is OK with it being empty.
        if (this.metaData.copyright.holder) {
            front += '<permissions>'
            const year = this.metaData.copyright.year ? this.metaData.copyright.year : new Date().getFullYear()
            front += `<copyright-year>${year}</copyright-year>`
            front += `<copyright-holder>${escapeText(this.metaData.copyright.holder)}</copyright-holder>`
            if (this.metaData.copyright.freeToRead) {
                front += '<ali:free_to_read/>'
            }
            front += this.metaData.copyright.licenses.map(license =>
                `<license><ali:license_ref${license.start ? ` start_date="${license.start}"` : ''}>${escapeText(license.url)}</ali:license_ref></license>`
            ).join('')
            front += '</permissions>'
        } else {
            front += '<permissions/>'
        }
        if (this.metaData.abstract.default) {
            front += this.walkJson(this.metaData.abstract.default)
            front += this.closeSections(0)
        }
        Object.keys(this.metaData.abstract).filter(language => language !== 'default').forEach(language => {
            front += this.walkJson(this.metaData.abstract[language])
            front += this.closeSections(0)
        })
        this.metaData.keywords.forEach(keywords => {
            front += this.walkJson(keywords)
        })
        front += '</article-meta></front>'
        return front
    }


    walkJson(node, options = {}) {
        let start = '', content = '', end = ''
        switch (node.type) {
        case 'article':
            break
        case 'title':
            start += '<article-title>'
            end = '</article-title>' + end
            break
        case 'trans_title':
            start += '<trans-title>'
            end = '</trans-title>' + end
            break
        case 'subtitle':
            if (node.content) {
                start += '<subtitle>'
                end = '</subtitle>' + end
            }
            break
        case 'trans_subtitle':
            if (node.content) {
                start += '<trans-subtitle>'
                end = '</trans-subtitle>' + end
            }
            break
        case 'heading_part':
            // Ignore - we deal with the heading inside
            break
        case 'contributor':
            // Ignore - we deal with contributors_part instead.
            break
        case 'contributors_part':
            if (node.content) {
                const contributorTypes = {
                    authors: 'author',
                    editors: 'editor'
                }
                const contributorType = contributorTypes[node.attrs.metadata] || 'other' // TODO: Figure out if 'other' is legal
                start += `<contrib-group content-type="${contributorType}">`
                end = '</contrib-group>' + end
                const contributorTypeId = node.attrs.id
                let counter = 1
                node.content.forEach(childNode => {
                    const contributor = childNode.attrs
                    if (contributor.firstname || contributor.lastname) {
                        content += `<contrib id="${contributorTypeId}-${counter++}" contrib-type="person">`
                        content += '<name>'
                        if (contributor.lastname) {
                            content += `<surname>${escapeText(contributor.lastname)}</surname>`
                        }
                        if (contributor.firstname) {
                            content += `<given-names>${escapeText(contributor.firstname)}</given-names>`
                        }
                        content += '</name>'
                        if (contributor.institution) {
                            let affNumber
                            if (this.affiliations[contributor.institution]) {
                                affNumber = this.affiliations[contributor.institution]
                            } else {
                                affNumber = ++this.affCounter
                                this.affiliations[contributor.institution] = affNumber
                            }
                            content += `<xref ref-type="aff" rid="aff${affNumber}" />`
                        }
                        content += '</contrib>'
                    } else if (contributor.institution) {
                        // There is an affiliation but no first/last name. We take this
                        // as a group collaboration.
                        content += `<contrib id="${contributorTypeId}-${counter++}" contrib-type="group">`
                        content += `<collab><named-content content-type="name">${escapeText(contributor.institution)}</named-content></collab>`
                        content += '</contrib>'
                    }
                })
            }
            break
        case 'tags_part':
            if (node.content) {
                start += `<subj-group subj-group-type="${node.attrs.id}"${ node.attrs.language ? ` xml:lang="${node.attrs.language}"` : ''}>`
                end = '</subj-group>' + end
            }
            break
        case 'keywords':
            if (node.content) {
                start += `<kwd-group${ node.attrs.language ? ` xml:lang="${node.attrs.language}"` : ''}>`
                end = '</kwd-group>' + end
                options = Object.assign({}, options)
                options.inKeywords = true
            }
            break
        case 'tag':
            if (options.inKeywords) {
                content += `<kwd>${node.attrs.tag}</kwd>`
            } else {
                content += `<subject>${node.attrs.tag}</subject>`
            }
            break
        case 'abstract':
            if (node.content) {
                start += `<abstract>`
                end = '</abstract>' + end
            }
            break
        case 'trans_abstract':
            if (node.content) {
                start += `<trans-abstract xml:lang="${node.attrs.language}">`
                end = '</trans-abstract>' + end
            }
            break
        case 'richtext_part':
            start += `<div class="article-part article-richtext article-${node.attrs.id}">`
            end = '</div>' + end
            break
        case 'table_of_contents':
            content += `<div class="article-part table-of-contents"><h1>${escapeText(node.attrs.title)}</h1></div>`
            break
        case 'separator_part':
            content += `<hr class="article-separator_part article-${node.attrs.id}">`
            break
        case 'table_part':
            // table parts will simply show the table inside of them.
            break
        case 'paragraph':
            start += `<p id="p-${++this.parCounter}">`
            end = '</p>' + end
            break
        case 'heading1':
        case 'heading2':
        case 'heading3':
        case 'heading4':
        case 'heading5':
        case 'heading6': {
            const level = parseInt(node.type.slice(-1))
            start += `<h${level}>`
            end = `</h${level}>` + end
            break
        }
        case 'code_block':
            start += '<code>'
            end = '</code>' + end
            break
        case 'blockquote':
            start += '<blockquote>'
            end = '</blockquote>' + end
            break
        case 'ordered_list': {
            if (node.attrs.order == 1) {
                start += `<ol id="list-${++this.listCounter}">`
            } else {
                start += `<ol id="list-${++this.listCounter}" start="${node.attrs.order}">`
            }
            end = '</ol>' + end
            break
        }
        case 'bullet_list':
            start += `<ul id="list-${++this.listCounter}">`
            end = '</ul>' + end
            break
        case 'list_item':
            start += '<li>'
            end = '</li>' + end
            break
        case 'footnote':
            content += `<xref ref-type="fn" rid="fn-${++this.fnCounter}">${this.fnCounter}</xref>`
            options = Object.assign({}, options)
            options.inFootnote = true
            this.footnotes.push(this.walkJson({
                type: 'footnotecontainer',
                attrs: {
                    id: `fn-${this.fnCounter}`,
                    label: this.fnCounter // Note: it's unclear whether the footnote number is required as a label
                },
                content: node.attrs.footnote
            }, options))
            break
        case 'footnotecontainer':
            start += `<fn id="${node.attrs.id}"><label>${node.attrs.label}</label>`
            end = '</fn>' + end
            break
        case 'text': {
            let strong, em, underline, hyperlink
            // Check for hyperlink, bold/strong, italic/em and underline
            if (node.marks) {
                strong = node.marks.find(mark => mark.type === 'strong')
                em = node.marks.find(mark => mark.type === 'em')
                underline = node.marks.find(mark => mark.type === 'underline')
                hyperlink = node.marks.find(mark => mark.type === 'link')
            }
            if (em) {
                start += '<italic>'
                end = '</italic>' + end
            }
            if (strong) {
                start += '<bold>'
                end = '</bold>' + end
            }
            if (underline) {
                start += '<underline>'
                end = '</underline>' + end
            }
            if (hyperlink) {
                const href = hyperlink.attrs.href
                if (href[0] === '#') {
                    // Internal link
                    start += `<xref rid="${href.substring(1)}">`
                    end = '</xref>' + end
                } else {
                    // External link
                    start += `<ext-link xlink:href="${href}" ext-link-type="uri" xlink:title="${hyperlink.attrs.title}">`
                    end = '</ext-link>' + end
                }
            }
            content += escapeText(node.text)
            break
        }
        case 'cross_reference': {
            start += `<xref rid="${node.attrs.id}">`
            content += escapeText(node.attrs.title || 'MISSING TARGET')
            end = '</xref>' + end
            break
        }
        case 'citation': {
            const citationText = this.exporter.citations.citationTexts[this.citationCount++]
            if (options.inFootnote || this.exporter.citations.citFm.citationType !== 'note') {
                content += citationText
            } else {
                content += `<xref ref-type="fn" rid="fn-${++this.fnCounter}">${this.fnCounter}</xref>`
                this.footnotes.push(
                    `<fn id="fn-${this.fnCounter}"><label>${this.fnCounter}</label><p id="p-${++this.parCounter}">${citationText}</p></fn>`
                )
            }
            break
        }
        case 'figure': {
            // Note: width and alignment are not stored due to lack of corresponding attributes in JATS.
            if (options.inFootnote) {
                // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                break
            }
            let imageFilename, copyright
            const image = node.content.find(node => node.type === 'image')?.attrs.image || false
            if (image !== false) {
                this.imageIds.push(image)
                const imageDBEntry = this.imageDB.db[image],
                    filePathName = imageDBEntry.image
                copyright = imageDBEntry.copyright
                imageFilename = filePathName.split('/').pop()
            }
            const caption = node.attrs.caption ? node.content.find(node => node.type === 'figure_caption')?.content || [] : []
            if (
                node.attrs.category === 'none' &&
                    imageFilename &&
                    !caption.length &&
                    (!copyright || !copyright.holder)
            ) {
                content += `<graphic id="${node.attrs.id}" position="anchor" xlink:href="${imageFilename}"/>`
            } else {
                start += `<fig id="${node.attrs.id}">`
                end = '</fig>' + end

                const category = node.attrs.category
                if (category !== 'none') {
                    if (!this.categoryCounter[category]) {
                        this.categoryCounter[category] = 0
                    }
                    const catCount = ++this.categoryCounter[category]
                    const catLabel = `${CATS[category][this.settings.language]} ${catCount}`
                    start += `<label>${escapeText(catLabel)}</label>`
                }
                if (caption.length) {
                    start += `<caption><p>${caption.map(node => this.walkJson(node)).join('')}</p></caption>`
                }
                const equation = node.content.find(node => node.type === 'figure_equation')?.attrs.equation
                if (equation) {
                    start += '<disp-formula>'
                    end = '</disp-formula>' + end
                    content = `<tex-math><![CDATA[${equation}]]></tex-math>`
                } else {
                    if (copyright?.holder) {
                        start += '<permissions>'
                        const year = copyright.year ? copyright.year : new Date().getFullYear()
                        start += `<copyright-year>${year}</copyright-year>`
                        start += `<copyright-holder>${escapeText(copyright.holder)}</copyright-holder>`
                        if (copyright.freeToRead) {
                            start += '<ali:free_to_read/>'
                        }
                        start += copyright.licenses.map(license =>
                            `<license><ali:license_ref${license.start ? ` start_date="${license.start}"` : ''}>${escapeText(license.url)}</ali:license_ref></license>`
                        ).join('')
                        start += '</permissions>'
                    }
                    if (imageFilename) {
                        content += `<graphic position="anchor" xlink:href="${imageFilename}"/>`
                    }
                }
            }
            break
        }
        case 'figure_caption':
            // We are already dealing with this in the figure. Prevent content from being added a second time.
            return ''
        case 'figure_equation':
            // We are already dealing with this in the figure.
            break
        case 'image':
            // We are already dealing with this in the figure.
            break
        case 'table': {
            // Note: We ignore right/left/center aligned and table layout
            start += `<table class="table-${node.attrs.width} table-${node.attrs.aligned} table-${node.attrs.layout}">`
            end = '</table>' + end
            const category = node.attrs.category
            if (category !== 'none') {
                if (!this.categoryCounter[category]) {
                    this.categoryCounter[category] = 0
                }
                const catCount = ++this.categoryCounter[category]
                const catLabel = `${CATS[category][this.settings.language]} ${catCount}`
                start += `<label>${escapeText(catLabel)}</label>`
            }
            const caption = node.attrs.caption ? node.content[0].content || [] : []
            if (caption.length) {
                start += `<caption><p>${caption.map(node => this.walkJson(node)).join('')}</p></caption>`
            }
            start += '<tbody>'
            end = '</tbody>' + end
            break
        }
        case 'table_body':
            // Pass through to table.
            break
        case 'table_caption':
            // We already deal with this in 'table'.
            return ''
        case 'table_row':
            start += '<tr>'
            end = '</tr>' + end
            break
        case 'table_cell':
            start += `<td${node.attrs.colspan === 1 ? '' : ` colspan="${node.attrs.colspan}"`}${node.attrs.rowspan === 1 ? '' : ` rowspan="${node.attrs.rowspan}"`}>`
            end = '</td>' + end
            break
        case 'table_header':
            start += `<th${node.attrs.colspan === 1 ? '' : ` colspan="${node.attrs.colspan}"`}${node.attrs.rowspan === 1 ? '' : ` rowspan="${node.attrs.rowspan}"`}>`
            end = '</th>' + end
            break
        case 'equation':
            start += '<span class="equation">'
            end = '</span>' + end
            content = convertLatexToMarkup(node.attrs.equation, {mathstyle: 'textstyle'})
            break
        case 'hard_break':
            content += this.xhtml ? '<br/>' : '<br>'
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

    closeSections(targetLevel) {
        let returnValue = ''
        while (this.currentSectionLevel > targetLevel) {
            returnValue += '</section>'
            this.currentSectionLevel--
        }

        return returnValue
    }

    assembleBody(docContent) {
        return `<body id="body">${this.walkJson(docContent) + this.closeSections(0)}</body>`
    }

    assembleBack() {
        let back = '<div class="back">'
        if (this.footnotes.length) {
            back += `<div class="footnotes">${this.footnotes.join('')}</div>`
        }
        if (this.exporter.citations.htmlBib.length) {
            back += `<div class="references">${this.exporter.citations.htmlBib}</div>`
        }
        back += '</div>'
        return back
    }

}

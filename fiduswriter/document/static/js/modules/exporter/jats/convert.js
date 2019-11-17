import {escapeText} from "../../common"
import {FIG_CATS} from "../../schema/i18n"

import {articleTemplate} from "./templates"

export class JATSExporterConvert {
    constructor(exporter, imageDB, bibDB, settings) {
        this.exporter = exporter
        this.settings = settings
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.imageIds = []
        this.figureCounter = {} // counters for each type of figure (figure/table/photo)
        this.affiliations = {} // affiliations of authors and editors
        this.affCounter = 0
        this.parCounter = 0
        this.headingCounter = 0
        this.currentSectionLevel = 0
        this.listCounter = 0
        this.footnotes = []
        this.fnCounter = 0
        this.frontMatter = {
            title: {},
            subtitle: {},
            contributors: [],
            abstract: {},
            keywords: [],
            tags: []
        }
        this.citInfos = []
        this.citationCount = 0
    }

    init(docContents) {
        this.preWalkJson(docContents)
        this.findAllCitations(docContents)
        return this.exporter.citations.init(this.citInfos).then(() => {
            const front = this.assembleFront()
            const body = this.assembleBody(docContents)
            const back = this.assembleBack()
            const jats = articleTemplate({front, body, back})
            return {
                jats,
                imageIds: this.imageIds
            }
        })
    }

    // Remove items from the body that should be in the front.
    preWalkJson(node, parentNode = false) {
        if (parentNode) {
            switch (node.type) {
                case 'title':
                    this.frontMatter.title['default'] = node
                    parentNode.content = parentNode.content.filter(child => child !== node)
                    break
                case 'heading_part':
                    if (
                        ['title', 'subtitle'].includes(node.attrs.metadata) &&
                        !this.frontMatter[node.attrs.metadata][node.attrs.language || 'default'] &&
                        node.content &&
                        node.content.length
                    ) {
                        // We only take the first instance of title/subtitle per language
                        this.frontMatter[node.attrs.metadata][node.attrs.language || 'default'] = {
                            type: node.attrs.language ? `trans_${node.attrs.metadata}`: node.attrs.metadata,
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
                        !this.frontMatter.abstract[node.attrs.language || 'default']
                    ) {
                        // We only take the first instance of abstract per language
                        this.frontMatter.abstract[node.attrs.language || 'default'] = {
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
                        this.frontMatter.keywords.push({
                            type: 'keywords',
                            attrs: {
                                language: node.attrs.language
                            },
                            content: node.content
                        })
                    } else {
                        this.frontMatter.tags.push(node)
                    }
                    parentNode.content = parentNode.content.filter(child => child !== node)
                    break
                case 'contributors_part':
                    this.frontMatter.contributors.push(node)
                    parentNode.content = parentNode.content.filter(child => child !== node)
                    break
                default:
                    break
            }
        }
        if (node.content) {
            node.content.forEach(child => this.preWalkJson(child, node))
        }
    }

    findAllCitations(docContents) {
        // We need to look for citations in the same order they will be found in front + body
        // to get the formatting right.
        if (this.frontMatter.subtitle.default) {
            this.findCitations(this.frontMatter.subtitle.default)
        }
        Object.keys(this.frontMatter.title).filter(language => language !== 'default').forEach(language => {
            this.findCitations(this.frontMatter.title[language])
            if (this.frontMatter.subtitle[language]) {
                this.findCitations(this.frontMatter.subtitle[language])
            }
        })
        if (this.frontMatter.abstract.default) {
            this.findCitations(this.frontMatter.abstract.default)
        }
        Object.keys(this.frontMatter.abstract).filter(language => language !== 'default').forEach(language => {
            this.findCitations(this.frontMatter.abstract[language])
        })
        this.findCitations(docContents)
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
        if (this.frontMatter.tags.length) {
            front += `<article-categories>${this.frontMatter.tags.map(node => this.walkJson(node)).join('')}</article-categories>`
        }
        Object.keys(this.frontMatter.subtitle).filter(language => language !== 'default').forEach(language => {
            // Making sure there is a title for each subtitle
            if (!this.frontMatter.title[language]) {
                this.frontMatter.title[language] = {type: 'trans_title', attrs: {language}}
            }
        })
        front += '<title-group>'
        front += this.walkJson(this.frontMatter.title.default)
        if (this.frontMatter.subtitle.default) {
            front += this.walkJson(this.frontMatter.subtitle.default)
        }
        Object.keys(this.frontMatter.title).filter(language => language !== 'default').forEach(language => {
            front += `<trans-title-group @xml:lang="${language}">`
            front += this.walkJson(this.frontMatter.title[language])
            if (this.frontMatter.subtitle[language]) {
                front += this.walkJson(this.frontMatter.subtitle[language])
            }
            front += '</trans-title-group>'
        })
        front += '</title-group>'
        this.frontMatter.contributors.forEach(contributors => {
            front += this.walkJson(contributors)
        })
        Object.entries(this.affiliations).forEach(([institution, index]) => front += `<aff id="aff${index}"><institution>${escapeText(institution)}</institution></aff>`)
        // https://validator.jats4r.org/ requires a <permissions> element here, but is OK with it being empty.
        front += '<permissions/>'
        if (this.frontMatter.abstract.default) {
            front += this.walkJson(this.frontMatter.abstract.default)
            front += this.closeSections(0)
        }
        Object.keys(this.frontMatter.abstract).filter(language => language !== 'default').forEach(language => {
            front += this.walkJson(this.frontMatter.abstract[language])
            front += this.closeSections(0)
        })
        this.frontMatter.keywords.forEach(keywords => {
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
                if (node.attrs.metadata) {
                    options = Object.assign({}, options)
                    options.partMetadata = node.attrs.metadata
                }
                break
            case 'table_of_contents':
                // TODO: Not sure what to use here.
                break
            case 'separator_part':
            case 'table_part':
                // part separators as in page breaks should usually already be handled
                // by LaTeX and table parts will simply show the table inside of them.
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
                if (options.ignoreHeading) {
                    break
                } else if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    start += `<p id="p-${++this.parCounter}">`
                    end = '</p>' + end
                    break
                }
                const metadata = options.partMetadata
                if (metadata) {
                    // the metadata should only be applied once within a part.
                    delete options.partMetadata
                }
                const level = parseInt(node.type.slice(-1))
                if (this.currentSectionLevel > level - 1) {
                    start += this.closeSections(level-1)
                }
                while (this.currentSectionLevel < level) {
                    this.currentSectionLevel++
                    if (this.currentSectionLevel === level) {
                        start += `<sec id="${node.attrs.id}"${ metadata ? ` sec-type="${metadata}"`: ''}>`
                    } else {
                        start += `<sec id="h-${++this.headingCounter}">`
                    }
                }
                start += '<title>'
                end = '</title>' + end
                break
            }
            case 'code_block':
                if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    start += `<p id="p-${++this.parCounter}">`
                    end = '</p>' + end
                    break
                }
                start += '<code>'
                end = '</code>' + end
                break
            case 'blockquote':
                start += '<disp-quote>'
                end = '</disp-quote>' + end
                break
            case 'ordered_list':
                if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    break
                }
                start += `<list list-type="order" id="list-${++this.listCounter}">`
                end = '</list>' + end
                break
            case 'bullet_list':
                if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    break
                }
                start += `<list list-type="bullet" id="list-${++this.listCounter}">`
                end = '</list>' + end
                break
            case 'list_item':
                if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    break
                }
                start += '<list-item>'
                end = '</list-item>' + end
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
                let imageFilename
                if (node.attrs.image) {
                    this.imageIds.push(node.attrs.image)
                    const imageDBEntry = this.imageDB.db[node.attrs.image],
                        filePathName = imageDBEntry.image
                    imageFilename = filePathName.split('/').pop()
                }
                if (
                    node.attrs.figureCategory === 'none' &&
                    imageFilename &&
                    !node.attrs.caption.length
                ) {
                    content += `<graphic id="${node.attrs.id}" position="anchor" xlink:href="${imageFilename}"/>`
                } else {
                    start += `<fig id="${node.attrs.id}">`
                    end = '</fig>' + end

                    const figureType = node.attrs.figureCategory
                    if (figureType!=='none') {
                        if (!this.figureCounter[figureType]) {
                            this.figureCounter[figureType] = 0
                        }
                        const figCount = ++this.figureCounter[figureType]
                        const figLabel = `${FIG_CATS[figureType][this.settings.language]} ${figCount}`
                        start += `<label>${escapeText(figLabel)}</label>`
                    }
                    if (node.attrs.caption.length) {
                        start += `<caption><p>${escapeText(node.attrs.caption)}</p></caption>`
                    }
                    if (node.attrs.equation) {
                        start += '<disp-formula>'
                        end = '</disp-formula>' + end
                        content = `<tex-math><![CDATA[${node.attrs.equation}]]></tex-math>`
                    } else {
                        content += `<graphic position="anchor" xlink:href="${imageFilename}"/>`
                    }
                }
                break
            }
            case 'table':
                // Note: We ignore right/left/center aligned and table layout
                if (options.inFootnote) {
                    // only allows <p> block level elements https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/fn.html
                    break
                }
                start += `<table-wrap><table width="${node.attrs.width}%"><tbody>`
                end = `</tbody></table></table-wrap>` + end
                break
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
                start += '<inline-formula>'
                end = '</inline-formula>' + end
                content = `<tex-math><![CDATA[${node.attrs.equation}]]></tex-math>`
                break
            case 'hard_break':
                    // Apparently forbidden inside of <p> and a number of
                    // other elements, but not inside of <bold>, which is
                    // why we add that.
                    // https://jats.nlm.nih.gov/archiving/tag-library/1.2/element/break.html
                    content += '<bold><break /></bold>'
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
            returnValue += '</sec>'
            this.currentSectionLevel--
        }

        return returnValue
    }

    assembleBody(docContents) {
        return `<body id="body">${this.walkJson(docContents) + this.closeSections(0)}</body>`
    }

    assembleBack() {
        let back = '<back>'
        if (this.footnotes.length) {
            back += `<fn-group>${this.footnotes.join('')}</fn-group>`
        }
        if (this.exporter.citations.jatsBib.length) {
            back += `<ref-list>${this.exporter.citations.jatsBib}</ref-list>`
        }
        back += '</back>'
        return back
    }

}

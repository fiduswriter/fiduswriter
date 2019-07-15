import {textContent} from "../tools/doc_contents"
import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/const"

export class DocxExporterRender {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.filePath = "word/document.xml"
        this.xml = false
    }

    init() {
        return this.exporter.xml.getXml(this.filePath).then(
            xml => this.xml = xml
        )
    }

    // Define the tags that are to be looked for in the document
    getTagData(pmBib) {
        this.tags = this.docContents.content.map(node => {
            const tag = {}
            switch (node.type) {
                case 'title':
                    tag.title = 'title'
                    tag.content = textContent(node)
                    break
                case 'heading_part':
                    tag.title = node.attrs.id
                    tag.content = textContent(node)
                    break
                case 'table_part':
                case 'richtext_part':
                    tag.title = `@${node.attrs.id}`
                    tag.content = node.content
                    break
                case 'contributors_part':
                    tag.title = node.attrs.id
                    // TODO: This is a very basic reduction of the author info into
                    // a simple string. We should expand the templating system so
                    // that one can specify more about the output.
                    tag.content = node.content ?
                        node.content.map(
                            node => {
                                const contributor = node.attrs,
                                    nameParts = []
                                let affiliation = false
                                if (contributor.firstname) {
                                    nameParts.push(contributor.firstname)
                                }
                                if (contributor.lastname) {
                                    nameParts.push(contributor.lastname)
                                }
                                if (contributor.institution) {
                                    if (nameParts.length) {
                                        affiliation = contributor.institution
                                    } else {
                                        // We have an institution but no names. Use institution as name.
                                        nameParts.push(contributor.institution)
                                    }
                                }
                                const parts = [nameParts.join(' ')]
                                if (affiliation) {
                                    parts.push(affiliation)
                                }
                                if (contributor.email) {
                                    parts.push(contributor.email)
                                }
                                return parts.join(', ')
                            }
                        ).join('; ') :
                        ''
                    break
                case 'tags_part':
                    tag.title = node.attrs.id
                    tag.content = node.content ?
                        node.content.map(node => node.attrs.tag).join(', ') :
                        ''
                    break
            }
            return tag
        })
        const settings = this.exporter.doc.settings,
            bibliographyHeader = settings.bibliography_header[settings.language] || BIBLIOGRAPHY_HEADERS[settings.language]
        this.tags.push({
            title: '@bibliography', // The '@' triggers handling as block
            content: pmBib ?
                [{type: 'bibliography_heading', content: [{type: 'text', text: bibliographyHeader}]}].concat(pmBib.content) :
                [{type: 'paragraph', content: [{type:'text', text: ' '}]}]
        })
    }

    // go through document.xml looking for tags and replace them with the given
    // replacements.
    render() {
        // Including global page definition at end
        const pars = this.xml.querySelectorAll('p,sectPr')
        const currentTags = []

        pars.forEach(
            par => {
                // Assuming there is nothing outside of <w:t>...</w:t>
                const text = par.textContent
                this.tags.forEach(
                    tag => {
                        const tagString = tag.title
                        if (text.includes(`{${tagString}}`)) {
                            currentTags.push(tag)
                            tag.par = par
                            // We don't worry about the same tag appearing twice in the document,
                            // as that would make no sense.
                        }
                    }
                )

                const pageSize = par.querySelector('pgSz')
                const pageMargins = par.querySelector('pgMar')
                const cols = par.querySelector('cols')
                if (pageSize && pageMargins && cols) { // Not sure if these all need to come together
                    let width = parseInt(pageSize.getAttribute('w:w')) -
                    parseInt(pageMargins.getAttribute('w:right')) -
                    parseInt(pageMargins.getAttribute('w:left'))
                    const height = parseInt(pageSize.getAttribute('w:h')) -
                    parseInt(pageMargins.getAttribute('w:bottom')) -
                    parseInt(pageMargins.getAttribute('w:top')) -
                    parseInt(pageMargins.getAttribute('w:header')) -
                    parseInt(pageMargins.getAttribute('w:footer'))

                    const colCount = parseInt(cols.getAttribute('w:num'))
                    if (colCount > 1) {
                        const colSpace = parseInt(cols.getAttribute('w:space'))
                        width = width - (colSpace * (colCount-1))
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

            }
        )
        this.tags.forEach(
            tag => {
                if (!tag.title) {
                    return
                } else if (tag.title[0]==='@') {
                    this.parRender(tag)
                } else {
                    this.inlineRender(tag)
                }
            }
        )
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        const texts = tag.par.textContent.split(`{${tag.title}}`)
        const fullText = texts[0] + escapeText(tag.content) + texts[1]
        const rs = Array.from(tag.par.querySelectorAll('r'))
        while (rs.length > 1) {
            rs[0].parentNode.removeChild(rs[0])
            rs.shift()
        }
        const r = rs[0]
        if (fullText.length) {
            let textAttr = ''
            if (fullText[0] === ' ' || fullText[fullText.length-1] === ' ') {
                textAttr += 'xml:space="preserve"'
            }
            r.innerHTML = `<w:t ${textAttr}>${fullText}</w:t>`
        } else {
            r.parentNode.removeChild(r)
        }
    }

    // Render tags that exchange paragraphs
    parRender(tag) {
        const pStyle = tag.par.querySelector('pStyle')
        const options = {
            dimensions: tag.dimensions,
            citationType: this.exporter.citations.citFm.citationType,
            section: pStyle ? pStyle.getAttribute('w:val') : 'Normal'
        }
        const outXML = tag.content ? tag.content.map(
            content => this.exporter.richtext.transformRichtext(content, options)
        ).join('') : ''
        tag.par.insertAdjacentHTML('beforebegin', outXML)
        // sectPr contains information about columns, etc. We need to move this
        // to the last paragraph we will be adding.
        const sectPr = tag.par.querySelector('sectPr')
        if (sectPr) {
            const pPr = tag.par.previousElementSibling.querySelector('pPr')
            pPr.appendChild(sectPr)
        }
        tag.par.parentNode.removeChild(tag.par)
    }


}

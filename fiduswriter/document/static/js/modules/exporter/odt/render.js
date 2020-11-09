import {textContent} from "../tools/doc_content"
import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/i18n"

export class OdtExporterRender {
    constructor(exporter, docContent) {
        this.exporter = exporter
        this.docContent = docContent
        this.filePath = "content.xml"
        this.xml = false
    }

    init() {
        return this.exporter.xml.getXml(this.filePath).then(
            xml => {
                this.xml = xml
                return Promise.resolve()
            }
        )
    }

    // Define the tags that are to be looked for in the document
    getTagData(pmBib) {
        this.tags = this.docContent.content.map(node => {
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
                [{type: 'paragraph', content: [{type: 'text', text: ' '}]}]
        })
        this.tags.push({
            title: '@copyright', // The '@' triggers handling as block
            content: settings.copyright && settings.copyright.holder ?
                [{type: 'paragraph', content: [{type: 'text', text: `© ${settings.copyright.year ? settings.copyright.year : new Date().getFullYear()} ${settings.copyright.holder}`}]}] :
                [{type: 'paragraph', content: [{type: 'text', text: ' '}]}]
        })
        this.tags.push({
            title: '@licenses', // The '@' triggers handling as block
            content: settings.copyright && settings.copyright.licenses.length ?
                settings.copyright.licenses.map(
                    license => ({type: 'paragraph', content: [
                        {type: 'text', marks: [{type: 'link', attrs: {href: license.url, title: license.url}}], text: license.title},
                        {type: 'text', text: license.start ? ` (${license.start})` : ''}
                    ]})
                ) :
                [{type: 'paragraph', content: [{type: 'text', text: ' '}]}]
        })
    }

    // go through content.xml looking for tags and replace them with the given
    // replacements.
    render() {

        const pars = this.xml.querySelectorAll('p')

        pars.forEach(par => {
            const text = par.textContent
            this.tags.forEach(tag => {
                const tagString = tag.title
                if (text.includes(`{${tagString}}`)) {
                    tag.par = par
                    if (tag.title[0] === '@') {
                        this.parRender(tag)
                    } else {
                        this.inlineRender(tag)
                    }
                }
            })
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        const texts = tag.par.textContent.split(`{${tag.title}}`)
        const fullText = texts[0] + (tag.content ? tag.content : '') + texts[1]
        tag.par.innerHTML = escapeText(fullText)
    }

    // Render tags that exchange paragraphs
    parRender(tag) {
        const section = tag.par.hasAttribute('text:style-name') ? tag.par.getAttribute('text:style-name') : 'Text_20_body'
        const outXml = tag.content ? tag.content.map(
            content => this.exporter.richtext.transformRichtext(
                content,
                {
                    citationType: this.exporter.citations.citFm.citationType,
                    section
                }
            )
        ).join('') : ''
        tag.par.insertAdjacentHTML('beforebegin', outXml)
        tag.par.parentNode.removeChild(tag.par)
    }


}

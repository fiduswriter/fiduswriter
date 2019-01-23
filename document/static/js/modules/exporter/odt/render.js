import {textContent} from "../tools/doc_contents"
import {domDescendantTexNodes} from "../tools/html"
import {escapeText} from "../../common"

export class OdtExporterRender {
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
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
        this.tags = this.docContents.content.map(node => {
            const tag = {}
            switch(node.type) {
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
        this.tags.push({
            title: '@bibliography', // The '@' triggers handling as block
            content: pmBib ? pmBib : [{type: 'paragraph', contents: [{type:'text', text: ' '}]}]
        })
    }

    // go through content.xml looking for tags and replace them with the given
    // replacements.
    render() {

        let pars = this.xml.querySelectorAll('p')

        pars.forEach(par => {
            domDescendantTexNodes(par).forEach(textNode => {
                let text = textNode.data
                this.tags.forEach(tag => {
                    let tagString = tag.title
                    if(text.indexOf('{'+tagString+'}') !== -1) {
                        if(tag.title[0]==='@') {
                            tag.par = par
                            this.parRender(tag)
                        } else {
                            tag.textNode = textNode
                            this.inlineRender(tag)
                        }
                    }
                })
            })
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        let texts = tag.textNode.data.split('{'+tag.title+'}')
        let fullText = texts[0] + escapeText(tag.content) + texts[1]
        tag.textNode.data = fullText
    }

    // Render tags that exchange paragraphs
    parRender(tag) {
        const section = tag.par.hasAttribute('text:style-name') ? tag.par.getAttribute('text:style-name') : 'Text_20_body'
        const outXml = tag.content.map(
            content => this.exporter.richtext.transformRichtext(
                content,
                {
                    citationType: this.exporter.citations.citFm.citationType,
                    section
                }
            )
        ).join('')
        tag.par.insertAdjacentHTML('beforebegin', outXml)
        tag.par.parentNode.removeChild(tag.par)
    }


}

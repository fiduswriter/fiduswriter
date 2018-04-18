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

        this.tags = [
            {
                title: 'title',
                content: textContent(this.docContents.content[0])
            },
            {
                title: 'subtitle',
                content: textContent(this.docContents.content[1])
            },
            {
                title: 'authors',
                // TODO: This is a very basic reduction of the author info into
                // a simple string. We should expand the templating system so
                // that one can specify more about the output.
                content: this.docContents.content[2].content ?
                    this.docContents.content[2].content.map(
                        node => {
                            let author = node.attrs,
                                nameParts = [],
                                affiliation = false
                            if (author.firstname) {
                                nameParts.push(author.firstname)
                            }
                            if (author.lastname) {
                                nameParts.push(author.lastname)
                            }
                            if (author.institution) {
                                if (nameParts.length) {
                                    affiliation = author.institution
                                } else {
                                    // We have an institution but no names. Use institution as name.
                                    nameParts.push(author.institution)
                                }
                            }
                            let parts = [nameParts.join(' ')]
                            if (affiliation) {
                                parts.push(affiliation)
                            }
                            if (author.email) {
                                parts.push(author.email)
                            }
                            return parts.join(', ')
                        }
                    ).join('; ') :
                    ''
            },
            {
                title: '@abstract', // The '@' triggers handling as block
                content: this.docContents.content[3]
            },
            {
                title: 'keywords',
                content: this.docContents.content[4].content ?
                    this.docContents.content[4].content.map(node => node.attrs.keyword).join(', ') :
                    ''
            },
            {
                title: '@body', // The '@' triggers handling as block
                content: this.docContents.content[5]
            },
            {
                title: '@bibliography', // The '@' triggers handling as block
                content: pmBib ? pmBib : {type: 'paragraph', contents: [{type:'text', text: ' '}]}
            }
        ]
    }

    // go through content.xml looking for tags and replace them with the given
    // replacements.
    render() {

        let pars = [].slice.call(this.xml.querySelectorAll('p'))

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
        let outXml = this.exporter.richtext.transformRichtext(
            tag.content,
            {
                citationType: this.exporter.citations.citFm.citationType
            }
        )
        tag.par.insertAdjacentHTML('beforebegin', outXml)
        tag.par.parentNode.removeChild(tag.par)
    }


}

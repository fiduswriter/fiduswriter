import {textContent} from "../tools/pmJSON"
import {escapeText, domDescendantTexNodes} from "../tools/html"

export class OdtExporterRender {
    constructor(exporter, pmJSON) {
        this.exporter = exporter
        this.pmJSON = pmJSON
        this.filePath = "content.xml"
        this.xml = false
    }

    init() {
        let that = this
        return this.exporter.xml.fromZip(this.filePath).then(
            function(xml) {
                that.xml = xml
                return window.Promise.resolve()
            }
        )
    }

    // Define the tags that are to be looked for in the document
    getTagData(pmBib) {

        this.tags = [
            {
                title: 'title',
                content: textContent(this.pmJSON.content[0])
            },
            {
                title: 'subtitle',
                content: textContent(this.pmJSON.content[1])
            },
            {
                title: 'authors',
                content: textContent(this.pmJSON.content[2])
            },
            {
                title: '@abstract', // The '@' triggers handling as block
                content: this.pmJSON.content[3]
            },
            {
                title: 'keywords',
                content: textContent(this.pmJSON.content[4])
            },
            {
                title: '@body', // The '@' triggers handling as block
                content: this.pmJSON.content[5]
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

        let pars = [].slice.call(this.xml.querySelectorAll('p')) // Including global page definition at end
        let that = this

        pars.forEach(function(par){
            domDescendantTexNodes(par).forEach(function(textNode){
                let text = textNode.data
                that.tags.forEach(function(tag){
                    let tagString = tag.title
                    if(text.indexOf('{'+tagString+'}') !== -1) {
                        if(tag.title[0]==='@') {
                            tag.par = par
                            that.parRender(tag)
                        } else {
                            tag.textNode = textNode
                            that.inlineRender(tag)
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

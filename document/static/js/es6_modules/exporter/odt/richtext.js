import {escapeText} from "./tools"
import {noSpaceTmp} from "../../common/common"

export class OdtExporterRichtext {
    constructor(exporter, citations, images) {
        this.exporter = exporter
        this.citations = citations
        this.images = images
        this.fnCounter = 0 // real footnotes
        this.fnAlikeCounter = 0 // real footnotes and citations as footnotes
    }

    transformRichtext(node, options = {}) {
        let start = '', content = '', end = ''

        switch(node.type) {
            case 'doc':
                break
            case 'body':
                options = _.clone(options)
                options.section = 'Text_20_body'
                break
            case 'abstract':
                options = _.clone(options)
                options.section = 'Abstract'
                break
            case 'bibliography':
                options = _.clone(options)
                options.section = 'References'
                break
            case 'paragraph':
                this.exporter.styles.checkParStyle(options.section)
                start += `<text:p text:style-name="${options.section}">`
                end = '</text:p>' + end
                break
            case 'heading':
                start += `<text:h text:outline-level="${node.attrs.level}">`
                end = '</text:h>' + end
                break
            case 'code':
                this.exporter.styles.checkParStyle('Preformatted_20_Text')
                start += '<text:p text:style-name="Preformatted_20_Text">'
                end = '</text:p>' + end
                break
            case 'blockquote':
                // This is imperfect, but Word doesn't seem to provide section/quotation nesting
                options = _.clone(options)
                options.section = 'Quote'
                break
            case 'ordered_list':
                let olId = this.exporter.styles.getOrderedListStyleId()
                start += `<text:list text:style-name="L${olId[0]}">`
                end = '</text:list>' + end
                options = _.clone(options)
                options.section = `P${olId[1]}`
                break
            case 'bullet_list':
                let ulId = this.exporter.styles.getBulletListStyleId()
                start += `<text:list text:style-name="L${ulId[0]}">`
                end = '</text:list>' + end
                options = _.clone(options)
                options.section = `P${ulId[1]}`
                break
            case 'list_item':
                start += '<text:list-item>'
                end = '</text:list-item>' + end
                break
            case 'footnotecontainer':
                break
            case 'footnote':
                options = _.clone(options)
                options.section = 'Footnote'
                content += this.transformRichtext(this.exporter.footnotes.fnPmJSON.content[this.fnCounter++], options)
                start += noSpaceTmp`
                <text:note text:id="ftn${this.fnAlikeCounter++}" text:note-class="footnote">
                    <text:note-citation>${this.fnAlikeCounter}</text:note-citation>
                    <text:note-body>`
                end = noSpaceTmp`
                    </text:note-body>
                </text:note>` + end

                break
            case 'text':
                // Check for hyperlink, bold/strong and italic/em
                let hyperlink, strong, em
                if (node.marks) {
                    strong = _.findWhere(node.marks, {_:'strong'})
                    em = _.findWhere(node.marks, {_:'em'})
                    hyperlink = _.findWhere(node.marks, {_:'link'})
                }

                if (hyperlink) {
                    start += `<text:a xlink:type="simple" xlink:href="${hyperlink.href}">`
                    end = '</text:a>' + end
                }

                if (strong || em) {
                    let styleId
                    if (strong && em) {
                        styleId = this.exporter.styles.getBoldItalicStyleId()
                    } else if (em) {
                        styleId = this.exporter.styles.getItalicStyleId()
                    } else {
                        styleId = this.exporter.styles.getBoldStyleId()
                    }
                    start += `<text:span text:style-name="T${styleId}">`
                    end = '</text:span>' + end
                }

                content += escapeText(node.text)
                break
            case 'citation':
                let that = this
                // We take the first citation from the stack and remove it.
                let cit = this.citations.pmCits.shift()
                if (options.citationType && options.citationType === 'note') {
                    // If the citations are in notes (footnotes), we need to
                    // put the contents of this citation in a footnote.
                    start += noSpaceTmp`
                    <text:note text:id="ftn${this.fnAlikeCounter++}" text:note-class="footnote">
                        <text:note-citation>${this.fnAlikeCounter}</text:note-citation>
                        <text:note-body>`
                    end = noSpaceTmp`
                        </text:note-body>
                    </text:note>` + end
                }
                options = _.clone(options)
                options.section = 'Footnote'
                content += this.transformRichtext({type:'paragraph', content:cit.content}, options)
                break
            case 'figure':
                if(node.attrs.image) {
                    let imgDBEntry = this.images.imageDB.db[node.attrs.image]
                    let imgFileName = this.images.imgIdTranslation[node.attrs.image]
                    let height = imgDBEntry.height*3/4 // more or less px to point
                    let width = imgDBEntry.width*3/4 // more or less px to point
                    this.exporter.styles.checkParStyle('Caption')
                    start += noSpaceTmp`
                    <text:p>
                        <draw:frame draw:style-name="fr1" draw:name="Image1" text:anchor-type="paragraph" style:rel-width="100%" style:rel-height="scale" svg:width="${width}pt" svg:height="${height}pt" draw:z-index="0">
                            <draw:image xlink:href="Pictures/${imgFileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                        </draw:frame>
                    </text:p>
                    <text:p text:style-name="Caption">`
                      // TODO: Add "Figure X:"/"Table X": before caption.
                      content += this.transformRichtext({type: 'text', text: node.attrs.caption}, options)
                      end = noSpaceTmp`
                    </text:p>
                    ` + end
                } else {
                    console.warn('Unhandled node type: figure (equation)')
                }
                break
            default:
                console.warn('Unhandled node type:' + node.type)
                break
        }

        if (node.content) {
            for (let i=0; i < node.content.length; i++) {
                content += this.transformRichtext(node.content[i], options)
            }
        }

        return start + content + end
    }

}

import {escapeText} from "./tools"
import {noSpaceTmp} from "../../common/common"

export class WordExporterRichtext {
    constructor(exporter) {
        this.exporter = exporter
    }

    // Add a relationship for a link
    addLinkRel(link, xmlFilePath) {
        let xml = this.exporter.xml.docs[xmlFilePath]
        let rels = xml.querySelector('Relationships')
        let rId = this.exporter.maxRelId[xmlFilePath] + 1
        let string = `<Relationship Id="rId${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${link}" TargetMode="External"/>`
        rels.insertAdjacentHTML('beforeend', string)
        this.exporter.maxRelId[xmlFilePath] = rId
        return rId
    }

    transformRichtext(node, options) {
        let start = '', content = '', end = ''

        switch(node.type) {
            case 'body':
                options = _.clone(options)
                options.section = 'Normal'
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
                // This should really be something like
                // '<w:p w:rsidR="A437D321" w:rsidRDefault="2B935ADC">'
                // See: https://blogs.msdn.microsoft.com/brian_jones/2006/12/11/whats-up-with-all-those-rsids/
                // But tests with Word 2016/LibreOffice seem to indicate that it
                // doesn't care if the attributes are missing.
                // We may need to add them later, if it turns out this is a problem
                // for other versions of Word. In that case we should also add
                // it to settings.xml as described in above link.
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="'+options.section+'"/>'
                if (options.list_type) {
                    start += '<w:numPr><w:ilvl w:val="'+options.list_depth+'"/>'
                    start += '<w:numId w:val="'+options.list_type+'"/></w:numPr>'
                } else {
                    start += '<w:rPr></w:rPr>'
                }
                start += '</w:pPr>'
                end += '</w:p>'
                break
            case 'heading':
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="Heading'+node.attrs.level+'"/><w:rPr></w:rPr></w:pPr>'
                end += '</w:p>'
                break
            case 'code':
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="Code"/><w:rPr></w:rPr></w:pPr>'
                end += '</w:p>'
                break
            case 'blockquote':
                // This is imperfect, but Word doesn't seem to provide section/quotation nesting
                options = _.clone(options)
                options.section = 'Quote'
                break
            case 'ordered_list':
                options = _.clone(options)
                options.section = 'ListParagraph'
                options.list_type = '1'
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth = 1
                }
                break
            case 'bullet_list':
                options = _.clone(options)
                options.section = 'ListParagraph'
                options.list_type = '2'
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth = 1
                }
                break
            case 'list_item':
                // Word seems to lack complex nesting options. The styling is applied
                // to child paragraphs. This will deliver correct results in most
                // cases.
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
                    let refId = this.addLinkRel(hyperlink.href, 'word/_rels/document.xml.rels')
                    start += `<w:hyperlink r:id="rId${refId}"><w:r>`
                    end += '</w:t></w:r></w:hyperlink>'
                } else {
                    start += '<w:r>'
                    end += '</w:t></w:r>'
                }

                if (hyperlink || strong || em) {
                    start += '<w:rPr>'
                    if (strong) {
                        start += '<w:b/><w:bCs/>'
                    }
                    if (em) {
                        start += '<w:i/><w:iCs/>'
                    }
                    if (hyperlink) {
                        start += '<w:rStyle w:val="Hyperlink"/>'
                    }
                    start += '</w:rPr>'
                }
                let textAttr = ''
                if (node.text[0] === ' ' || node.text[node.text.length-1] === ' ') {
                    textAttr += 'xml:space="preserve"'
                }
                start += `<w:t ${textAttr}>`

                content += escapeText(node.text)
                break
            case 'citation':
                // We take the first citation from the stack and remove it.
                let cit = this.exporter.citations.pmCits.shift()
                for (let i=0; i < cit.content.length; i++) {
                    content += this.transformRichtext(cit.content[i], options)
                }
                break
            case 'figure':
                if(node.attrs.image) {
                    let imgDBEntry = this.exporter.images.imageDB.db[node.attrs.image]
                    let cx = imgDBEntry.width * 9525 // width in EMU
                    let cy = imgDBEntry.height * 9525 // height in EMU
                    // Shrink image if too large for paper.
                    if (cx > options.dimensions.width) {
                        let rel = cy/cx
                        cx = options.dimensions.width
                        cy = cx * rel
                    }
                    if (cy > options.dimensions.height) {
                        let rel = cx/cy
                        cy = options.dimensions.height
                        cx = cy * rel
                    }
                    let rId = this.exporter.images.imgIdTranslation[node.attrs.image]
                    start += noSpaceTmp`
                    <w:p>
                      <w:pPr>
                        <w:jc w:val="center"/>
                      </w:pPr>
                      <w:r>
                        <w:rPr/>
                        <w:drawing>
                          <wp:inline distT="0" distB="0" distL="0" distR="0">
                            <wp:extent cx="${cx}" cy="${cy}"/>
                            <wp:docPr id="0" name="Picture" descr=""/>
                            <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                              <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                  <pic:nvPicPr>
                                    <pic:cNvPr id="0" name="Picture" descr=""/>
                                    <pic:cNvPicPr>
                                      <a:picLocks noChangeAspect="1" noChangeArrowheads="1"/>
                                    </pic:cNvPicPr>
                                  </pic:nvPicPr>
                                  <pic:blipFill>
                                    <a:blip r:embed="rId${rId}"/>
                                    <a:stretch>
                                      <a:fillRect/>
                                    </a:stretch>
                                  </pic:blipFill>
                                  <pic:spPr bwMode="auto">
                                    <a:xfrm>
                                      <a:off x="0" y="0"/>
                                      <a:ext cx="${cx}" cy="${cy}"/>
                                    </a:xfrm>
                                    <a:prstGeom prst="rect">
                                      <a:avLst/>
                                    </a:prstGeom>
                                    <a:noFill/>
                                    <a:ln w="9525">
                                      <a:noFill/>
                                      <a:miter lim="800000"/>
                                      <a:headEnd/>
                                      <a:tailEnd/>
                                    </a:ln>
                                  </pic:spPr>
                                </pic:pic>
                              </a:graphicData>
                            </a:graphic>
                          </wp:inline>
                        </w:drawing>
                      </w:r>
                    </w:p>
                    <w:p>
                      <w:pPr><w:pStyle w:val="Caption"/><w:rPr></w:rPr></w:pPr>`
                      // TODO: Add "Figure X:"/"Table X": before caption.
                      content += this.transformRichtext({type: 'text', text: node.attrs.caption}, options)
                      end += noSpaceTmp`
                    </w:p>
                    `
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

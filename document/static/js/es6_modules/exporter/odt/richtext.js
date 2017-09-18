import {noSpaceTmp, escapeText} from "../../common"

export class OdtExporterRichtext {
    constructor(exporter, images) {
        this.exporter = exporter
        this.images = images
        this.imgCounter = 1
        this.fnCounter = 0 // real footnotes
        this.fnAlikeCounter = 0 // real footnotes and citations as footnotes
    }

    transformRichtext(node, options = {}) {
        let start = '', content = '', end = ''

        switch(node.type) {
            case 'article':
                break
            case 'body':
                options = Object.assign({}, options)
                options.section = 'Text_20_body'
                break
            case 'abstract':
                options = Object.assign({}, options)
                options.section = 'Abstract'
                break
            case 'paragraph':
                if (!options.section) {
                    options.section = 'Text_20_body'
                }
                this.exporter.styles.checkParStyle(options.section)
                start += `<text:p text:style-name="${options.section}">`
                end = '</text:p>' + end
                break
            case 'heading':
                start += `
                    <text:h text:outline-level="${node.attrs.level}">
                    <text:bookmark text:name="${node.attrs.id}"/>`
                end = '</text:h>' + end
                break
            case 'code':
                this.exporter.styles.checkParStyle('Preformatted_20_Text')
                start += '<text:p text:style-name="Preformatted_20_Text">'
                end = '</text:p>' + end
                break
            case 'blockquote':
                // This is imperfect, but Word doesn't seem to provide section/quotation nesting
                options = Object.assign({}, options)
                options.section = 'Quote'
                break
            case 'ordered_list':
                let olId = this.exporter.styles.getOrderedListStyleId()
                start += `<text:list text:style-name="L${olId[0]}">`
                end = '</text:list>' + end
                options = Object.assign({}, options)
                options.section = `P${olId[1]}`
                break
            case 'bullet_list':
                let ulId = this.exporter.styles.getBulletListStyleId()
                start += `<text:list text:style-name="L${ulId[0]}">`
                end = '</text:list>' + end
                options = Object.assign({}, options)
                options.section = `P${ulId[1]}`
                break
            case 'list_item':
                start += '<text:list-item>'
                end = '</text:list-item>' + end
                break
            case 'footnotecontainer':
                break
            case 'footnote':
                options = Object.assign({}, options)
                options.section = 'Footnote'
                options.inFootnote = true
                content += this.transformRichtext({
                    type: 'footnotecontainer',
                    content: node.attrs.footnote
                }, options)
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
                let hyperlink, strong, em, sup, sub, smallcaps
                if (node.marks) {
                    hyperlink = node.marks.find(mark => mark.type === 'link')
                    em = node.marks.find(mark => mark.type === 'em')
                    strong = node.marks.find(mark => mark.type === 'strong')
                    smallcaps = node.marks.find(mark => mark.type === 'smallcaps')
                    sup = node.marks.find(mark => mark.type === 'sup')
                    sub = node.marks.find(mark => mark.type === 'sub')
                }

                if (hyperlink) {
                    start += `<text:a xlink:type="simple" xlink:href="${escapeText(hyperlink.attrs.href)}">`
                    end = '</text:a>' + end
                }

                let attributes = ''
                if (em) {
                    attributes += 'e'
                }
                if (strong) {
                    attributes += 's'
                }
                if (smallcaps) {
                    attributes += 'c'
                }
                if (sup) {
                    attributes += 'p'
                } else if (sub) {
                    attributes += 'b'
                }

                if (attributes.length) {
                    let styleId = this.exporter.styles.getInlineStyleId(attributes)
                    start += `<text:span text:style-name="T${styleId}">`
                    end = '</text:span>' + end
                }

                content += escapeText(node.text)
                break
            case 'citation':
                // We take the first citation from the stack and remove it.
                let cit
                if (options.inFootnote) {
                    cit = this.exporter.footnotes.citations.pmCits.shift()
                } else {
                    cit = this.exporter.citations.pmCits.shift()
                }
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
                    options = Object.assign({}, options)
                    options.section = 'Footnote'
                    content += this.transformRichtext({type:'paragraph', content:cit.content}, options)
                } else {
                    cit.content.forEach(citContent => {
                        content += this.transformRichtext(citContent, options)
                    })
                }

                break
            case 'figure':
                if(node.attrs.image !== false) {
                    let imgDBEntry = this.images.imageDB.db[node.attrs.image]
                    let imgFileName = this.images.imgIdTranslation[node.attrs.image]
                    let height = imgDBEntry.height*3/4 // more or less px to point
                    let width = imgDBEntry.width*3/4 // more or less px to point
                    this.exporter.styles.checkParStyle('Caption')
                    this.exporter.styles.checkGraphicStyle('Graphics')
                    start += noSpaceTmp`
                    <text:p>
                        <text:bookmark text:name="${node.attrs.id}"/>
                        <draw:frame draw:style-name="Graphics" draw:name="Image${this.imgCounter++}" text:anchor-type="paragraph" style:rel-width="100%" style:rel-height="scale" svg:width="${width}pt" svg:height="${height}pt" draw:z-index="0">
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
                    let latex = node.attrs.equation
                    let objectNumber = this.exporter.math.addMath(latex)
                    this.exporter.styles.checkParStyle('Caption')
                    this.exporter.styles.checkGraphicStyle('Formula')
                    start += noSpaceTmp`
                    <text:p>
                        <text:bookmark text:name="${node.attrs.id}"/>
                        <draw:frame draw:style-name="Formula" draw:name="Object${objectNumber}" text:anchor-type="as-char" draw:z-index="1">
                            <draw:object xlink:href="./Object ${objectNumber}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                            <svg:desc>formula</svg:desc>
                        </draw:frame>
                    </text:p>
                    <text:p text:style-name="Caption">`
                      // TODO: Add "Figure X:"/"Table X": before caption.
                      content += this.transformRichtext({type: 'text', text: node.attrs.caption}, options)
                      end = noSpaceTmp`
                    </text:p>
                    ` + end
                }
                break
            case 'table':
                let columns = node.content[0].content.length
                start += '<table:table>'
                start += `<table:table-column table:number-columns-repeated="${columns}" />`
                end = '</table:table>' + end
                break
            case 'table_row':
                start += '<table:table-row>'
                end = '</table:table-row>' + end
                break
            case 'table_cell':
            case 'table_header':
                if (node.attrs.rowspan && node.attrs.colspan) {
                    start += `<table:table-cell${
                            node.attrs.rowspan > 1 ?
                            ` table:number-rows-spanned="${node.attrs.rowspan}"` :
                            ''
                        }${
                            node.attrs.colspan > 1 ?
                            ` table:number-columns-spanned="${node.attrs.colspan}"` :
                            ''
                        }>`
                    end = '</table:table-cell>' + end
                } else {
                    start += '<table:covered-table-cell/>'
                }
                break
            case 'equation':
                let latex = node.attrs.equation
                let objectNumber = this.exporter.math.addMath(latex)
                this.exporter.styles.checkGraphicStyle('Formula')
                content += noSpaceTmp`
                    <draw:frame draw:style-name="Formula" draw:name="Object${objectNumber}" text:anchor-type="as-char" draw:z-index="1">
                        <draw:object xlink:href="./Object ${objectNumber}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                        <svg:desc>formula</svg:desc>
                    </draw:frame>`
                break
            case 'hard_break':
                content += '<text:line-break/>'
                break
            // CSL bib entries
            case 'cslbib':
                options = Object.assign({}, options)
                options.section = 'Bibliography_20_1'
                break
            case 'cslblock':
                end = '<text:line-break/>' + end
                break
            case 'cslleftmargin':
                end = '<text:tab/>' + end
                break
            case 'cslindent':
                start += '<text:tab/>'
                end = '<text:line-break/>' + end
                break
            case 'cslentry':
                this.exporter.styles.checkParStyle(options.section)
                start += `<text:p text:style-name="${options.section}">`
                end = '</text:p>' + end
                break
            case 'cslinline':
            case 'cslrightinline':
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

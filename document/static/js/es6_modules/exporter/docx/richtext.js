import {noSpaceTmp, escapeText} from "../../common"

export class DocxExporterRichtext {
    constructor(exporter, rels, citations, images) {
        this.exporter = exporter
        this.rels = rels
        this.citations = citations
        this.images = images
        this.fnCounter = 2 // footnotes 0 and 1 are occupied by separators by default.
        this.bookmarkCounter = 0
    }

    transformRichtext(node, options = {}) {
        let start = '', content = '', end = ''

        switch(node.type) {
            case 'article':
                break
            case 'body':
                options = Object.assign({}, options)
                options.section = 'Normal'
                break
            case 'abstract':
                options = Object.assign({}, options)
                options.section = 'Abstract'
                break
            case 'paragraph':
                if(!options.section) {
                    options.section = 'Normal'
                }
                // This should really be something like
                // '<w:p w:rsidR="A437D321" w:rsidRDefault="2B935ADC">'
                // See: https://blogs.msdn.microsoft.com/brian_jones/2006/12/11/whats-up-with-all-those-rsids/
                // But tests with Word 2016/LibreOffice seem to indicate that it
                // doesn't care if the attributes are missing.
                // We may need to add them later, if it turns out this is a problem
                // for other versions of Word. In that case we should also add
                // it to settings.xml as described in above link.
                if (options.section === 'Normal' && !options.list_type && !(node.content && node.content.length)) {
                    start += '<w:p/>'
                } else {
                    start += noSpaceTmp`
                        <w:p>
                            <w:pPr><w:pStyle w:val="${options.section}"/>`
                    if (options.list_type) {
                        start += `<w:numPr><w:ilvl w:val="${options.list_depth}"/>`
                        start += `<w:numId w:val="${options.list_type}"/></w:numPr>`
                    } else {
                        start += '<w:rPr></w:rPr>'
                    }
                    start += '</w:pPr>'
                    end = '</w:p>' + end
                }
                break
            case 'heading':
                start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading${node.attrs.level}"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
                end = '</w:p>' + end
                break
            case 'code':
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="Code"/><w:rPr></w:rPr></w:pPr>'
                end = '</w:p>' + end
                break
            case 'blockquote':
                // This is imperfect, but Word doesn't seem to provide section/quotation nesting
                options = Object.assign({}, options)
                options.section = 'Quote'
                break
            case 'ordered_list':
                options = Object.assign({}, options)
                options.section = 'ListParagraph'
                options.list_type = this.exporter.lists.getNumberedType()
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth += 1
                }
                break
            case 'bullet_list':
                options = Object.assign({}, options)
                options.section = 'ListParagraph'
                options.list_type = this.exporter.lists.getBulletType()
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth += 1
                }
                break
            case 'list_item':
                // Word seems to lack complex nesting options. The styling is applied
                // to child paragraphs. This will deliver correct results in most
                // cases.
                break
            case 'footnotecontainer':
                options = Object.assign({}, options)
                options.section = 'Footnote'
                start += `<w:footnote w:id="${this.fnCounter++}">`
                end = '</w:footnote>' + end
                options.footnoteRefMissing = true
                break
            case 'footnote':
                content += noSpaceTmp`
                    <w:r>
                        <w:rPr>
                            <w:rStyle w:val="FootnoteAnchor"/>
                        </w:rPr>
                        <w:footnoteReference w:id="${this.fnCounter++}"/>
                    </w:r>`
                break
            case 'text':
                // Check for hyperlink, bold/strong and italic/em
                let hyperlink, em, strong, smallcaps, sup, sub
                if (node.marks) {
                    hyperlink = node.marks.find(mark => mark.type === 'link')
                    em = node.marks.find(mark => mark.type === 'em')
                    strong = node.marks.find(mark => mark.type === 'strong')
                    smallcaps = node.marks.find(mark => mark.type === 'smallcaps')
                    sup = node.marks.find(mark => mark.type === 'sup')
                    sub = node.marks.find(mark => mark.type === 'sub')
                }

                if (hyperlink) {
                    let href = hyperlink.attrs.href
                    if (href[0] === '#') {
                        // Internal link
                        start += `<w:hyperlink w:anchor="${href.slice(1)}">`
                    } else {
                        // External link
                        let refId = this.rels.addLinkRel(href)
                        start += `<w:hyperlink r:id="rId${refId}">`
                    }
                    start += '<w:r>'
                    end = '</w:t></w:r></w:hyperlink>' + end
                } else {
                    start += '<w:r>'
                    end = '</w:t></w:r>' + end
                }

                if (hyperlink || em || strong || smallcaps || sup || sub) {
                    start += '<w:rPr>'
                    if (hyperlink) {
                        start += '<w:rStyle w:val="Hyperlink"/>'
                    }
                    if (em) {
                        start += '<w:i/><w:iCs/>'
                    }
                    if (strong) {
                        start += '<w:b/><w:bCs/>'
                    }
                    if (smallcaps) {
                        start += '<w:smallCaps/>'
                    }
                    if (sup) {
                        start += '<w:vertAlign w:val="superscript"/>'
                    } else if (sub) {
                        start += '<w:vertAlign w:val="subscript"/>'
                    }

                    start += '</w:rPr>'
                }
                if (options.footnoteRefMissing) {
                    start+= '<w:footnoteRef /><w:tab />'
                    options.footnoteRefMissing = false
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
                let cit = this.citations.pmCits.shift()
                if (options.citationType && options.citationType === 'note') {
                    // If the citations are in notes (footnotes), we need to
                    // put the contents of this citation in a footnote.
                    // We then add the footnote to the footnote file and
                    // adjust the ids of all subsequent footnotes to be one higher
                    // than what they were until now.
                    content += noSpaceTmp`
                        <w:r>
                            <w:rPr>
                                <w:rStyle w:val="FootnoteAnchor"/>
                            </w:rPr>
                            <w:footnoteReference w:id="${this.fnCounter}"/>
                        </w:r>`
                    let fnContents = this.transformRichtext(cit, {
                        footnoteRefMissing: true,
                        section: 'Footnote'
                    })
                    let fnXml = `<w:footnote w:id="${this.fnCounter}">${fnContents}</w:footnote>`
                    let xml = this.exporter.footnotes.xml
                    let lastId = this.fnCounter - 1
                    let footnotes = [].slice.call(xml.querySelectorAll('footnote'))
                    footnotes.forEach(
                        footnote => {
                            let id = parseInt(footnote.getAttribute('w:id'))
                            if (id >= this.fnCounter) {
                                footnote.setAttribute('w:id', id+1)
                            }
                            if (id===lastId) {
                                footnote.insertAdjacentHTML('afterend', fnXml)
                            }
                        }
                    )
                    this.fnCounter++
                } else {
                    for (let i=0; i < cit.content.length; i++) {
                        content += this.transformRichtext(cit.content[i], options)
                    }
                }
                break
            case 'figure':
                if(node.attrs.image !== false) {
                    let imgDBEntry = this.images.imageDB.db[node.attrs.image]
                    let cx = imgDBEntry.width * 9525 // width in EMU
                    let cy = imgDBEntry.height * 9525 // height in EMU
                    // Shrink image if too large for paper.
                    if (options.dimensions) {
                        let width = options.dimensions.width
                        if (options.tableSideMargins) {
                            width = width - options.tableSideMargins
                        }
                        if (cx > width) {
                            let rel = cy/cx
                            cx = width
                            cy = cx * rel
                        }
                        if (cy > options.dimensions.height) {
                            let rel = cx/cy
                            cy = options.dimensions.height
                            cx = cy * rel
                        }
                    }
                    cy = Math.round(cy)
                    cx = Math.round(cx)
                    let rId = this.images.imgIdTranslation[node.attrs.image]
                    start += noSpaceTmp`
                    <w:p>
                      <w:pPr>
                        <w:jc w:val="center"/>
                      </w:pPr>
                      <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                      <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>
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
                      end = '</w:p>' + end
                } else {
                    let latex = node.attrs.equation
                    let omml = this.exporter.math.getOmml(latex)
                    start += noSpaceTmp`
                        <w:p>${omml}</w:p>
                        <w:p>
                          <w:pPr><w:pStyle w:val="Caption"/><w:rPr></w:rPr></w:pPr>`
                    content += this.transformRichtext({type: 'text', text: node.attrs.caption}, options)
                    end =  '</w:p>' + end
                }
                break
            case 'table':
                this.exporter.tables.addTableGridStyle()
                start += noSpaceTmp`
                    <w:tbl>
                        <w:tblPr>
                            <w:tblStyle w:val="${this.exporter.tables.tableGridStyle}" />
                            <w:tblW w:w="0" w:type="auto" />
                            <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1" />
                        </w:tblPr>
                        <w:tblGrid>`
                let columns = node.content[0].content.reduce((columns, cell) => columns + cell.attrs.colspan, 0)
                let rows = node.content.length
                // Add empty cells for col/rowspan
                let fixedTableMatrix = Array.apply(0, {length: rows}).map(
                    item => ({type: 'table_row', content: Array.apply(0, {length: columns})})
                )
                let rowIndex = -1
                node.content.forEach(row => {
                    let columnIndex = 0
                    rowIndex++
                    if (!row.content) {
                        return
                    }
                    row.content.forEach(cell => {
                        while (
                            fixedTableMatrix[rowIndex].content[columnIndex]
                        ) {
                            columnIndex++
                        }
                        for (let i=0; i < cell.attrs.rowspan; i++) {
                            for (let j=0; j < cell.attrs.colspan; j++) {
                                let fixedCell
                                if (i===0 && j===0) {
                                    fixedCell = cell
                                } else {
                                    fixedCell = {
                                        type: 'table_cell',
                                        attrs: {
                                            rowspan: cell.attrs.rowspan > 1 ? 0 : 1,
                                            colspan: cell.attrs.colspan > 1 ? 0 : 1
                                        }
                                    }
                                }
                                fixedTableMatrix[rowIndex+i].content[columnIndex+j] = fixedCell
                            }
                        }
                    })
                })
                node.content = fixedTableMatrix
                let cellWidth = 63500 // standard width
                options = Object.assign({}, options)
                if (options.dimensions && options.dimensions.width) {
                    cellWidth = parseInt(options.dimensions.width / columns) - 2540 // subtracting for border width
                } else if (!options.dimensions) {
                    options.dimensions = {}
                }

                options.dimensions = Object.assign({}, options.dimensions)
                options.dimensions.width = cellWidth
                options.tableSideMargins = this.exporter.tables.getSideMargins()
                for (let i=0;i<columns;i++) {
                    start += `<w:gridCol w:w="${parseInt(cellWidth / 635)}" />`
                }
                start += '</w:tblGrid>'
                end = '</w:tbl>' + end

                break
            case 'table_row':
                start += '<w:tr>'
                end = '</w:tr>' + end
                break
            case 'table_cell':
                start += noSpaceTmp`
                    <w:tc>
                        <w:tcPr>
                            ${
                                node.attrs.rowspan && node.attrs.colspan ?
                                `<w:tcW w:w="${parseInt(options.dimensions.width  / 635)}" w:type="dxa" />` :
                                '<w:tcW w:w="0" w:type="auto" />'
                            }
                            ${
                                node.attrs.rowspan ?
                                node.attrs.rowspan > 1 ?
                                '<w:vMerge w:val="restart" />' :
                                '' :
                                '<w:vMerge/>'
                            }
                            ${
                                node.attrs.colspan ?
                                node.attrs.colspan > 1 ?
                                '<w:hMerge w:val="restart" />' :
                                '' :
                                '<w:hMerge/>'
                            }
                        </w:tcPr>
                        ${
                            node.content ?
                            '' :
                            '<w:p/>'
                        }`
                end = '</w:tc>' + end

                break
            case 'equation':
                let latex = node.attrs.equation
                content += this.exporter.math.getOmml(latex)
                break
            case 'hard_break':
                content += '<w:r><w:br/></w:r>'
                break
            // CSL bib entries
            case 'cslbib':
                options = Object.assign({}, options)
                options.section = 'Bibliography1'
                break
            case 'cslblock':
                end = '<w:r><w:br/></w:r>' + end
                break
            case 'cslleftmargin':
                end = '<w:r><w:tab/></w:r>' + end
                break
            case 'cslindent':
                start += '<w:r><w:tab/></w:r>'
                end = '<w:r><w:br/></w:r>' + end
                break
            case 'cslentry':
                start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="${options.section}"/>
                            <w:rPr></w:rPr>
                        </w:pPr>`
                end = '</w:p>' + end
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

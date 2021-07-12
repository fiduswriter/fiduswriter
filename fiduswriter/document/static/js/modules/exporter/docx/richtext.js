import {
    noSpaceTmp,
    escapeText
} from "../../common"
import {
    CATS
} from "../../schema/i18n"

export class DocxExporterRichtext {
    constructor(exporter, rels, citations, images) {
        this.exporter = exporter
        this.rels = rels
        this.citations = citations
        this.images = images
        this.fnCounter = 2 // footnotes 0 and 1 are occupied by separators by default.
        this.bookmarkCounter = 0
        this.categoryCounter = {} // counters for each type of figure (figure/table/photo)
        this.fncategoryCounter = {}
        this.docPrCount = 0
    }

    transformRichtext(node, options = {}) {
        let start = '',
            content = '',
            end = ''

        switch (node.type) {
        case 'paragraph':
            if (!options.section) {
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
            if (options.section === 'Normal' && !options.list_type && !(node.content?.length)) {
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
        case 'bibliography_heading':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="BibliographyHeading"/>
                            <w:rPr></w:rPr>
                        </w:pPr>`
            end = '</w:p>' + end
            break
        case 'heading1':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading1"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'heading2':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading2"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'heading3':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading3"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'heading4':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading4"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'heading5':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading5"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'heading6':
            start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Heading6"/>
                            <w:rPr></w:rPr>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
            end = '</w:p>' + end
            break
        case 'code_block':
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
            if (options.list_depth === undefined) {
                options.list_depth = 0
            } else {
                options.list_depth += 1
            }
            options.list_type = this.exporter.lists.getNumberedType()
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
            options.inFootnote = true
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
        {
            let hyperlink, em, strong, underline, smallcaps, sup, sub
            // Check for hyperlink, bold/strong and italic/em
            if (node.marks) {
                hyperlink = node.marks.find(mark => mark.type === 'link')
                em = node.marks.find(mark => mark.type === 'em')
                strong = node.marks.find(mark => mark.type === 'strong')
                underline = node.marks.find(mark => mark.type === 'underline')
                smallcaps = node.marks.find(mark => mark.type === 'smallcaps')
                sup = node.marks.find(mark => mark.type === 'sup')
                sub = node.marks.find(mark => mark.type === 'sub')
            }

            if (hyperlink) {
                const href = hyperlink.attrs.href
                if (href[0] === '#') {
                    // Internal link
                    start += `<w:hyperlink w:anchor="${href.slice(1)}">`
                } else {
                    // External link
                    const refId = this.rels.addLinkRel(href)
                    start += `<w:hyperlink r:id="rId${refId}">`
                }
                start += '<w:r>'
                end = '</w:t></w:r></w:hyperlink>' + end
            } else {
                start += '<w:r>'
                end = '</w:t></w:r>' + end
            }

            if (hyperlink || em || strong || underline || smallcaps || sup || sub) {
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
                if (underline) {
                    start += '<w:u w:val="single"/>'
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
                start += '<w:footnoteRef /><w:tab />'
                options.footnoteRefMissing = false
            }
            let textAttr = ''
            if (node.text[0] === ' ' || node.text[node.text.length - 1] === ' ') {
                textAttr += 'xml:space="preserve"'
            }
            start += `<w:t ${textAttr}>`

            content += escapeText(node.text)
            break
        }
        case 'cross_reference': {
            const title = node.attrs.title
            const id = node.attrs.id
            if (title) {
                start += `<w:hyperlink w:anchor="${id}"><w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr><w:t>`
                end = '</w:t></w:r></w:hyperlink>' + end
            } else {
                start += '<w:r><w:t>'
                end = '</w:t></w:r>' + end
            }
            content += escapeText(title || 'MISSING TARGET')
            break
        }
        case 'citation':
        {
            // We take the first citation from the stack and remove it.
            const cit = this.citations.pmCits.shift()
            if (options.citationType === 'note'  && !options.inFootnote) {
                // If the citations are in notes (footnotes), we need to
                // put the content of this citation in a footnote.
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
                const fnContents = this.transformRichtext(cit, {
                    footnoteRefMissing: true,
                    section: 'Footnote'
                })
                const fnXml = `<w:footnote w:id="${this.fnCounter}">${fnContents}</w:footnote>`
                const xml = this.exporter.footnotes.xml
                const lastId = this.fnCounter - 1
                const footnotes = xml.querySelectorAll('footnote')
                footnotes.forEach(
                    footnote => {
                        const id = parseInt(footnote.getAttribute('w:id'))
                        if (id >= this.fnCounter) {
                            footnote.setAttribute('w:id', id + 1)
                        }
                        if (id === lastId) {
                            footnote.insertAdjacentHTML('afterend', fnXml)
                        }
                    }
                )
                this.fnCounter++
            } else {
                for (let i = 0; i < cit.content.length; i++) {
                    content += this.transformRichtext(cit.content[i], options)
                }
            }
            break
        }
        case 'figure':
        {
            const category = node.attrs.category
            let caption = node.attrs.caption ? node.content.find(node => node.type === 'figure_caption')?.content || [] : []
            let catCountXml = ''
            if (category !== 'none') {
                const categoryCounter = options.inFootnote ? this.fncategoryCounter : this.categoryCounter
                if (!categoryCounter[category]) {
                    categoryCounter[category] = 1
                }
                catCountXml = `<w:r>
                        <w:t xml:space="preserve">${CATS[category][this.exporter.doc.settings.language]} </w:t>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="begin"></w:fldChar>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:instrText> SEQ ${category} \\* ARABIC </w:instrText>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="separate" />
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:t>${categoryCounter[category]++}${ options.inFootnote ? 'A' : ''}</w:t>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="end" />
                    </w:r>`
                if (caption.length) {
                    caption = [{type: 'text', text: ': '}].concat(caption)
                }
            }
            let cx, cy
            const image = node.content.find(node => node.type === 'image')?.attrs.image || false
            if (image !== false) {
                const imgDBEntry = this.images.imageDB.db[image]
                cx = imgDBEntry.width * 9525 // width in EMU
                cy = imgDBEntry.height * 9525 // height in EMU
                const imgTitle = imgDBEntry.title
                // Shrink image if too large for paper.
                if (options.dimensions) {
                    let width = options.dimensions.width
                    if (options.tableSideMargins) {
                        width = width - options.tableSideMargins
                    }
                    width = width * parseInt(node.attrs.width) / 100
                    if (cx > width) {
                        const rel = cy / cx
                        cx = width
                        cy = cx * rel
                    }
                    if (cy > options.dimensions.height) {
                        const rel = cx / cy
                        cy = options.dimensions.height
                        cx = cy * rel
                    }
                }
                cy = Math.round(cy)
                cx = Math.round(cx)
                const rId = this.images.imgIdTranslation[image]
                content += noSpaceTmp`<w:r>
                      <w:rPr/>
                      <w:drawing>
                        <wp:inline distT="0" distB="0" distL="0" distR="0">
                          <wp:extent cx="${cx}" cy="${cy}"/>
                          <wp:docPr id="${this.docPrCount}" name="Picture${this.docPrCount++}" descr=""/>
                          <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                            <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">
                              <pic:pic xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture">
                                <pic:nvPicPr>
                                  <pic:cNvPr id="0" name="${imgTitle}" descr=""/>
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
                    </w:r>`
            } else {
                cx = 9525 * 100 // We pick a random size of 100x100. We hope this will fit the formula
                cy = 9525 * 100
                const latex = node.content.find(node => node.type === 'figure_equation')?.attrs.equation || ''
                content += this.exporter.math.getOmml(latex)
            }
            const captionSpace = !!(catCountXml.length || caption.length)
            if (node.attrs.aligned === 'center') {
                start += noSpaceTmp`
                    <w:p>
                      <w:pPr>
                        <w:jc w:val="center"/>
                      </w:pPr>
                      <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                      <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`
                end = `
                    </w:p>
                    ${ captionSpace ?
        noSpaceTmp`<w:p>
                          <w:pPr><w:pStyle w:val="Caption"/><w:rPr></w:rPr></w:pPr>
                          ${catCountXml}
                          ${caption.map(node => this.transformRichtext(node)).join('')}
                    </w:p>` : ''
}` + end
            } else {
                start += noSpaceTmp`
                    <w:p>
                      <w:pPr>
                        <w:jc w:val="center"/>
                      </w:pPr>
                      <w:r>
                        <w:rPr/>
                          <w:drawing>
                            <wp:anchor behindDoc="0" distT="95250" distB="95250" distL="95250" distR="95250" simplePos="0" locked="0" layoutInCell="1" allowOverlap="0" relativeHeight="2">
                                <wp:simplePos x="0" y="0" />
                                <wp:positionH relativeFrom="column">
                                    <wp:align>${node.attrs.aligned}</wp:align>
                                </wp:positionH>
                                <wp:positionV relativeFrom="paragraph">
                                    <wp:posOffset>0</wp:posOffset>
                                </wp:positionV>
                                <wp:extent cx="${cx}" cy="${captionSpace ? cy + 350520 : cy}" />
                                <wp:effectExtent l="0" t="0" r="0" b="0" />
                                <wp:wrapSquare wrapText="largest" />
                                <wp:docPr id="${this.docPrCount}" name="Frame${this.docPrCount++}" />
                                <a:graphic xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
                                    <a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingShape">
                                        <wps:wsp>
                                            <wps:cNvSpPr txBox="1" />
                                            <wps:spPr>
                                                <a:xfrm>
                                                    <a:off x="0" y="0" />
                                                    <a:ext cx="${cx}" cy="${captionSpace ? cy + 350520 : cy}" />
                                                </a:xfrm>
                                                <a:prstGeom prst="rect" />
                                            </wps:spPr>
                                            <wps:txbx>
                                                <w:txbxContent>
                                                    <w:p>
                                                        <w:pPr>
                                                            <w:pStyle w:val="Caption" />
                                                            <w:spacing w:before="20" w:after="220" />
                                                            <w:rPr></w:rPr>
                                                        </w:pPr>
                                                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                                                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>`

                end = noSpaceTmp`
                                                        ${catCountXml}
                                                        ${caption.map(node => this.transformRichtext(node)).join('')}
                                                    </w:p>
                                                </w:txbxContent>
                                            </wps:txbx>
                                            <wps:bodyPr anchor="t" lIns="0" tIns="0" rIns="0" bIns="0">
                                                <a:noAutofit />
                                            </wps:bodyPr>
                                        </wps:wsp>
                                    </a:graphicData>
                                </a:graphic>
                                  <wp14:sizeRelH relativeFrom="margin">
                                    <wp14:pctWidth>${node.attrs.width}000</wp14:pctWidth>
                                </wp14:sizeRelH>
                            </wp:anchor>
                        </w:drawing>
                      </w:r>
                    </w:p>` + end
            }
            break
        }
        case 'figure_caption':
            // We are already dealing with this in the figure. Prevent content from being added a second time.
            return ''
        case 'figure_equation':
            // We are already dealing with this in the figure.
            break
        case 'image':
            // We are already dealing with this in the figure.
            break
        case 'table':
        {
            const category = node.attrs.category
            let caption = node.attrs.caption ? node.content[0].content || [] : []
            let catCountXml = ''
            if (category !== 'none') {
                const categoryCounter = options.inFootnote ? this.fncategoryCounter : this.categoryCounter
                if (!categoryCounter[category]) {
                    categoryCounter[category] = 1
                }
                catCountXml = `<w:r>
                        <w:t xml:space="preserve">${CATS[category][this.exporter.doc.settings.language]} </w:t>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="begin"></w:fldChar>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:instrText> SEQ ${category} \\* ARABIC </w:instrText>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="separate" />
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:t>${categoryCounter[category]++}${ options.inFootnote ? 'A' : ''}</w:t>
                    </w:r>
                    <w:r>
                        <w:rPr></w:rPr>
                        <w:fldChar w:fldCharType="end" />
                    </w:r>`
                if (caption.length) {
                    caption = [{type: 'text', text: ': '}].concat(caption)
                }
            }
            const captionSpace = !!(catCountXml.length || caption.length)
            if (captionSpace) {
                start += noSpaceTmp`
                    <w:p>
                        <w:pPr>
                            <w:pStyle w:val="Caption"/>
                            <w:keepNext/>
                        </w:pPr>
                        <w:bookmarkStart w:name="${node.attrs.id}" w:id="${this.bookmarkCounter}"/>
                        <w:bookmarkEnd w:id="${this.bookmarkCounter++}"/>
                        ${catCountXml}
                        ${caption.map(node => this.transformRichtext(node)).join('')}
                    </w:p>`
            }
            this.exporter.tables.addTableGridStyle()
            start += noSpaceTmp`
                    <w:tbl>
                        <w:tblPr>
                            <w:tblStyle w:val="${this.exporter.tables.tableGridStyle}" />
                            ${
    node.attrs.width === '100' ?
        '<w:tblW w:w="0" w:type="auto" />' :
        noSpaceTmp`<w:tblW w:w="${50 * parseInt(node.attrs.width)}" w:type="pct" />
                                    <w:jc w:val="${node.attrs.aligned}" />`
}
                            <w:tblLook w:val="04A0" w:firstRow="1" w:lastRow="0" w:firstColumn="1" w:lastColumn="0" w:noHBand="0" w:noVBand="1" />
                        </w:tblPr>
                        <w:tblGrid>`
            const columns = node.content[1].content[0].content.length
            let cellWidth = 63500 // standard width
            options = Object.assign({}, options)
            if (options.dimensions?.width) {
                cellWidth = parseInt(options.dimensions.width / columns) - 2540 // subtracting for border width
            } else if (!options.dimensions) {
                options.dimensions = {}
            }

            options.dimensions = Object.assign({}, options.dimensions)
            options.dimensions.width = cellWidth
            options.tableSideMargins = this.exporter.tables.getSideMargins()
            for (let i = 0; i < columns; i++) {
                start += `<w:gridCol w:w="${parseInt(cellWidth / 635)}" />`
            }
            start += '</w:tblGrid>'
            end = '</w:tbl>' + end

            break
        }
        case 'table_body':
            // Pass through to table.
            break
        case 'table_caption':
            // We already deal with this in 'table'.
            return ''
        case 'table_row':
            start += '<w:tr>'
            end = '</w:tr>' + end
            break
        case 'table_cell':
        case 'table_header':
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
        {
            const latex = node.attrs.equation
            content += this.exporter.math.getOmml(latex)
            break
        }
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
            break
        }

        if (node.content) {
            for (let i = 0; i < node.content.length; i++) {
                content += this.transformRichtext(node.content[i], options)
            }
        }
        return start + content + end
    }
}

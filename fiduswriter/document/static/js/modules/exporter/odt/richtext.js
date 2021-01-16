import {noSpaceTmp, escapeText} from "../../common"
import {
    CATS
} from "../../schema/i18n"

export class OdtExporterRichtext {
    constructor(exporter, images) {
        this.exporter = exporter
        this.images = images
        this.imgCounter = 1
        this.fnCounter = 0 // real footnotes
        this.fnAlikeCounter = 0 // real footnotes and citations as footnotes
        this.categoryCounter = {} // counters for each type of table/figure category (figure/table/photo)
        this.fnCategoryCounter = {} // counters for each type of table/figure category (figure/table/photo)
        this.zIndex = 0
    }

    transformRichtext(node, options = {}) {
        let start = '', content = '', end = ''
        switch (node.type) {
        case 'paragraph':
            if (!options.section) {
                options.section = 'Text_20_body'
            }
            this.exporter.styles.checkParStyle(options.section)
            start += `<text:p text:style-name="${options.section}">`
            end = '</text:p>' + end
            break
        case 'bibliography_heading':
            this.exporter.styles.checkParStyle('Bibliography_20_Heading')
            start += `<text:p text:style-name="Bibliography_20_Heading">`
            end = '</text:p>' + end
            break
        case 'heading1':
            start += `
                    <text:h text:outline-level="1">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'heading2':
            start += `
                    <text:h text:outline-level="2">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'heading3':
            start += `
                    <text:h text:outline-level="3">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'heading4':
            start += `
                    <text:h text:outline-level="4">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'heading5':
            start += `
                    <text:h text:outline-level="5">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'heading6':
            start += `
                    <text:h text:outline-level="6">
                    <text:bookmark-start text:name="${node.attrs.id}"/>`
            end = `<text:bookmark-end text:name="${node.attrs.id}"/></text:h>` + end
            break
        case 'code_block':
            this.exporter.styles.checkParStyle('Preformatted_20_Text')
            start += '<text:p text:style-name="Preformatted_20_Text">'
            end = '</text:p>' + end
            break
        case 'blockquote':
            // This is imperfect, but Word doesn't seem to provide section/quotation nesting
            options = Object.assign({}, options)
            options.section = 'Quote'
            break
        case 'ordered_list': {
            const olId = this.exporter.styles.getOrderedListStyleId(node.attrs.order)
            start += `<text:list text:style-name="L${olId[0]}">`
            end = '</text:list>' + end
            options = Object.assign({}, options)
            options.section = `P${olId[1]}`
            break
        }
        case 'bullet_list': {
            const ulId = this.exporter.styles.getBulletListStyleId()
            start += `<text:list text:style-name="L${ulId[0]}">`
            end = '</text:list>' + end
            options = Object.assign({}, options)
            options.section = `P${ulId[1]}`
            break
        }
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
        case 'text': {
            let hyperlink, strong, em, underline, sup, sub, smallcaps
            // Check for hyperlink, bold/strong and italic/em
            if (node.marks) {
                hyperlink = node.marks.find(mark => mark.type === 'link')
                strong = node.marks.find(mark => mark.type === 'strong')
                em = node.marks.find(mark => mark.type === 'em')
                underline = node.marks.find(mark => mark.type === 'underline')
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
            if (underline) {
                attributes += 'u'
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
                const styleId = this.exporter.styles.getInlineStyleId(attributes)
                start += `<text:span text:style-name="T${styleId}">`
                end = '</text:span>' + end
            }

            content += escapeText(node.text)
            break
        }
        case 'citation': {
            let cit
            // We take the first citation from the stack and remove it.
            if (options.inFootnote) {
                cit = this.exporter.footnotes.citations.pmCits.shift()
            } else {
                cit = this.exporter.citations.pmCits.shift()
            }
            if (options.citationType === 'note') {
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
                content += this.transformRichtext({type: 'paragraph', content: cit.content}, options)
            } else {
                cit.content.forEach(citContent => {
                    content += this.transformRichtext(citContent, options)
                })
            }

            break
        }
        case 'figure': {
            // NOTE: The difficulty is to make several images with different
            // alignments/widths not overlap one-another. The below code
            // makes a reasonable attempt at that, but it seems there is no
            // way to guarantee it from happening.
            this.exporter.styles.checkParStyle('Standard')
            start += '<text:p text:style-name="Standard">'
            end = '</text:p>' + end

            if (node.attrs.aligned === 'center') {
                // Needed to prevent subsequent image from overlapping
                end = end + '<text:p text:style-name="Standard"></text:p>'
            }
            let caption = node.attrs.caption ? node.content.find(node => node.type === 'figure_caption')?.content?.map(node => this.transformRichtext(node)).join('') || '' : ''
            // The figure category should not be in the
            // user's language but rather the document language
            const category = node.attrs.category
            if (category !== 'none') {
                const categoryCounter = options.inFootnote ? this.fnCategoryCounter : this.categoryCounter
                if (!categoryCounter[category]) {
                    categoryCounter[category] = 1
                }
                const catCount = categoryCounter[category]++
                const catCountXml = `<text:sequence text:ref-name="ref${category}${catCount - 1}${options.inFootnote ? 'A' : ''}" text:name="${category}" text:formula="ooow:${category}+1" style:num-format="1">${catCount}${options.inFootnote ? 'A' : ''}</text:sequence>`
                if (caption.length) {
                    caption = `<text:bookmark-start text:name="${node.attrs.id}"/>${CATS[category][this.exporter.doc.settings.language]} ${catCountXml}<text:bookmark-end text:name="${node.attrs.id}"/>: ${caption}`
                } else {
                    caption = `<text:bookmark-start text:name="${node.attrs.id}"/>${CATS[category][this.exporter.doc.settings.language]} ${catCountXml}<text:bookmark-end text:name="${node.attrs.id}"/>`
                }
            }
            let relWidth = node.attrs.width
            let aligned = node.attrs.aligned
            let frame
            const image = node.content.find(node => node.type === 'image')?.attrs.image || false
            if (
                caption.length ||
                    image === false
            ) {
                frame = true
                this.exporter.styles.checkParStyle('Caption')
                this.exporter.styles.checkParStyle('Figure')
                const graphicStyleId = this.exporter.styles.getGraphicStyleId('Frame', aligned)
                start += noSpaceTmp`<draw:frame draw:style-name="fr${graphicStyleId}" draw:name="Frame${graphicStyleId}" text:anchor-type="paragraph" svg:width="0.0161in" style:rel-width="${relWidth}%" draw:z-index="${this.zIndex++}">
                        <draw:text-box fo:min-height="0in">
                            <text:p text:style-name="Figure">`
                relWidth = '100' // percentage width of image inside of frame is always 100
                aligned = 'center' // Aligned inside of frame is always 'center'
                end = noSpaceTmp`
                            </text:p>
                        </draw:text-box>
                    </draw:frame>` + end
                if (caption.length) {
                    end = `<text:line-break />${caption}` + end
                }
            }
            if (image !== false) {
                const imgDBEntry = this.images.imageDB.db[image]
                const imgFileName = this.images.imgIdTranslation[image]
                const height = imgDBEntry.height * 3 / 4 // more or less px to point
                const width = imgDBEntry.width * 3 / 4 // more or less px to point
                const graphicStyleId = this.exporter.styles.getGraphicStyleId('Graphics', aligned)
                content += noSpaceTmp`
                        <draw:frame draw:style-name="${graphicStyleId}" draw:name="Image${this.imgCounter++}" text:anchor-type="${frame ? 'paragraph' : 'as-char'}" style:rel-width="${relWidth}%" style:rel-height="scale" svg:width="${width}pt" svg:height="${height}pt" draw:z-index="${this.zIndex++}">
                            <draw:image xlink:href="Pictures/${imgFileName}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                        </draw:frame>`
            } else {
                const latex = node.content.find(node => node.type === 'figure_equation')?.attrs.equation
                const objectNumber = this.exporter.math.addMath(latex)
                const graphicStyleId = this.exporter.styles.getGraphicStyleId('Formula')
                content += noSpaceTmp`
                        <draw:frame draw:style-name="${graphicStyleId}" draw:name="Object${objectNumber}" text:anchor-type="as-char" draw:z-index="${this.zIndex++}">
                            <draw:object xlink:href="./Object ${objectNumber}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                            <svg:desc>formula</svg:desc>
                        </draw:frame>`
            }
            if (category === 'none') {
                content += `<text:bookmark text:name="${node.attrs.id}"/>`
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
        case 'table': {
            let caption = node.attrs.caption ? node.content[0].content?.map(node => this.transformRichtext(node)).join('') || '' : ''
            // The table category should not be in the
            // user's language but rather the document language
            const category = node.attrs.category
            if (category !== 'none') {
                const categoryCounter = options.inFootnote ? this.fnCategoryCounter : this.categoryCounter
                if (!categoryCounter[category]) {
                    categoryCounter[category] = 1
                }
                const catCount = categoryCounter[category]++
                const catCountXml = `<text:sequence text:ref-name="ref${category}${catCount - 1}${options.inFootnote ? 'A' : ''}" text:name="${category}" text:formula="ooow:${category}+1" style:num-format="1">${catCount}${options.inFootnote ? 'A' : ''}</text:sequence>`
                if (caption.length) {
                    caption = `<text:bookmark-start text:name="${node.attrs.id}"/>${CATS[category][this.exporter.doc.settings.language]} ${catCountXml}<text:bookmark-end text:name="${node.attrs.id}"/>: ${caption}`
                } else {
                    caption = `<text:bookmark-start text:name="${node.attrs.id}"/>${CATS[category][this.exporter.doc.settings.language]} ${catCountXml}<text:bookmark-end text:name="${node.attrs.id}"/>`
                }
            }
            if (caption.length) {
                if (!options.section) {
                    options.section = 'Text_20_body'
                }
                this.exporter.styles.checkParStyle(options.section)
                start += `<text:p text:style-name="${options.section}">${caption}</text:p>`
            }
            const columns = node.content[1].content[0].content.length
            if (node.attrs.width === '100') {
                start += '<table:table>'
            } else {
                const styleId = this.exporter.styles.getTableStyleId(
                    node.attrs.aligned,
                    node.attrs.width
                )
                start += `<table:table table:style-name="Table${styleId}">`
            }
            start += `<table:table-column table:number-columns-repeated="${columns}" />`
            end = '</table:table>' + end
            break
        }
        case 'table_body':
            // Pass through to table.
            break
        case 'table_caption':
            // We already deal with this in 'table'.
            return ''
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
        case 'equation': {
            const latex = node.attrs.equation
            const objectNumber = this.exporter.math.addMath(latex)
            const styleId = this.exporter.styles.getGraphicStyleId('Formula')
            content += noSpaceTmp`
                    <draw:frame draw:style-name="${styleId}" draw:name="Object${objectNumber}" text:anchor-type="as-char" draw:z-index="${this.zIndex++}">
                        <draw:object xlink:href="./Object ${objectNumber}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad"/>
                        <svg:desc>formula</svg:desc>
                    </draw:frame>`
            break
        }
        case 'cross_reference': {
            const title = node.attrs.title
            const id = node.attrs.id
            if (title) {
                start += `<text:bookmark-ref text:reference-format="text" text:ref-name="${id}">`
                end = '</text:bookmark-ref>' + end
            }
            content += escapeText(title || 'MISSING TARGET')
            break
        }
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

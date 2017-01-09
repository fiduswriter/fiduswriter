import {noSpaceTmp} from "../../common/common"

const GRAPHIC_STYLES = {
    Formula: noSpaceTmp`
        <style:style style:name="Formula" style:family="graphic">
            <style:graphic-properties text:anchor-type="as-char" svg:y="0in" fo:margin-left="0.0791in" fo:margin-right="0.0791in" style:vertical-pos="middle" style:vertical-rel="text"/>
        </style:style>`,
    Graphics: noSpaceTmp`
        <style:style style:name="Graphics" style:family="graphic">
            <style:graphic-properties text:anchor-type="paragraph" svg:x="0in" svg:y="0in" style:wrap="dynamic" style:number-wrapped-paragraphs="no-limit" style:wrap-contour="false" style:vertical-pos="top" style:vertical-rel="paragraph" style:horizontal-pos="center" style:horizontal-rel="paragraph"/>
        </style:style>`
}


export class OdtExporterStyles {
    constructor(exporter) {
        this.exporter = exporter
        this.contentXml = false
        this.stylesXml = false
        this.boldStyleId = false
        this.italicStyleId = false
        this.boldItalicStyleId = false
        this.inlineStyleIds = {}
        this.orderedListStyleId = [false, false]
        this.bulletListStyleId = [false, false]
        this.inlineStyleCounter = 0
        this.blockStyleCounter = 0
        this.listStyleCounter = 0
    }

    init() {
        return this.exporter.xml.getXml("styles.xml").then(stylesXml => {
            this.stylesXml = stylesXml
            return this.exporter.xml.getXml("content.xml")
        }).then(contentXml => {
            this.contentXml = contentXml
            this.getStyleCounters()
            return Promise.resolve()
        })
    }

    getStyleCounters() {
        let styles = [].slice.call(this.contentXml.querySelectorAll('automatic-styles style'))
        styles.forEach(style => {
            let styleNumber = parseInt(style.getAttribute('style:name').replace(/\D/g,''))
            let styleFamily = style.getAttribute('style:family')
            if (styleFamily==='text') {
                if (styleNumber>this.inlineStyleCounter) {
                    this.inlineStyleCounter = styleNumber
                }
            } else {
                if (styleNumber>this.blockStyleCounter) {
                    this.blockStyleCounter = styleNumber
                }
            }
        })
        let listStyles = [].slice.call(this.contentXml.querySelectorAll('automatic-styles list-style'))
        listStyles.forEach(style => {
            let styleNumber = parseInt(style.getAttribute('style:name').replace(/\D/g,''))
            if (styleNumber>this.listStyleCounter) {
                this.listStyleCounter = styleNumber
            }
        })
    }

    /*
    attributes is a string that consists of these characters (in this order).
    Only one of super/sub possible.
    e = italic/em
    s = bold/strong
    c = small caps
    p = super
    b = sub
    */
    getInlineStyleId(attributes) {
        if (this.inlineStyleIds[attributes]) {
            return this.inlineStyleIds[attributes]
        }

        let styleProperties = ''
        if (attributes.includes('e')) {
            styleProperties += ' fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"'
        }
        if (attributes.includes('s')) {
            styleProperties += ' fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"'
        }
        if (attributes.includes('c')) {
            styleProperties += ' fo:font-variant="small-caps"'
        }
        if (attributes.includes('p')) {
            styleProperties += ' style:text-position="super 58%"'
        } else if (attributes.includes('b')) {
            styleProperties += ' style:text-position="sub 58%"'
        }
        let styleCounter = ++this.inlineStyleCounter
        this.inlineStyleIds[attributes] = styleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <style:style style:name="T${styleCounter}" style:family="text">
                <style:text-properties${styleProperties}/>
            </style:style>
        `)
        return styleCounter
    }

    checkParStyle(styleName) {
        let stylesParStyle = this.stylesXml.querySelector(`style[*|name="${styleName}"]`)
        let contentParStyle = this.contentXml.querySelector(`style[*|name="${styleName}"]`)
        if ((!stylesParStyle) && (!contentParStyle)) {
            let stylesEl = this.stylesXml.querySelector('styles')
            let displayName = styleName.split('_20_').join(' ')
            stylesEl.insertAdjacentHTML(
                'beforeEnd',
                `<style:style style:name="${styleName}" style:display-name="${displayName}" style:family="paragraph" style:parent-style-name="Standard" style:class="text" />`
            )
        }
    }

    checkGraphicStyle(styleName) {
        let stylesParStyle = this.stylesXml.querySelector(`style[*|name="${styleName}"]`)
        let contentParStyle = this.contentXml.querySelector(`style[*|name="${styleName}"]`)
        if ((!stylesParStyle) && (!contentParStyle)) {
            let stylesEl = this.stylesXml.querySelector('styles')
            stylesEl.insertAdjacentHTML(
                'beforeEnd',
                GRAPHIC_STYLES[styleName]
            )
        }

    }

    addReferenceStyle(bibInfo) {
        // The style called "Bibliography_20_1" will override any previous style
        // of the same name.
        let stylesParStyle = this.stylesXml.querySelector(`style[*|name="Bibliography_20_1"]`)
        if (stylesParStyle) {
            stylesParStyle.parentNode.removeChild(stylesParStyle)
        }
        let contentParStyle = this.contentXml.querySelector(`style[*|name="Bibliography_20_1"]`)
        if (contentParStyle) {
            contentParStyle.parentNode.removeChild(contentParStyle)
        }

        this.checkParStyle('Index')

        let lineHeight = `${0.1665*bibInfo.linespacing}in`
        let marginBottom = `${0.1667*bibInfo.entryspacing}in`
        let marginLeft = "0in", textIndent = "0in", tabStops = '<style:tab-stops/>'

        if (bibInfo.hangingindent) {
            marginLeft = "0.5in"
            textIndent = "-0.5in"
        } else if(bibInfo["second-field-align"]) {
            // We calculate 0.55em as roughly equivalent to one letter width.
            let firstFieldWidth = `${(bibInfo.maxoffset + 1)*0.55}em`
            if(bibInfo["second-field-align"] === 'margin') {
                textIndent =  `-${firstFieldWidth}`
                tabStops = '<style:tab-stops><style:tab-stop style:position="0in"/></style:tab-stops>'
            } else {
                textIndent =  `-${firstFieldWidth}`
                marginLeft =  `${firstFieldWidth}`
                tabStops = `<style:tab-stops><style:tab-stop style:position="${firstFieldWidth}"/></style:tab-stops>`
            }
        }
        let styleDef = noSpaceTmp`
            <style:style style:name="Bibliography_20_1" style:display-name="Bibliography 1" style:family="paragraph" style:parent-style-name="Index" style:class="index">
                <style:paragraph-properties fo:margin-left="${marginLeft}" fo:margin-right="0in" fo:margin-top="0in" fo:margin-bottom="${marginBottom}" loext:contextual-spacing="false" fo:text-indent="${textIndent}" style:line-height-at-least="${lineHeight}" style:auto-text-indent="false">
                    ${tabStops}
                </style:paragraph-properties>
            </style:style>`
        let stylesEl = this.stylesXml.querySelector('styles')
        stylesEl.insertAdjacentHTML('beforeEnd', styleDef)
    }

    getBulletListStyleId() {
        if (this.bulletListStyleId[0]) {
            return this.bulletListStyleId
        }
        this.bulletListStyleId[0] = ++this.listStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <text:list-style style:name="L${this.bulletListStyleId[0]}">
            </text:list-style>
        `)
        let listStyleEl = autoStylesEl.lastChild
        // ODT files seem to contain ten levels of lists (1-10)
        for(let level=1;level<11;level++) {
            listStyleEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
                <text:list-level-style-bullet text:level="${level}" text:style-name="Bullet_20_Symbols" text:bullet-char="•">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="${(level+1)*0.25}in" fo:text-indent="-0.25in" fo:margin-left="${(level+1)*0.25}in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
            `)
        }
        this.bulletListStyleId[1] = this.addListParStyle(this.bulletListStyleId[0])
        return this.bulletListStyleId
    }

    getOrderedListStyleId() {
        if (this.orderedListStyleId[0]) {
            return this.orderedListStyleId
        }
        this.orderedListStyleId[0] = ++this.listStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <text:list-style style:name="L${this.orderedListStyleId[0]}">
            </text:list-style>
        `)
        let listStyleEl = autoStylesEl.lastChild
        // ODT files seem to contain ten levels of lists (1-10)
        for(let level=1;level<11;level++) {
            listStyleEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
                <text:list-level-style-number text:level="${level}" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="${(level+1)*0.25}in" fo:text-indent="-0.25in" fo:margin-left="${(level+1)*0.25}in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
            `)
        }
        this.orderedListStyleId[1] = this.addListParStyle(this.orderedListStyleId[0])
        return this.orderedListStyleId
    }

    // Add a paragraph style for either paragraph in bullet or numeric list
    addListParStyle(listId) {
        let parStyleId = ++this.blockStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML(
            'beforeEnd',
            `<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard" style:list-style-name="L1" />`
        )
        return parStyleId
    }

}

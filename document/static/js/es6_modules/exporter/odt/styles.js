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
        this.orderedListStyleId = [false, false]
        this.bulletListStyleId = [false, false]
        this.inlineStyleCounter = 0
        this.blockStyleCounter = 0
        this.listStyleCounter = 0
    }

    init() {
        let that = this
        return this.exporter.xml.getXml("styles.xml").then(function(stylesXml){
            that.stylesXml = stylesXml
            return that.exporter.xml.getXml("content.xml")
        }).then(function(contentXml){
            that.contentXml = contentXml
            that.getStyleCounters()
            return Promise.resolve()
        })
    }

    getStyleCounters() {
        let that = this
        let styles = [].slice.call(this.contentXml.querySelectorAll('automatic-styles style'))
        styles.forEach(function(style){
            let styleNumber = parseInt(style.getAttribute('style:name').replace(/\D/g,''))
            let styleFamily = style.getAttribute('style:family')
            if (styleFamily==='text') {
                if (styleNumber>that.inlineStyleCounter) {
                    that.inlineStyleCounter = styleNumber
                }
            } else {
                if (styleNumber>that.blockStyleCounter) {
                    that.blockStyleCounter = styleNumber
                }
            }
        })
        let listStyles = [].slice.call(this.contentXml.querySelectorAll('automatic-styles list-style'))
        listStyles.forEach(function(style){
            let styleNumber = parseInt(style.getAttribute('style:name').replace(/\D/g,''))
            if (styleNumber>that.listStyleCounter) {
                that.listStyleCounter = styleNumber
            }
        })
    }

    getBoldStyleId() {
        if (this.boldStyleId) {
            return this.boldStyleId
        }
        this.boldStyleId = ++this.inlineStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <style:style style:name="T${this.boldStyleId}" style:family="text">
                <style:text-properties fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"/>
            </style:style>
        `)
        return this.boldStyleId
    }

    getItalicStyleId() {
        if (this.italicStyleId) {
            return this.italicStyleId
        }
        this.italicStyleId = ++this.inlineStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <style:style style:name="T${this.italicStyleId}" style:family="text">
                <style:text-properties fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic"/>
            </style:style>
        `)
        return this.italicStyleId
    }

    getBoldItalicStyleId() {
        if (this.boldItalicStyleId) {
            return this.boldItalicStyleId
        }
        this.boldItalicStyleId = ++this.inlineStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeEnd', noSpaceTmp`
            <style:style style:name="T${this.boldItalicStyleId}" style:family="text">
                <style:text-properties fo:font-style="italic" style:font-style-asian="italic" style:font-style-complex="italic" fo:font-weight="bold" style:font-weight-asian="bold" style:font-weight-complex="bold"/>
            </style:style>
        `)
        return this.boldItalicStyleId
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

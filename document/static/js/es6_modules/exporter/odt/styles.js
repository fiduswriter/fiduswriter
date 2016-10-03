import {noSpaceTmp} from "../../common/common"


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
            return window.Promise.resolve()
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
        autoStylesEl.insertAdjacentHTML('beforeend', noSpaceTmp`
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
        autoStylesEl.insertAdjacentHTML('beforeend', noSpaceTmp`
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
        autoStylesEl.insertAdjacentHTML('beforeend', noSpaceTmp`
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
                'beforeend',
                `<style:style style:name="${styleName}" style:display-name="${displayName}" style:family="paragraph" style:parent-style-name="Standard" style:class="text" />`
            )
        }
    }

    getBulletListStyleId() {
        if (this.bulletListStyleId[0]) {
            return this.bulletListStyleId
        }
        this.bulletListStyleId[0] = ++this.listStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeend', noSpaceTmp`
            <text:list-style style:name="L${this.bulletListStyleId[0]}">
                <text:list-level-style-bullet text:level="1" text:style-name="Bullet_20_Symbols" text:bullet-char="•">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="0.5in" fo:text-indent="-0.25in" fo:margin-left="0.5in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="2" text:style-name="Bullet_20_Symbols" text:bullet-char="◦">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="0.75in" fo:text-indent="-0.25in" fo:margin-left="0.75in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="3" text:style-name="Bullet_20_Symbols" text:bullet-char="▪">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1in" fo:text-indent="-0.25in" fo:margin-left="1in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="4" text:style-name="Bullet_20_Symbols" text:bullet-char="•">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.25in" fo:text-indent="-0.25in" fo:margin-left="1.25in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="5" text:style-name="Bullet_20_Symbols" text:bullet-char="◦">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.5in" fo:text-indent="-0.25in" fo:margin-left="1.5in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="6" text:style-name="Bullet_20_Symbols" text:bullet-char="▪">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.75in" fo:text-indent="-0.25in" fo:margin-left="1.75in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="7" text:style-name="Bullet_20_Symbols" text:bullet-char="•">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2in" fo:text-indent="-0.25in" fo:margin-left="2in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="8" text:style-name="Bullet_20_Symbols" text:bullet-char="◦">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.25in" fo:text-indent="-0.25in" fo:margin-left="2.25in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="9" text:style-name="Bullet_20_Symbols" text:bullet-char="▪">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.5in" fo:text-indent="-0.25in" fo:margin-left="2.5in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
                <text:list-level-style-bullet text:level="10" text:style-name="Bullet_20_Symbols" text:bullet-char="•">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.75in" fo:text-indent="-0.25in" fo:margin-left="2.75in" />
                    </style:list-level-properties>
                </text:list-level-style-bullet>
            </text:list-style>
        `)
        this.bulletListStyleId[1] = this.addListParStyle(this.bulletListStyleId[0])
        return this.bulletListStyleId
    }

    getOrderedListStyleId() {
        if (this.orderedListStyleId[0]) {
            return this.orderedListStyleId
        }
        this.orderedListStyleId[0] = ++this.listStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML('beforeend', noSpaceTmp`
            <text:list-style style:name="L${this.orderedListStyleId[0]}">
                <text:list-level-style-number text:level="1" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="0.5in" fo:text-indent="-0.25in" fo:margin-left="0.5in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="2" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="0.75in" fo:text-indent="-0.25in" fo:margin-left="0.75in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="3" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1in" fo:text-indent="-0.25in" fo:margin-left="1in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="4" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.25in" fo:text-indent="-0.25in" fo:margin-left="1.25in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="5" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.5in" fo:text-indent="-0.25in" fo:margin-left="1.5in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="6" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="1.75in" fo:text-indent="-0.25in" fo:margin-left="1.75in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="7" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2in" fo:text-indent="-0.25in" fo:margin-left="2in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="8" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.25in" fo:text-indent="-0.25in" fo:margin-left="2.25in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="9" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.5in" fo:text-indent="-0.25in" fo:margin-left="2.5in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
                <text:list-level-style-number text:level="10" text:style-name="Numbering_20_Symbols" style:num-suffix="." style:num-format="1">
                    <style:list-level-properties text:list-level-position-and-space-mode="label-alignment">
                        <style:list-level-label-alignment text:label-followed-by="listtab" text:list-tab-stop-position="2.75in" fo:text-indent="-0.25in" fo:margin-left="2.75in" />
                    </style:list-level-properties>
                </text:list-level-style-number>
            </text:list-style>
        `)
        this.orderedListStyleId[1] = this.addListParStyle(this.orderedListStyleId[0])
        return this.orderedListStyleId
    }

    // Add a paragraph style for either paragraph in bullet or numeric list
    addListParStyle(listId) {
        let parStyleId = ++this.blockStyleCounter
        let autoStylesEl = this.contentXml.querySelector('automatic-styles')
        autoStylesEl.insertAdjacentHTML(
            'beforeend',
            `<style:style style:name="P1" style:family="paragraph" style:parent-style-name="Standard" style:list-style-name="L1" />`
        )
        return parStyleId
    }

}

import {OdtExporterCitations} from "./citations"
import {OdtExporterImages} from "./images"
import {OdtExporterRichtext} from "./richtext"
import {fidusFnSchema} from "../../schema/footnotes"
import {noSpaceTmp} from "../../common/common"
import {descendantNodes} from "../tools/pmJSON"


const DEFAULT_STYLE_FOOTNOTE = noSpaceTmp`
    <style:style style:name="Footnote" style:family="paragraph" style:parent-style-name="Standard" style:class="extra">
        <style:paragraph-properties fo:margin-left="0.2354in" fo:margin-right="0in" fo:text-indent="-0.2354in" style:auto-text-indent="false" text:number-lines="false" text:line-number="0" />
        <style:text-properties fo:font-size="10pt" style:font-size-asian="10pt" style:font-size-complex="10pt" />
    </style:style>
    `

const DEFAULT_STYLE_FOOTNOTE_ANCHOR = noSpaceTmp`
    <style:style style:name="Footnote_20_anchor" style:display-name="Footnote anchor" style:family="text">
        <style:text-properties style:text-position="super 58%" />
    </style:style>
    `
const DEFAULT_STYLE_FOOTNOTE_SYMBOL = noSpaceTmp`
    <style:style style:name="Footnote_20_Symbol" style:display-name="Footnote Symbol" style:family="text" />
    `

const DEFAULT_STYLE_FOOTNOTE_CONFIGURATION = noSpaceTmp`
    <text:notes-configuration text:note-class="footnote" text:citation-style-name="Footnote_20_Symbol" text:citation-body-style-name="Footnote_20_anchor" style:num-format="1" text:start-value="0" text:footnotes-position="page" text:start-numbering-at="document" />
    `

export class OdtExporterFootnotes {
    constructor(exporter, pmJSON) {
        this.exporter = exporter
        this.pmJSON = pmJSON
        this.fnPmJSON = false
        this.images = false
        this.citations = false
        this.htmlFootnotes = [] // footnotes in HTML
        this.styleFilePath = 'styles.xml'
    }

    init() {
        let that = this
        this.findFootnotes()
        if (this.htmlFootnotes.length || (this.exporter.citations.citFm.citationType==='note' && this.exporter.citations.citInfos.length)) {
            this.convertFootnotes()
            this.citations = new OdtExporterCitations(this.exporter, this.exporter.bibDB, this.fnPmJSON)
            // Get the citinfos from the main body document so that they will be
            // used for calculating the bibliography as well
            let origCitInfos = this.exporter.citations.citInfos
            this.citations.formatCitations(origCitInfos)
            // Replace the main bibliography with the new one that includes both citations in main document
            // and in the footnotes.
            this.exporter.pmBib = this.citations.pmBib
            this.images = new OdtExporterImages(
                this.exporter,
                this.exporter.imageDB,
                this.fnPmJSON
            )
            return this.images.init().then(function(){
                return that.addStyles()
            })
        } else {
            // No footnotes were found.
            return window.Promise.resolve()
        }
    }

    addStyles() {
        let that = this
        return this.exporter.xml.getXml(this.styleFilePath).then(function(styleXml) {
            that.styleXml = styleXml
            that.addStyle('Footnote', DEFAULT_STYLE_FOOTNOTE)
            that.addStyle('Footnote_20_anchor', DEFAULT_STYLE_FOOTNOTE_ANCHOR)
            that.addStyle('Footnote_20_Symbol', DEFAULT_STYLE_FOOTNOTE_SYMBOL)
            that.setStyleConfig()
            return window.Promise.resolve()
        })
    }

    addStyle(styleName, xml) {
        if (!this.styleXml.querySelector(`style[*|name="${styleName}"]`)) {
            let stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeend', xml)
        }
    }

    setStyleConfig() {
        let oldFnStyleConfigEl = this.styleXml.querySelector('notes-configuration[*|note-class="footnote"]')
        if (oldFnStyleConfigEl) {
            oldFnStyleConfigEl.parentNode.removeChild(oldFnStyleConfigEl)
        }
        let stylesEl = this.styleXml.querySelector('styles')
        stylesEl.insertAdjacentHTML('beforeend', DEFAULT_STYLE_FOOTNOTE_CONFIGURATION)
    }

    findFootnotes() {
        let that = this
        descendantNodes(this.pmJSON).forEach(
            function(node) {
                if (node.type==='footnote') {
                    that.htmlFootnotes.push(node.attrs.contents)
                }
            }
        )
    }

    convertFootnotes() {
        let fnHTML = ''
        this.htmlFootnotes.forEach(function(htmlFn){
            fnHTML += `<div class='footnote-container'>${htmlFn}</div>`
        })
        let fnNode = document.createElement('div')
        fnNode.innerHTML = fnHTML
        this.fnPmJSON = fidusFnSchema.parseDOM(fnNode).toJSON()
    }

}

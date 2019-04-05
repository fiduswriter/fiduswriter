import {OdtExporterCitations} from "./citations"
import {OdtExporterImages} from "./images"
import {noSpaceTmp} from "../../common"
import {descendantNodes} from "../tools/doc_contents"


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
    constructor(exporter, docContents) {
        this.exporter = exporter
        this.docContents = docContents
        this.fnPmJSON = false
        this.images = false
        this.citations = false
        this.footnotes = []
        this.styleFilePath = 'styles.xml'
    }

    init() {
        this.findFootnotes()
        if (
            this.footnotes.length ||
            (
                this.exporter.citations.citFm.citationType==='note' &&
                this.exporter.citations.citInfos.length
            )
        ) {
            this.convertFootnotes()
            // Include the citinfos from the main document so that they will be
            // used for calculating the bibliography as well
            this.citations = new OdtExporterCitations(
                this.exporter,
                this.exporter.bibDB,
                this.exporter.citationStyles,
                this.exporter.citationLocales,
                this.fnPmJSON,
                this.exporter.citations.citInfos
            )
            this.images = new OdtExporterImages(
                this.exporter,
                this.exporter.imageDB,
                this.fnPmJSON
            )

            return this.citations.init().then(
                () => {
                    // Replace the main bibliography with the new one that includes
                    // both citations in main document and in the footnotes.
                    this.exporter.pmBib = this.citations.pmBib
                    return this.images.init()
                }
            ).then(
                () => {
                    return this.addStyles()
                }
            )
        } else {
            // No footnotes were found.
            return Promise.resolve()
        }
    }

    addStyles() {
        return this.exporter.xml.getXml(this.styleFilePath).then(
            styleXml => {
                this.styleXml = styleXml
                this.addStyle('Footnote', DEFAULT_STYLE_FOOTNOTE)
                this.addStyle('Footnote_20_anchor', DEFAULT_STYLE_FOOTNOTE_ANCHOR)
                this.addStyle('Footnote_20_Symbol', DEFAULT_STYLE_FOOTNOTE_SYMBOL)
                this.setStyleConfig()
                return Promise.resolve()
            }
        )
    }

    addStyle(styleName, xml) {
        if (!this.styleXml.querySelector(`style[*|name="${styleName}"]`)) {
            const stylesEl = this.styleXml.querySelector('styles')
            stylesEl.insertAdjacentHTML('beforeEnd', xml)
        }
    }

    setStyleConfig() {
        const oldFnStyleConfigEl = this.styleXml.querySelector('notes-configuration[*|note-class="footnote"]')
        if (oldFnStyleConfigEl) {
            oldFnStyleConfigEl.parentNode.removeChild(oldFnStyleConfigEl)
        }
        const stylesEl = this.styleXml.querySelector('styles')
        stylesEl.insertAdjacentHTML('beforeEnd', DEFAULT_STYLE_FOOTNOTE_CONFIGURATION)
    }

    findFootnotes() {
        descendantNodes(this.docContents).forEach(
            node => {
                if (node.type==='footnote') {
                    this.footnotes.push(node.attrs.footnote)
                }
            }
        )
    }

    convertFootnotes() {
        const fnContent = []
        this.footnotes.forEach(
            footnote => {
                fnContent.push({
                    type: 'footnotecontainer',
                    content: footnote
                })
            }
        )
        this.fnPmJSON = {
            type: 'doc',
            content: fnContent
        }
    }
}

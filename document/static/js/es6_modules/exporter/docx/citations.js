import {FormatCitations} from "../../citations/format"
import {docSchema} from "../../schema/document"
import {cslBibSchema} from "../../bibliography/schema/csl-bib"
import {descendantNodes} from "../tools/doc-contents"
import {noSpaceTmp} from "../../common"
import {DOMSerializer, DOMParser} from "prosemirror-model"

export class DocxExporterCitations {
    constructor(exporter, bibDB, citationStyles, citationLocales, docContents, origCitInfos = []) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.docContents = docContents
        this.origCitInfos = origCitInfos
        this.citInfos = []
        this.citationTexts = []
        this.pmCits = []
        this.citFm = false
        this.pmBib = false
        this.styleXml = false
        this.styleFilePath = 'word/styles.xml'
    }

    init() {
        return this.exporter.xml.getXml(this.styleFilePath).then(
            styleXml => {
                this.styleXml = styleXml
                return Promise.resolve()
            }
        ).then(
            () => this.formatCitations()
        )
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations() {
        if (this.origCitInfos.length) {
            // Initial citInfos are taken from a previous run to include in bibliography,
            // and they are removed before spitting out the citation entries for the given document.
            // That way the bibliography should contain information from both.
            this.citInfos = this.citInfos.concat(this.origCitInfos)
        }

        descendantNodes(this.docContents).forEach(
            node => {
                if (node.type==='citation') {
                    this.citInfos.push(JSON.parse(JSON.stringify(node.attrs)))
                }
            }
        )
        this.citFm = new FormatCitations(
            this.citInfos,
            this.exporter.doc.settings.citationstyle,
            this.bibDB,
            this.citationStyles,
            this.citationLocales
        )
        return this.citFm.init().then(
            () => {
                this.citationTexts = this.citFm.citationTexts
                if (this.origCitInfos.length) {
                    // Remove all citation texts originating from original starting citInfos
                    this.citationTexts.splice(0, this.origCitInfos.length)
                }
                this.convertCitations()
                return Promise.resolve()
            }
        )
    }

    convertCitations() {
        // There could be some formatting in the citations, so we parse them through the PM schema for final formatting.
        // We need to put the citations each in a paragraph so that it works with
        // the fiduswriter schema and so that the converter doesn't mash them together.
        let citationsHTML = ''
        this.citationTexts.forEach(ct => {
            citationsHTML += `<p>${ct[0][1]}</p>`
        })

        // We create a standard body DOM node, add the citations into it, and parse it back.
        let bodyNode = docSchema.nodeFromJSON({type:'body'})

        let serializer = DOMSerializer.fromSchema(docSchema)
        let dom = serializer.serializeNode(bodyNode)
        dom.innerHTML = citationsHTML
        this.pmCits = DOMParser.fromSchema(docSchema).parse(dom, {topNode: bodyNode}).toJSON().content

        // Now we do the same for the bibliography.
        let cslBib = this.citFm.bibliography
        if (cslBib[1].length > 0) {
            this.addReferenceStyle(cslBib[0])
            let bibNode = cslBibSchema.nodeFromJSON({type:'cslbib'})
            let cslSerializer = DOMSerializer.fromSchema(cslBibSchema)
            dom = cslSerializer.serializeNode(bibNode)
            dom.innerHTML = cslBib[1].join('')
            this.pmBib = DOMParser.fromSchema(cslBibSchema).parse(dom, {topNode: bibNode}).toJSON()
        }
    }

    addReferenceStyle(bibInfo) {
        // The style called "Bibliography1" will override any previous style
        // of the same name.
        let stylesParStyle = this.styleXml.querySelector(`style[*|styleId="Bibliography1"]`)
        if (stylesParStyle) {
            stylesParStyle.parentNode.removeChild(stylesParStyle)
        }

        let lineHeight = 240 * bibInfo.linespacing
        let marginBottom = 240 * bibInfo.entryspacing
        let marginLeft = 0, hangingIndent = 0, tabStops = ''

        if (bibInfo.hangingindent) {
            marginLeft = 720
            hangingIndent = 720
        } else if(bibInfo["second-field-align"]) {
            // We calculate 120 as roughly equivalent to one letter width.
            let firstFieldWidth = (bibInfo.maxoffset + 1) * 120
            if(bibInfo["second-field-align"] === 'margin') {
                hangingIndent =  firstFieldWidth
                tabStops = '<w:tabs><w:tab w:val="left" w:pos="0" w:leader="none"/></w:tabs>'
            } else {
                hangingIndent = firstFieldWidth
                marginLeft = firstFieldWidth
                tabStops = `<w:tabs><w:tab w:val="left" w:pos="${firstFieldWidth}" w:leader="none"/></w:tabs>`
            }
        }
        let styleDef = noSpaceTmp`
            <w:style w:type="paragraph" w:styleId="Bibliography1">
                <w:name w:val="Bibliography 1"/>
                <w:basedOn w:val="Normal"/>
                <w:qFormat/>
                <w:pPr>
                    ${tabStops}
                    <w:spacing w:lineRule="atLeast" w:line="${lineHeight}" w:before="0" w:after="${marginBottom}"/>
                    <w:ind w:left="${marginLeft}" w:hanging="${hangingIndent}"/>
                </w:pPr>
                <w:rPr></w:rPr>
            </w:style>`
        let stylesEl = this.styleXml.querySelector('styles')
        stylesEl.insertAdjacentHTML('beforeEnd', styleDef)
    }

}

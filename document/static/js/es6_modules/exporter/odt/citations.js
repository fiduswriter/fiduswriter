import {FormatCitations} from "../../citations/format"
import {docSchema} from "../../schema/document"
import {cslBibSchema} from "../../bibliography/schema/csl-bib"
import {descendantNodes} from "../tools/doc-contents"

export class OdtExporterCitations {
    constructor(exporter, bibDB, docContents, origCitInfos = []) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.docContents = docContents
        // If citInfos were found in a previous run, they are stored here
        // (for example: first citations in main document, then in footnotes)
        this.origCitInfos = origCitInfos
        this.citInfos = []
        this.citationTexts = []
        this.pmCits = []
        this.citFm = false
        this.pmBib = false
    }

    init() {
        this.formatCitations()
        return Promise.resolve()
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations() {
        let that = this

        if (this.origCitInfos.length) {
            // Initial citInfos are taken from a previous run to include in
            // bibliography, and they are removed before spitting out the
            // citation entries for the given document.
            // That way the bibliography should contain information from both.
            this.citInfos = this.citInfos.concat(this.origCitInfos)
        }

        descendantNodes(this.docContents).forEach(
            function(node){
                if (node.type==='citation') {
                    that.citInfos.push(node.attrs)
                }
            }
        )
        this.citFm = new FormatCitations(
            this.citInfos,
            this.exporter.doc.settings.citationstyle,
            this.bibDB,
            function() {
                that.citationTexts = that.citFm.citationTexts
                if (that.origCitInfos.length) {
                    // Remove all citation texts originating from original starting citInfos
                    that.citationTexts.splice(0, that.origCitInfos.length)
                }
                that.convertCitations()
            }
        )
        this.citFm.init()
    }

    convertCitations() {
        // There could be some formatting in the citations, so we parse them through the PM schema for final formatting.
        // We need to put the citations each in a paragraph so that it works with
        // the fiduswriter schema and so that the converter doesn't mash them together.
        if (this.citationTexts.length) {
            let citationsHTML = ''
            this.citationTexts.forEach(function(ct){
                citationsHTML += `<p>${ct[0][1]}</p>`
            })

            // We create a standard body DOM node, add the citations into it, and parse it back.
            let bodyNode = docSchema.nodeFromJSON({type:'body'})
            let dom = bodyNode.toDOM()
            dom.innerHTML = citationsHTML
            this.pmCits = docSchema.parseDOM(dom, {topNode: bodyNode}).toJSON().content
        } else {
            this.pmCits = []
        }

        // Now we do the same for the bibliography.
        let cslBib = this.citFm.bibliography
        if (cslBib[1].length > 0) {
            this.exporter.styles.addReferenceStyle(cslBib[0])
            let bibNode = cslBibSchema.nodeFromJSON({type:'cslbib'})
            let dom = bibNode.toDOM()
            dom.innerHTML = cslBib[1].join('')
            this.pmBib = cslBibSchema.parseDOM(dom, {topNode: bibNode}).toJSON()
        }
    }
}

import {FormatCitations} from "../../citations/format"
import {docSchema} from "../../schema/document"
import {cslBibSchema} from "../../bibliography/schema/csl-bib"
import {descendantNodes} from "../tools/doc-contents"

export class OdtExporterCitations {
    constructor(exporter, bibDB, docContents) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.docContents = docContents
        this.citInfos = []
        this.citationTexts = []
        this.pmCits = []
        this.citFm = false
        this.pmBib = false
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations(origCitInfos = []) {
        let that = this

        if (origCitInfos.length) {
            // Initial citInfos are taken from a previous run to include in bibliography,
            // and they are removed before spitting out the citation entries for the given document.
            // That way the bibliography should contain information from both.
            this.citInfos = this.citInfos.concat(origCitInfos)
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
                if (origCitInfos.length) {
                    // Remove all citation texts originating from original starting citInfos
                    that.citationTexts.splice(0, origCitInfos.length)
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
        let citationsHTML = ''
        this.citationTexts.forEach(function(ct){
            citationsHTML += `<p>${ct[0][1]}</p>`
        })

        // We create a standard body DOM node, add the citations into it, and parse it back.
        let bodyNode = docSchema.nodeFromJSON({type:'body'})
        let dom = bodyNode.toDOM()
        dom.innerHTML = citationsHTML
        this.pmCits = docSchema.parseDOM(dom, {topNode: bodyNode}).toJSON().content

        // Now we do the same for the bibliography.
        let cslBib = this.citFm.bibliography
        let bibNode = cslBibSchema.nodeFromJSON({type:'cslbib'})
        dom = bibNode.toDOM()
        dom.innerHTML = cslBib[1].map(
            // There is a space inserted, apparently at random. We'll remove it.
            cslHTML => cslHTML.replace(
                    '<div class="csl-left-margin"> ',
                    '<div class="csl-left-margin">')
            ).join('')
        this.pmBib = cslBibSchema.parseDOM(dom, {topNode: bibNode}).toJSON()
    }
}

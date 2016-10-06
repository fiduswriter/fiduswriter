import {FormatCitations} from "../../citations/format"
import {fidusSchema} from "../../schema/document"
import {descendantNodes} from "../tools/pmJSON"

export class DocxExporterCitations {
    constructor(exporter, bibDB, pmJSON) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.pmJSON = pmJSON
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

        descendantNodes(this.pmJSON).forEach(
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
            citationsHTML += '<p>'+ct[0][1]+'</p>'
        })

        // We create a standard document DOM node, add the citations
        // into the last child (the body) and parse it back.
        let dom = fidusSchema.parseDOM(document.createTextNode('')).toDOM()
        dom.lastElementChild.innerHTML = citationsHTML
        this.pmCits = fidusSchema.parseDOM(dom).lastChild.toJSON().content

        // Now we do the same for the bibliography.
        dom = fidusSchema.parseDOM(document.createTextNode('')).toDOM()
        dom.lastElementChild.innerHTML = this.citFm.bibliographyHTML
        // Remove empty bibliography header (used in web version)
        dom.lastElementChild.removeChild(dom.lastElementChild.firstElementChild)
        this.pmBib = fidusSchema.parseDOM(dom).lastChild.toJSON()
        // use the References style for the paragraphs in the bibliography
        this.pmBib.type = 'bibliography'
    }
}

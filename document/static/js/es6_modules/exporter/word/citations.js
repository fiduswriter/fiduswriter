import {FormatCitations} from "../../citations/format"
import {fidusSchema} from "../../schema/document"

export class WordExporterCitations {
    constructor(exporter, bibDB, pmDoc) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.pmDoc = pmDoc
        this.pmCits = []
        this.citInfos = []
        this.citFm = false
        this.pmBib = false
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations() {
        let that = this
        this.pmDoc.descendants(
            function(node){
                if (node.type.name==='citation') {
                    that.citInfos.push(node.attrs)
                }
            }
        )
        this.citFm = new FormatCitations(
            this.citInfos,
            this.exporter.doc.settings.citationstyle,
            this.bibDB,
            function() {
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
        this.citFm.citationTexts.forEach(function(ct){
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

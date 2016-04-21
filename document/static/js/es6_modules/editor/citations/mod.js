import {FormatCitations} from "../../citations/format"
import {UpdateScheduler} from "prosemirror/dist/ui/update"

export class ModCitations {
    constructor(editor) {
        editor.mod.citations = this
        this.editor = editor
        this.bindEvents()
    }

    bindEvents () {
        let that = this
        new UpdateScheduler(this.editor.pm, "change setDoc", () => {that.layoutCitations()})
    }

    resetCitations() {
        let citations = [].slice.call(document.querySelectorAll('#paper-editable span.citation'))
        citations.forEach(function(citation){
            citation.innerHTML = ''
        })
        this.layoutCitations()
    }

    layoutCitations() {
        if (!this.editor.bibDB) {
            // bibliography hasn't been loaded yet
            return
        }
        let emptyCitations = [].slice.call(document.querySelectorAll('#paper-editable span.citation:empty'))
        if (emptyCitations.length > 0) {
            let citationFormatter = new FormatCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.doc.settings.citationstyle,
                this.editor.bibDB.bibDB, false
            )
            document.getElementById('document-bibliography').innerHTML = citationFormatter.bibliographyHTML
            let citationsContainer = document.getElementById('citation-footnote-box-container')
            if (citationFormatter.citationType==='note') {
                // The citations have not been filled, so we do so manually.
                emptyCitations.forEach(function(emptyCitation) {
                    emptyCitation.innerHTML = '&thinsp;'
                })
                let citationsHTML = ''
                citationFormatter.citationTexts.forEach(function(citationText){
                    citationsHTML += '<div class="footnote-citation">'+citationText+'</div>'
                })
                if (citationsContainer.innerHTML !== citationsHTML) {
                    citationsContainer.innerHTML = citationsHTML
                }
            } else {
                if (citationsContainer.innerHTML !== '') {
                    citationsContainer.innerHTML = ''
                }
            }
        }

    }

}

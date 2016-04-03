import {formatCitations} from "../../citations/format"
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
        let citations = [].slice.call(document.querySelectorAll('#document-editable span.citation'))
        citations.forEach(function(citation){
            citation.innerHTML = ''
        })
        this.layoutCitations()
    }

    layoutCitations() {
        let emptyCitations = document.querySelectorAll('#document-editable span.citation:empty')
        if (emptyCitations.length > 0) {
            let bibliographyHTML = formatCitations(
                document.getElementById('document-editable'), // TODO: Should we point this to somewhere else?
                this.editor.doc.settings.citationstyle,
                window.BibDB
            )
            document.getElementById('document-bibliography').innerHTML = bibliographyHTML
        }

    }


}

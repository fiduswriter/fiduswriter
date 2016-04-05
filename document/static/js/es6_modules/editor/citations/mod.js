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
        let emptyCitations = document.querySelectorAll('#paper-editable span.citation:empty')
        if (emptyCitations.length > 0) {
            let bibliographyHTML = formatCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.doc.settings.citationstyle,
                this.editor.bibDB.bibDB
            )
            document.getElementById('document-bibliography').innerHTML = bibliographyHTML
        }

    }

}

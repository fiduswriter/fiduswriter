import {FormatCitations} from "../../citations/format"
import {UpdateScheduler} from "prosemirror/dist/ui/update"

export class ModCitations {
    constructor(editor) {
        editor.mod.citations = this
        this.editor = editor
        this.citationType = ''
        this.fnOverrideElement =  false
        this.setup()
        this.bindEvents()
    }

    setup() {
        /* Add a style to hold dynamic CSS info about footnote numbering overrides.
         * Because we need footnotes in the editor and footnotes added through
         * citations to be numbered but they aren't in the same order in the DOM,
         * we need to organize the numbering manually.
         */
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `<style type="text/css" id="footnote-numbering-override"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
        this.fnOverrideElement = document.getElementById('footnote-numbering-override')
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
        let needFootnoteLayout = false
        let emptyCitations = [].slice.call(document.querySelectorAll('#paper-editable span.citation:empty'))
        if (emptyCitations.length > 0) {
            let citationFormatter = new FormatCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.doc.settings.citationstyle,
                this.editor.bibDB.bibDB, false
            )
            if (this.citationType !== citationFormatter.citationType) {
                // The citation format has changed, so we need to relayout the footnotes as well
                needFootnoteLayout = true
            }
            this.citationType = citationFormatter.citationType

            document.getElementById('document-bibliography').innerHTML = citationFormatter.bibliographyHTML
            let citationsContainer = document.getElementById('citation-footnote-box-container')
            if (this.citationType==='note') {
                // The citations have not been filled, so we do so manually.
                emptyCitations.forEach(function(emptyCitation) {
                    emptyCitation.innerHTML = '<span class="citation-footnote-marker"></span>'
                })
                let citationsHTML = ''
                citationFormatter.citationTexts.forEach(function(citationText){
                    citationsHTML += '<div class="footnote-citation">'+citationText[0][1]+'</div>'
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
        this.footnoteNumberOverride()
        if (needFootnoteLayout) {
            this.editor.mod.footnotes.layout.layoutFootnotes()
        }
    }

    footnoteNumberOverride() {
        /* Find the order of footnotes and citations in the document and
         * write CSS to number all the citation footnotes and other footnotes
         * correspondingly. Update footnote-numbering-override correspondingly.
         */

         let outputCSS = ''

         if (this.citationType === 'note') {
             let editorFootnoteCounter = 1,
             citationFootnoteCounter = 1,
             footnoteCounter = 1

             this.editor.pm.doc.descendants(function(node){
                 if (node.isInline && (node.type.name==='footnote' || node.type.name==='citation')) {
                     if (node.type.name==='footnote') {
                         outputCSS += '#footnote-box-container .footnote-container:nth-of-type('+editorFootnoteCounter+') > *:first-child::before {content: "' + footnoteCounter + ' ";}\n'
                         editorFootnoteCounter++
                     } else {
                         outputCSS += '.footnote-citation:nth-of-type('+citationFootnoteCounter+')::before {content: "' + footnoteCounter + ' ";}\n'
                         citationFootnoteCounter++
                     }
                     footnoteCounter++
                 }
             })


         }

        if (this.fnOverrideElement.innerHTML !== outputCSS) {
            this.fnOverrideElement.innerHTML = outputCSS
        }

    }

}

import {RenderCitations} from "../../citations/render"

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
        let that = this, pm = this.editor.pm
        pm.updateScheduler([pm.on.flush], () => {that.layoutCitations()})
        let fnPm = this.editor.mod.footnotes.fnPm
        fnPm.updateScheduler([fnPm.on.flush], () => {that.layoutCitations()})
    }

    resetCitations() {
        let citations = [].slice.call(document.querySelectorAll('#paper-editable span.citation'))
        citations.forEach(function(citation){
            citation.innerHTML = ''
        })
        if (document.getElementById('document-bibliography').innerHTML !== '') {
            document.getElementById('document-bibliography').innerHTML = ''
        }
        this.layoutCitations()
    }

    layoutCitations() {
        let that = this
        if (!this.editor.bibDB) {
            // bibliography hasn't been loaded yet
            return
        }
        this.emptyCitations = [].slice.call(document.querySelectorAll('#paper-editable span.citation:empty'))
        if (this.emptyCitations.length > 0) {
            this.citRenderer = new RenderCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.doc.settings.citationstyle,
                this.editor.bibDB,
                false,
                function() {
                    that.layoutCitationsTwo()
                }
            )
            this.citRenderer.init()

        } else {
            // TODO: find out if this is actually needed or if it onl;y applies when this.emptyCitations.length > 0
            this.footnoteNumberOverride()
        }

    }

    layoutCitationsTwo() {
        let citRenderer = this.citRenderer
        let needFootnoteLayout = false
        if (this.citationType !== citRenderer.fm.citationType) {
            // The citation format has changed, so we need to relayout the footnotes as well
            needFootnoteLayout = true
        }
        this.citationType = citRenderer.fm.citationType

        document.getElementById('document-bibliography').innerHTML = citRenderer.fm.bibliographyHTML
        let citationsContainer = document.getElementById('citation-footnote-box-container')
        if (this.citationType==='note') {
            // Find all the citations in the main body text (not footnotes)
            let emptyBodyCitations = [].slice.call(document.querySelectorAll('#document-editable span.citation:empty'))

            let citationsHTML = ''
            // The citations have not been filled, so we do so manually.
            emptyBodyCitations.forEach(function(emptyCitation, index) {
                emptyCitation.innerHTML = '<span class="citation-footnote-marker"></span>'
                let citationText = citRenderer.fm.citationTexts[index][0][1]
                citationsHTML += '<div class="footnote-citation">'+citationText+'</div>'
            })
            if (citationsContainer.innerHTML !== citationsHTML) {
                citationsContainer.innerHTML = citationsHTML
            }
            // Iterate over remainign citations (these must be in footnotes) and lay them out directly
            for(let index=emptyBodyCitations.length; index < this.emptyCitations.length; index++) {
                let citationText = citRenderer.fm.citationTexts[index][0][1]
                let emptyCitation = this.emptyCitations[index]
                emptyCitation.innerHTML = citationText
            }



        } else {
            if (citationsContainer.innerHTML !== '') {
                citationsContainer.innerHTML = ''
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

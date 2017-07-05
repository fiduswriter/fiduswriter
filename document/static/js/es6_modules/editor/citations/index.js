import {RenderCitations} from "../../citations/render"

export class ModCitations {
    constructor(editor) {
        editor.mod.citations = this
        this.editor = editor
        this.citationType = ''
        this.fnOverrideElement =  false
        this.setup()
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

    resetCitations() {
        let citations = [].slice.call(document.querySelectorAll('#paper-editable span.citation'))
        citations.forEach(function(citation){
            citation.innerHTML = ''
        })
        if (document.querySelector('.article-bibliography').innerHTML !== '') {
            document.querySelector('.article-bibliography').innerHTML = ''
        }
        let citationsContainer = document.getElementById('citation-footnote-box-container')
        if (citationsContainer.innerHTML !== '') {
            citationsContainer.innerHTML = ''
        }
        this.layoutCitations()
    }

    layoutCitations() {
        if (!this.editor.bibDB) {
            // bibliography hasn't been loaded yet
            return
        }
        this.emptyCitations = [].slice.call(document.querySelectorAll('#paper-editable span.citation:empty'))
        if (this.emptyCitations.length > 0) {
            this.citRenderer = new RenderCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.view.state.doc.firstChild.attrs.citationstyle,
                this.editor.bibDB,
                false
            )
            this.citRenderer.init().then(
                () => this.layoutCitationsTwo()
            )

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
        // Add the rendered html and css of the bibliography to the DOM.
        document.querySelector('.article-bibliography').innerHTML = citRenderer.fm.bibHTML
        let styleEl = document.querySelector('.article-bibliography-style')
        if (!styleEl) {
            document.head.insertAdjacentHTML('beforeend','<style type="text/css" class="article-bibliography-style"></style>')
            styleEl = document.querySelector('.article-bibliography-style')
        }
        let css = citRenderer.fm.bibCSS
        if (styleEl.innerHTML !== css) {
            styleEl.innerHTML = css
        }

        let citationsContainer = document.getElementById('citation-footnote-box-container')
        if (this.citationType==='note') {

            // Check if there is an empty citation in the main body text (not footnotes)
            let emptyBodyCitation = document.querySelector('#document-editable span.citation:empty')

            if (emptyBodyCitation) {
                // Find all the citations in the main body text (not footnotes)
                let citationNodes = [].slice.call(document.querySelectorAll('#document-editable span.citation'))

                let citationsHTML = ''
                // The citations have not been filled, so we do so manually.
                citationNodes.forEach(function(citationNode, index) {
                    citationNode.innerHTML = '<span class="citation-footnote-marker"></span>'
                    let citationText = citRenderer.fm.citationTexts[index][0][1]
                    citationsHTML += '<div class="footnote-citation">'+citationText+'</div>'
                })

                if (citationsContainer.innerHTML !== citationsHTML) {
                    citationsContainer.innerHTML = citationsHTML
                }
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

             this.editor.view.state.doc.descendants(function(node){
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

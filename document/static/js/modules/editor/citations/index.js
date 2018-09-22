import {RenderCitations} from "../../citations/render"
import {BibEntryForm} from "../../bibliography/form"
import {Dialog, cancelPromise} from "../../common"

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
        let citations = document.querySelectorAll('#paper-editable span.citation')
        citations.forEach(citation => citation.innerHTML = '')
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
        if (!this.editor.mod.db.bibDB.db) {
            // bibliography hasn't been loaded yet
            return
        }
        let emptyCitations = document.querySelectorAll('#paper-editable span.citation:empty')
        if (emptyCitations.length) {
            this.citRenderer = new RenderCitations(
                document.getElementById('paper-editable'), // TODO: Should we point this to somewhere else?
                this.editor.view.state.doc.firstChild.attrs.citationstyle,
                this.editor.mod.db.bibDB,
                this.editor.mod.styles.citationStyles,
                this.editor.mod.styles.citationLocales
            )
            this.citRenderer.init().then(
                () => this.layoutCitationsTwo()
            )

        }

    }

    bindBibliographyClicks() {
        document.querySelectorAll('div.csl-entry').forEach((el, index) => {
            el.addEventListener('click', event => {
                let eID = parseInt(this.citRenderer.fm.bibliography[0].entry_ids[index][0])
                this.checkTrackingDialog().then(
                    () => {
                        let form = new BibEntryForm(this.editor.mod.db.bibDB, eID)
                        form.init()
                    }
                )
            })
        })
    }

    checkTrackingDialog() {
        if (!this.editor.view.state.doc.firstChild.attrs.tracked) {
            return Promise.resolve()
        }
        let buttons = [],
            dialog,
            promise = new Promise((resolve, reject) => {
                buttons.push({
                    type: 'cancel',
                    click: () => {
                        dialog.close()
                        resolve(cancelPromise())
                    }
                })
                buttons.push({
                    type: 'ok',
                    click: () => {
                        dialog.close()
                        resolve()
                    }
                })
            })

        dialog = new Dialog({
            title: gettext('No tracking'),
            body: gettext('Changes to citation sources are not being tracked!'),
            icon: 'exclamation-triangle',
            width: 400,
            height: 100,
            buttons
        })
        dialog.open()
        return promise
    }

    layoutCitationsTwo() {
        let citRenderer = this.citRenderer,
            needFootnoteLayout = false
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
        if (this.editor.docInfo.access_rights === 'write') {
            this.bindBibliographyClicks()
            css += `
                div.csl-entry {
                    cursor: pointer;
                }
                div.csl-entry:hover {
                    background-color: grey;
                }`
        }
        if (styleEl.innerHTML !== css) {
            styleEl.innerHTML = css
        }

        let citationsContainer = document.getElementById('citation-footnote-box-container')
        if (this.citationType==='note') {

            // Check if there is an empty citation in the main body text (not footnotes)
            let emptyBodyCitation = document.querySelector('#document-editable span.citation:empty')

            if (emptyBodyCitation) {
                // Find all the citations in the main body text (not footnotes)
                let citationNodes = document.querySelectorAll('#document-editable span.citation'),
                    citations = []

                citRenderer.fm.citationTexts.forEach(citText => {
                    citText.forEach(entry => {
                        let index = entry[0],
                            citationText =
                                `<div class="footnote-citation">${entry[1]}</div>`
                        citations[index] = citationText
                    })
                })

                let citationsHTML = citations.join('')
                if (citationsContainer.innerHTML !== citationsHTML) {
                    citationsContainer.innerHTML = citationsHTML
                }
                // The citations have not been filled, so we do so manually.
                citationNodes.forEach(citationNode => citationNode.innerHTML = '<span class="citation-footnote-marker"></span>')
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

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
        const styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `<style type="text/css" id="footnote-numbering-override"></style>`
        while (styleContainers.firstElementChild) {
            document.body.appendChild(styleContainers.firstElementChild)
        }
        this.fnOverrideElement = document.getElementById('footnote-numbering-override')
    }

    resetCitations() {
        const citations = document.querySelectorAll('#paper-editable span.citation')
        citations.forEach(citation => citation.innerHTML = '')
        if (document.querySelector('.article-bibliography').innerHTML !== '') {
            document.querySelector('.article-bibliography').innerHTML = ''
        }
        const citationsContainer = document.getElementById('citation-footnote-box-container')
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
        const emptyCitations = document.querySelectorAll('#paper-editable span.citation:empty')
        if (emptyCitations.length) {
            this.citRenderer = new RenderCitations(
                document.getElementById('paper-editable'),
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
                const eID = parseInt(this.citRenderer.fm.bibliography[0].entry_ids[index][0])
                this.checkTrackingDialog().then(
                    () => {
                        const form = new BibEntryForm(this.editor.mod.db.bibDB, eID)
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
        const buttons = [],
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

        const dialog = new Dialog({
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
        const citRenderer = this.citRenderer
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
            document.body.insertAdjacentHTML('beforeend','<style type="text/css" class="article-bibliography-style"></style>')
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

        const citationsContainer = document.getElementById('citation-footnote-box-container')
        if (this.citationType==='note') {

            // Check if there is an empty citation in the main body text (not footnotes)
            const emptyBodyCitation = document.querySelector('#document-editable span.citation:empty')

            if (emptyBodyCitation) {
                // Find all the citations in the main body text (not footnotes)
                const citationNodes = document.querySelectorAll('#document-editable span.citation'),
                    citationsHTML = citRenderer.fm.citationTexts.map(
                        citText => `<div class="footnote-citation">${citText}</div>`
                    ).join('')
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

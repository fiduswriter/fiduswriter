import {DOMSerializer} from "prosemirror-model"

import {BaseDOMExporter} from "../tools/dom_export"
import {RenderCitations} from "../../citations/render"
import {docSchema} from "../../schema/document"

export class BaseHTMLExporter extends BaseDOMExporter {
    joinDocumentParts() {
        let schema = docSchema
        schema.cached.imageDB = this.imageDB
        let serializer = DOMSerializer.fromSchema(schema)
        this.contents = serializer.serializeNode(schema.nodeFromJSON(this.doc.contents))

        // Remove hidden parts
        let hiddenEls = Array.from(this.contents.querySelectorAll('[data-hidden=true]'))
        hiddenEls.forEach(hiddenEl => {
            hiddenEl.parentElement.removeChild(hiddenEl)
        })

        let citRenderer = new RenderCitations(
            this.contents,
            this.doc.settings.citationstyle,
            this.bibDB,
            this.citationStyles,
            this.citationLocales,
            true
        )
        return citRenderer.init().then(
            () => {
                this.addBibliographyHTML(citRenderer.fm.bibHTML)
                this.contents = this.cleanHTML(this.contents, citRenderer.fm.citationType)
                return Promise.resolve()
            }
        )
    }

    addBibliographyHTML(bibliographyHTML) {
        if (bibliographyHTML.length > 0) {
            let tempNode = document.createElement('div')
            tempNode.innerHTML = bibliographyHTML
            while (tempNode.firstChild) {
                this.contents.appendChild(tempNode.firstChild)
            }
        }
    }

    addFigureNumbers(htmlEl) {

        htmlEl.querySelectorAll('figcaption .figure-cat-figure').forEach(
            (el, index) => {
                el.innerHTML += ' ' + (index + 1) + ': '
            }
        )

        htmlEl.querySelectorAll('figcaption .figure-cat-photo').forEach(
            (el, index) => {
                el.innerHTML += ' ' + (index + 1) + ': '
            }
        )

        htmlEl.querySelectorAll('figcaption .figure-cat-table').forEach(
            (el, index) => {
                el.innerHTML += ' ' + (index + 1) + ': '
            }
        )
        return htmlEl

    }
    replaceImgSrc(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>")
        return htmlString
    }
}

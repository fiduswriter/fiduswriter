import {BaseDOMExporter} from "../tools/dom-export"
import {RenderCitations} from "../../citations/render"
import {docSchema} from "../../schema/document"
import {DOMSerializer} from "prosemirror-model"

export class BaseHTMLExporter extends BaseDOMExporter {
    joinDocumentParts() {
        let serializer = DOMSerializer.fromSchema(docSchema)
        this.contents = serializer.serializeNode(docSchema.nodeFromJSON(this.doc.contents))

        // Remove hidden parts
        let hiddenEls = [].slice.call(this.contents.querySelectorAll('[data-hidden=true]'))
        hiddenEls.forEach(hiddenEl => {
            hiddenEl.parentElement.removeChild(hiddenEl)
        })

        let citRenderer = new RenderCitations(
            this.contents,
            this.doc.settings.citationstyle,
            this.bibDB,
            true
        )
        return citRenderer.init().then(
            () => {
                this.addBibliographyHTML(citRenderer.fm.bibHTML)
                this.contents = this.cleanHTML(this.contents)
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

    addFigureNumbers(htmlCode) {

        jQuery(htmlCode).find('figcaption .figure-cat-figure').each(
            function(index) {
                this.innerHTML += ' ' + (index + 1) + ': '
            })

        jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })

        jQuery(htmlCode).find('figcaption .figure-cat-table').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })
        return htmlCode

    }
    replaceImgSrc(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>")
        return htmlString
    }
}

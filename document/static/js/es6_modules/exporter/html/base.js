import {obj2Node} from "../tools/json"
import {BaseDOMExporter} from "../tools/dom-export"
import {RenderCitations} from "../../citations/render"

export class BaseHTMLExporter extends BaseDOMExporter {
    joinDocumentParts(callback) {

        let that = this

        this.contents = document.createElement('div')
        if (this.doc.contents) {
            let tempNode = obj2Node(this.doc.contents)
            while (tempNode.firstChild) {
                this.contents.appendChild(tempNode.firstChild)
            }
        }

        if (this.doc.settings['metadata-keywords'] && this.doc.metadata.keywords) {
            let tempNode = obj2Node(this.doc.metadata.keywords)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'keywords'
                this.contents.insertBefore(tempNode, this.contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-authors'] && this.doc.metadata.authors) {
            let tempNode = obj2Node(this.doc.metadata.authors)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'authors'
                this.contents.insertBefore(tempNode, this.contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-abstract'] && this.doc.metadata.abstract) {
            let tempNode = obj2Node(this.doc.metadata.abstract)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'abstract'
                this.contents.insertBefore(tempNode, this.contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-subtitle'] && this.doc.metadata.subtitle) {
            let tempNode = obj2Node(this.doc.metadata.subtitle)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'subtitle'
                this.contents.insertBefore(tempNode, this.contents.firstChild)
            }
        }

        if (this.doc.title) {
            let tempNode = document.createElement('h1')
            tempNode.classList.add('title')
            tempNode.textContent = this.doc.title
            this.contents.insertBefore(tempNode, this.contents.firstChild)
        }

        let citRenderer = new RenderCitations(
            this.contents,
            this.doc.settings.citationstyle,
            this.bibDB,
            true,
            function(){
                that.addBibliographyHTML(citRenderer.fm.bibliographyHTML)
                that.contents = that.cleanHTML(that.contents)
                callback()
            })
        citRenderer.init()
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

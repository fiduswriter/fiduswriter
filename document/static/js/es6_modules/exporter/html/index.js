import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {zipFileCreator} from "../tools/zip"
import {htmlExportTemplate} from "./templates"
import {BibliographyDB} from "../../bibliography/database"
import {BaseExporter} from "./base"
import {obj2Node} from "../tools/json"
import {RenderCitations} from "../../citations/render"
import {addAlert} from "../../common/common"
import {katexRender} from "../../katex/katex"

export class BaseHTMLExporter extends BaseExporter {
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

export class HTMLExporter extends BaseHTMLExporter{
    constructor(doc, bibDB) {
        super()
        let that = this
        this.doc = doc
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
            this.bibDB.getDB(function() {
                that.exportOne()
            })
        }
    }

    exportOne() {
        let that = this
        addAlert('info', this.doc.title + ': ' + gettext(
            'HTML export has been initiated.'))

        this.joinDocumentParts(function(){
            that.exportTwo()
        })

    }

    exportTwo() {

        let styleSheets = [], math = false

        let title = this.doc.title

        let contents = this.contents

        let equations = contents.querySelectorAll('.equation')

        let figureEquations = contents.querySelectorAll('.figure-equation')

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true
            styleSheets.push({filename: 'katex.min.css'})
        }

        for (let i = 0; i < equations.length; i++) {
            let node = equations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {throwOnError: false})
        }
        for (let i = 0; i < figureEquations.length; i++) {
            let node = figureEquations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                displayMode: true,
                throwOnError: false
            })
        }

        let includeZips = []

        let httpOutputList = findImages(contents)

        contents = this.addFigureNumbers(contents)

        let contentsCode = this.replaceImgSrc(contents.innerHTML)

        let htmlCode = htmlExportTemplate({
            part: false,
            title,
            metadata: this.doc.metadata,
            settings: this.doc.settings,
            styleSheets,
            contents: contentsCode
        })

        let outputList = [{
            filename: 'document.html',
            contents: htmlCode
        }]

        for (let i = 0; i < styleSheets.length; i++) {
            let styleSheet = styleSheets[i]
            if (styleSheet.contents) {
                outputList.push(styleSheet)
            }
        }

        if (math) {
            includeZips.push({
                'directory': '',
                'url': staticUrl + 'zip/katex-style.zip',
            })
        }
        zipFileCreator(outputList, httpOutputList, createSlug(
                title) +
            '.html.zip', false, includeZips)
    }

}

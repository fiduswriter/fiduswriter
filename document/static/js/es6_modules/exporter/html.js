import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {htmlExportTemplate} from "./html-templates"
import {BibliographyDB} from "../bibliography/database"
import {BaseExporter} from "./base"
import {obj2Node} from "./json"
import {FormatCitations} from "../citations/format"
import {addAlert} from "../common/common"
import {katexRender} from "../katex/katex"

export class BaseHTMLExporter extends BaseExporter{
    joinDocumentParts() {
        let contents = document.createElement('div')
        if (this.doc.contents) {
            let tempNode = obj2Node(this.doc.contents)
            while (tempNode.firstChild) {
                contents.appendChild(tempNode.firstChild)
            }
        }

        if (this.doc.settings['metadata-keywords'] && this.doc.metadata.keywords) {
            let tempNode = obj2Node(this.doc.metadata.keywords)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'keywords'
                contents.insertBefore(tempNode, contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-authors'] && this.doc.metadata.authors) {
            let tempNode = obj2Node(this.doc.metadata.authors)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'authors'
                contents.insertBefore(tempNode, contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-abstract'] && this.doc.metadata.abstract) {
            let tempNode = obj2Node(this.doc.metadata.abstract)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'abstract'
                contents.insertBefore(tempNode, contents.firstChild)
            }
        }

        if (this.doc.settings['metadata-subtitle'] && this.doc.metadata.subtitle) {
            let tempNode = obj2Node(this.doc.metadata.subtitle)
            if (tempNode.textContent.length > 0) {
                tempNode.id = 'subtitle'
                contents.insertBefore(tempNode, contents.firstChild)
            }
        }

        if (this.doc.title) {
            let tempNode = document.createElement('h1')
            tempNode.classList.add('title')
            tempNode.textContent = this.doc.title
            contents.insertBefore(tempNode, contents.firstChild)
        }

        let citationFormatter = new FormatCitations(contents,
            this.doc.settings.citationstyle,
            this.bibDB)

        let bibliographyHTML = citationFormatter.bibliographyHTML

        if (bibliographyHTML.length > 0) {
            let tempNode = document.createElement('div')
            tempNode.innerHTML = bibliographyHTML
            while (tempNode.firstChild) {
                contents.appendChild(tempNode.firstChild)
            }
        }

        contents = this.cleanHTML(contents)
        return contents
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
            let bibGetter = new BibliographyDB(doc.owner.id, false, false, false)
            bibGetter.getBibDB(function() {
                that.bibDB = bibGetter.bibDB
                that.exportOne()
            })
        }
    }

    exportOne() {
        let styleSheets = [], math = false

        let title = this.doc.title

        addAlert('info', title + ': ' + gettext(
            'HTML export has been initiated.'))

        let contents = this.joinDocumentParts()

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

import {obj2Node, node2Obj} from "../tools/json"
import {BibliographyDB} from "../../bibliography/database"
import {createSlug} from "../tools/file"
import {findImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {opfTemplate, containerTemplate, ncxTemplate, ncxItemTemplate, navTemplate,
  navItemTemplate, xhtmlTemplate} from "./templates"
import {katexOpfIncludes} from "../../katex/opf-includes"
import {addAlert} from "../../common"
import {katexRender} from "../../katex"
import {BaseEpubExporter} from "./base"
import {docSchema} from "../../schema/document"
import download from "downloadjs"
import {DOMSerializer} from "prosemirror-model"


export class EpubExporter extends BaseEpubExporter {

    constructor(doc, bibDB, citationStyles, citationLocales) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id)
            this.bibDB.getDB().then(() => {
                this.exportOne()
            })
        }
    }

    exportOne() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'Epub export has been initiated.'))


        this.joinDocumentParts().then(() => this.exportTwo())
    }

    exportTwo() {
        let styleSheets = [] //TODO: fill style sheets with something meaningful.
        let title = this.doc.title

        let contents = this.contents

        contents = this.addFigureNumbers(contents)

        let images = findImages(contents)

        let contentsBody = document.createElement('body')

        while (contents.firstChild) {
            contentsBody.appendChild(contents.firstChild)
        }

        let equations = contentsBody.querySelectorAll('.equation')

        let figureEquations = contentsBody.querySelectorAll('.figure-equation')

        let math = false

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true
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

        // Make links to all H1-3 and create a TOC list of them
        let contentItems = this.orderLinks(this.setLinks(
            contentsBody))

        let contentsBodyEpubPrepared = this.styleEpubFootnotes(
            contentsBody)

        let xhtmlCode = xhtmlTemplate({
            part: false,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title,
            styleSheets,
            math,
            body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
        })

        xhtmlCode = this.replaceImgSrc(xhtmlCode)

        let containerCode = containerTemplate({})

        let timestamp = this.getTimestamp()

        let authors = [this.doc.owner.name]
        let serializer = DOMSerializer.fromSchema(docSchema)
        let docContents = serializer.serializeNode(this.doc.contents)
        // Remove hidden parts
        let hiddenEls = [].slice.call(docContents.querySelectorAll('[data-hidden=true]'))
        hiddenEls.forEach(hiddenEl => hiddenEl.parentElement.removeChild(hiddenEl))

        let authorsEl = docContents.querySelector('.article-authors')
        if (authorsEl && authorsEl.textContent.length > 0) {
            authors = jQuery.map(authorsEl.textContent.split(","), jQuery.trim)
        }

        let keywords = []
        let keywordsEl = docContents.querySelector('.article-keywords')
        if (keywordsEl && keywordsEl.textContent.length > 0) {
            keywords = jQuery.map(keywordsEl.textContent.split(","), jQuery.trim)
        }


        let opfCode = opfTemplate({
            language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
            title,
            authors,
            keywords,
            idType: 'fidus',
            id: this.doc.id,
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets,
            math,
            images,
            katexOpfIncludes
        })

        let ncxCode = ncxTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title,
            idType: 'fidus',
            id: this.doc.id,
            contentItems,
            templates: {ncxTemplate, ncxItemTemplate}
        })

        let navCode = navTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            contentItems,
            templates: {navTemplate, navItemTemplate}
        })

        let outputList = [{
            filename: 'META-INF/container.xml',
            contents: containerCode
        }, {
            filename: 'EPUB/document.opf',
            contents: opfCode
        }, {
            filename: 'EPUB/document.ncx',
            contents: ncxCode
        }, {
            filename: 'EPUB/document-nav.xhtml',
            contents: navCode
        }, {
            filename: 'EPUB/document.xhtml',
            contents: xhtmlCode
        }]


        for (let i = 0; i < styleSheets.length; i++) {
            let styleSheet = styleSheets[i]
            outputList.push({
                filename: 'EPUB/' + styleSheet.filename,
                contents: styleSheet.contents
            })
        }

        let httpOutputList = []
        for (let i = 0; i < images.length; i++) {
            httpOutputList.push({
                filename: 'EPUB/' + images[i].filename,
                url: images[i].url
            })
        }
        let includeZips = []
        if (math) {
            includeZips.push({
                'directory': 'EPUB',
                'url': window.staticUrl + 'zip/katex-style.zip'
            })
        }
        let zipper = new ZipFileCreator(
            outputList,
            httpOutputList,
            includeZips,
            'application/epub+zip'
        )

        zipper.init().then(
            blob => download(blob, createSlug(title) + '.epub', 'application/epub+zip')
        )

    }
}

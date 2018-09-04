import download from "downloadjs"
import {DOMSerializer} from "prosemirror-model"
import katex from "katex"

import {obj2Node, node2Obj} from "../tools/json"
import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {opfTemplate, containerTemplate, ncxTemplate, ncxItemTemplate, navTemplate, navItemTemplate, xhtmlTemplate} from "./templates"
import {addAlert} from "../../common"
import {BaseEpubExporter} from "./base"
import {docSchema} from "../../schema/document"


export class EpubExporter extends BaseEpubExporter {

    constructor(doc, bibDB, imageDB, citationStyles, citationLocales) {
        super()
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.shortLang = this.doc.settings.language.split('-')[0]
        this.lang = this.doc.settings.language
    }

    init() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'Epub export has been initiated.'))


        this.joinDocumentParts().then(() => this.exportTwo())
    }

    exportTwo() {
        let styleSheets = [] //TODO: fill style sheets with something meaningful.
        let title = this.doc.title

        let contents = this.contents

        contents = this.addFigureNumbers(contents)

        let images = modifyImages(contents)

        let contentsBody = document.createElement('body')

        while (contents.firstChild) {
            contentsBody.appendChild(contents.firstChild)
        }

        const equations = contentsBody.querySelectorAll('.equation, .figure-equation')

        const math = equations.length ? true : false

        // Make links to all H1-3 and create a TOC list of them
        let contentItems = this.orderLinks(this.setLinks(
            contentsBody))

        let contentsBodyEpubPrepared = this.styleEpubFootnotes(
            contentsBody)

        let xhtmlCode = xhtmlTemplate({
            part: false,
            shortLang: this.shortLang,
            title,
            styleSheets,
            math,
            body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
        })

        xhtmlCode = this.replaceImgSrc(xhtmlCode)

        let containerCode = containerTemplate({})

        let timestamp = this.getTimestamp()

        let schema = docSchema
        schema.cached.imageDB = this.imageDB
        let serializer = DOMSerializer.fromSchema(schema)
        let docContents = serializer.serializeNode(schema.nodeFromJSON(this.doc.contents))

        // Remove hidden parts
        let hiddenEls = docContents.querySelectorAll('[data-hidden=true]')
        hiddenEls.forEach(hiddenEl => hiddenEl.parentElement.removeChild(hiddenEl))

        let authors = Array.from(docContents.querySelectorAll('.article-authors .author')).map(
            authorEl => authorEl.textContent
        )

        let keywords = Array.from(docContents.querySelectorAll('.article-keywords .keyword')).map(
            keywordEl => keywordEl.textContent
        )

        let opfCode = opfTemplate({
            language: this.lang,
            title,
            authors,
            keywords,
            idType: 'fidus',
            id: this.doc.id,
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets,
            math,
            images
        })

        let ncxCode = ncxTemplate({
            shortLang: this.shortLang,
            title,
            idType: 'fidus',
            id: this.doc.id,
            contentItems
        })

        let navCode = navTemplate({
            shortLang: this.shortLang,
            contentItems
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
                'url': `${$StaticUrls.base$}zip/katex_style.zip?v=${$StaticUrls.transpile.version$}`
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

import {katexRender} from "../../katex/katex"

import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "./tools"
import {htmlBookExportTemplate, htmlBookIndexTemplate, htmlBookIndexItemTemplate} from "./html-templates"
import {obj2Node} from "../../exporter/json"
import {BaseEpubExporter} from "../../exporter/epub"
import {createSlug, findImages} from "../../exporter/tools"
import {zipFileCreator} from "../../exporter/zip"
import {RenderCitations} from "../../citations/render"


export class HTMLBookExporter extends BaseEpubExporter { // extension is correct. Neds orderLinks/setLinks methods from base epub exporter.
    constructor(book, user, docList) {
        super()
        let that = this
        this.book = book
        this.user = user
        this.docList = docList
        getMissingChapterData(book, docList, function () {
            getImageAndBibDB(book, docList, function (imageDB,
                bibDB) {
                that.bibDB = bibDB
                that.imageDB = imageDB
                that.exportOne()
            })
        })
    }

    exportOne() {
        let math = false,
            styleSheets = [],
            chapters = []


        this.book.chapters = _.sortBy(this.book.chapters, function (chapter) {
            return chapter.number
        })

        for (let i = 0; i < this.book.chapters.length; i++) {

            let aDocument = _.findWhere(this.docList, {
                id: this.book.chapters[i].text
            })

            let contents = obj2Node(aDocument.contents)

            let citRenderer = new RenderCitations(contents,
                this.book.settings.citationstyle,
                this.bibDB)
            citRenderer.init()

            if (citRenderer.fm.bibliographyHTML.length > 0) {
                contents.innerHTML += citRenderer.fm.bibliographyHTML
            }

            let equations = contents.querySelectorAll('.equation')

            let figureEquations = contents.querySelectorAll('.figure-equation')

            if (equations.length > 0 || figureEquations.length > 0) {
                math = true
            }

            for (let j = 0; j < equations.length; j++) {
                let node = equations[j]
                let formula = node.getAttribute('data-equation')
                katexRender(formula, node, {throwOnError: false})
            }
            for (let j = 0; j < figureEquations.length; j++) {
                let node = figureEquations[j]
                let formula = node.getAttribute('data-equation')
                katexRender(formula, node, {
                    displayMode: true,
                    throwOnError: false
                })
            }

            chapters.push({document:aDocument,contents:contents})
        }

        let outputList = [],
            images = [],
            contentItems = [],
            includeZips = []

        for (let i=0; i < chapters.length; i++) {

            let contents = chapters[i].contents

            let aDocument = chapters[i].document

            let title = aDocument.title

            images = images.concat(findImages(contents))

            contents = this.cleanHTML(contents)

            if (this.book.chapters[i].part && this.book.chapters[i].part !== '') {
                contentItems.push({
                    link: 'document-' + this.book.chapters[i].number + '.html',
                    title: this.book.chapters[i].part,
                    docNum: this.book.chapters[i].number,
                    id: 0,
                    level: -1,
                    subItems: [],
                })
            }

            contentItems.push({
                link: 'document-' + this.book.chapters[i].number + '.html',
                title: title,
                docNum: this.book.chapters[i].number,
                id: 0,
                level: 0,
                subItems: [],
            })

            // Make links to all H1-3 and create a TOC list of them
            contentItems = contentItems.concat(this.setLinks(contents,
                this.book.chapters[i].number))


            let contentsCode = this.replaceImgSrc(contents.innerHTML)

            let htmlCode = htmlBookExportTemplate({
                part: this.book.chapters[i].part,
                title,
                metadata: aDocument.metadata,
                settings: aDocument.settings,
                styleSheets,
                contents: contentsCode,
                math,
                obj2Node
            })

            outputList.push({
                filename: 'document-' + this.book.chapters[i].number + '.html',
                contents: htmlCode
            })

        }

        contentItems = this.orderLinks(contentItems)

        outputList = outputList.concat(styleSheets)

        outputList.push({
            filename: 'index.html',
            contents: htmlBookIndexTemplate({
                contentItems,
                aBook: this.book,
                creator: this.user.name,
                language: gettext('English'), //TODO: specify a book language rather than using the current users UI language
                templates: {htmlBookIndexItemTemplate}
            })
        })

        if (math) {
            includeZips.push({
                'directory': '',
                'url': window.staticUrl + 'zip/katex-style.zip'
            })
        }

        images = uniqueObjects(images)

        zipFileCreator(outputList, images, createSlug(
                this.book.title) +
            '.html.zip', false, includeZips)
    }


}

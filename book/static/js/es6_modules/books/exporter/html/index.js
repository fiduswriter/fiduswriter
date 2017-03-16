import {katexRender} from "../../../katex"

import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "../tools"
import {htmlBookExportTemplate, htmlBookIndexTemplate, htmlBookIndexItemTemplate} from "./templates"
import {docSchema} from "../../../schema/document"
import {removeHidden} from "../../../exporter/tools/doc-contents"
import {BaseEpubExporter} from "../../../exporter/epub/base"
import {createSlug} from "../../../exporter/tools/file"
import {findImages} from "../../../exporter/tools/html"
import {ZipFileCreator} from "../../../exporter/tools/zip"
import {RenderCitations} from "../../../citations/render"
import {addAlert} from "../../../common"
import download from "downloadjs"

export class HTMLBookExporter extends BaseEpubExporter { // extension is correct. Neds orderLinks/setLinks methods from base epub exporter.
    constructor(book, user, docList) {
        super()
        this.book = book
        this.user = user
        this.docList = docList
        this.chapters = []
        this.math = false
        if (this.book.chapters.length === 0) {
            addAlert('error', gettext('Book cannot be exported due to lack of chapters.'))
            return false
        }

        getMissingChapterData(this.book, this.docList).then(
            () => getImageAndBibDB(this.book, this.docList)
        ).then(
            ({imageDB, bibDB}) => {
                this.bibDB = bibDB
                this.imageDB = imageDB
                this.exportOne()
            }
        ).catch(
            () => {}
        )
    }

    exportOne() {

        this.book.chapters = _.sortBy(this.book.chapters, function (chapter) {
            return chapter.number
        })

        for (let i = 0; i < this.book.chapters.length; i++) {

            let doc = _.findWhere(this.docList, {
                id: this.book.chapters[i].text
            })

            let docContents = removeHidden(doc.contents)

            let contents = docSchema.nodeFromJSON(docContents).toDOM()

            let equations = contents.querySelectorAll('.equation')

            let figureEquations = contents.querySelectorAll('.figure-equation')

            if (equations.length > 0 || figureEquations.length > 0) {
                this.math = true
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

            this.chapters.push({
                doc,
                contents
            })
        }
        this.exportTwo()
    }

    exportTwo(chapterNumber = 0) {
        // add bibliographies (asynchronously)
        let citRenderer = new RenderCitations(
            this.chapters[chapterNumber].contents,
            this.book.settings.citationstyle,
            this.bibDB,
            true
        )
        citRenderer.init().then(
            () => {
                let bibHTML = citRenderer.fm.bibHTML
                if (bibHTML.length > 0) {
                    this.chapters[chapterNumber].contents.innerHTML += bibHTML
                }
                chapterNumber++
                if (chapterNumber===this.chapters.length) {
                    this.exportThree()
                } else {
                    this.exportTwo(chapterNumber)
                }
            }
        )

    }

    exportThree() {

        let styleSheets = [],
            outputList = [],
            images = [],
            contentItems = [],
            includeZips = [],
            chapters = this.chapters

        for (let i=0; i < chapters.length; i++) {

            let contents = chapters[i].contents

            let doc = chapters[i].doc

            let title = doc.title

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
                metadata: doc.metadata,
                settings: doc.settings,
                styleSheets,
                contents: contentsCode,
                math: this.math
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

        if (this.math) {
            includeZips.push({
                'directory': '',
                'url': window.staticUrl + 'zip/katex-style.zip'
            })
        }

        images = uniqueObjects(images)

        let zipper = new ZipFileCreator(
            outputList,
            images,
            includeZips
        )

        zipper.init().then(
            blob => download(blob, createSlug(this.book.title) + '.html.zip', 'application/zip')
        )
    }


}

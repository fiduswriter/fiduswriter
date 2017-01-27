import {katexRender} from "../../../katex"

import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "../tools"
import {epubBookOpfTemplate, epubBookCoverTemplate, epubBookTitlepageTemplate,
  epubBookCopyrightTemplate} from "./templates"
import {katexOpfIncludes} from "../../../katex/opf-includes"
import {BaseEpubExporter} from "../../../exporter/epub/base"
import {ncxTemplate, ncxItemTemplate, navTemplate, navItemTemplate,
  containerTemplate, xhtmlTemplate} from "../../../exporter/epub/templates"
import {node2Obj, obj2Node} from "../../../exporter/tools/json"
import {docSchema} from "../../../schema/document"
import {removeHidden} from "../../../exporter/tools/doc-contents"
import {findImages} from "../../../exporter/tools/html"
import {createSlug} from "../../../exporter/tools/file"
import {ZipFileCreator} from "../../../exporter/tools/zip"
import {RenderCitations} from "../../../citations/render"
import {addAlert} from "../../../common"
import download from "downloadjs"


export class EpubBookExporter extends BaseEpubExporter {
    constructor(book, user, docList) {
        super()
        this.book = book
        this.user = user
        this.docList = docList
        this.chapters = []
        this.images = []
        this.outputList = []
        this.math = false
        this.coverImage = false
        this.contentItems = []
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


        if (this.book.cover_image) {
            this.coverImage = _.findWhere(this.imageDB.db, {
                pk: this.book.cover_image
            })
            this.images.push({
                url: this.coverImage.image.split('?')[0],
                filename: this.coverImage.image.split('/').pop().split('?')[0]
            })

            this.outputList.push({
                filename: 'EPUB/cover.xhtml',
                contents: epubBookCoverTemplate({aBook: this.book, coverImage: this.coverImage})
            })
            this.contentItems.push({
                link: 'cover.xhtml#cover',
                title: gettext('Cover'),
                docNum: 0,
                id: 0,
                level: 0,
                subItems: [],
            })
        }
        this.contentItems.push({
            link: 'titlepage.xhtml#title',
            title: gettext('Title page'),
            docNum: 0,
            id: 1,
            level: 0,
            subItems: [],
        })




        for (let i = 0; i < this.book.chapters.length; i++) {

            let aChapter = {}

            aChapter.document = _.findWhere(this.docList, {
                id: this.book.chapters[i].text
            })

            let docContents = removeHidden(aChapter.document.contents)

            let tempNode = docSchema.nodeFromJSON(docContents).toDOM()

            let contents = document.createElement('body')

            while (tempNode.firstChild) {
                contents.appendChild(tempNode.firstChild)
            }

            this.images = this.images.concat(findImages(contents))


            contents = this.cleanHTML(contents)

            contents = this.addFigureNumbers(contents)

            aChapter.number = this.book.chapters[i].number

            aChapter.part = this.book.chapters[i].part

            let equations = contents.querySelectorAll('.equation')

            let figureEquations = contents.querySelectorAll('.figure-equation')

            if (equations.length > 0 || figureEquations.length > 0) {
                aChapter.math = true
                this.math = true
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

            if (this.book.chapters[i].part && this.book.chapters[i].part !== '') {
                this.contentItems.push({
                    link: 'document-' + this.book.chapters[i].number + '.xhtml',
                    title: aChapter.part,
                    docNum: aChapter.number,
                    id: 0,
                    level: -1,
                    subItems: [],
                })
            }

            // Make links to all H1-3 and create a TOC list of them
            this.contentItems = this.contentItems.concat(this.setLinks(
                contents, aChapter.number))

         //   aChapter.contents = this.styleEpubFootnotes(contents)

            aChapter.contents = contents

            this.chapters.push(aChapter)

        }
        this.exportTwo(0)
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

        let includeZips = [],
            httpOutputList = [],
            styleSheets = [],
            chapters = this.chapters


        for (let i=0;i<chapters.length;i++) {

            chapters[i].contents = this.styleEpubFootnotes(chapters[i].contents)


            let xhtmlCode = xhtmlTemplate({
                part: chapters[i].part,
                shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
                title: chapters[i].document.title,
                metadata: chapters[i].document.metadata,
                settings: chapters[i].document.settings,
                styleSheets,
                body: obj2Node(node2Obj(chapters[i].contents), 'xhtml').innerHTML,
                math: chapters[i].math
            })

            xhtmlCode = this.replaceImgSrc(xhtmlCode)

            this.outputList.push({
                filename: 'EPUB/document-' + chapters[i].number + '.xhtml',
                contents: xhtmlCode
            })
        }

        this.contentItems.push({
            link: 'copyright.xhtml#copyright',
            title: gettext('Copyright'),
            docNum: 0,
            id: 2,
            level: 0,
            subItems: [],
        })

        this.contentItems = this.orderLinks(this.contentItems)

        let timestamp = this.getTimestamp()

        this.images = uniqueObjects(this.images)

        // mark cover image
        if (this.coverImage) {
            _.findWhere(this.images, {
                url: this.coverImage.image.split('?')[0]
            }).coverImage = true
        }

        let opfCode = epubBookOpfTemplate({
            language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
            aBook: this.book,
            idType: 'fidus',
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets,
            math: this.math,
            images: this.images,
            chapters,
            coverImage: this.coverImage,
            katexOpfIncludes,
            user: this.user
        })

        let ncxCode = ncxTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: this.book.title,
            idType: 'fidus',
            id: this.book.id,
            contentItems: this.contentItems,
            templates: {ncxTemplate, ncxItemTemplate}
        })

        let navCode = navTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            contentItems: this.contentItems,
            templates: {navTemplate, navItemTemplate}
        })

        this.outputList = this.outputList.concat([{
            filename: 'META-INF/container.xml',
            contents: containerTemplate({})
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
            filename: 'EPUB/titlepage.xhtml',
            contents: epubBookTitlepageTemplate({
                aBook: this.book
            })
        }, {
            filename: 'EPUB/copyright.xhtml',
            contents: epubBookCopyrightTemplate({
                aBook: this.book,
                creator: this.user.name,
                language: gettext('English') //TODO: specify a book language rather than using the current users UI language
            })
        }])

        for (let i = 0; i < styleSheets.length; i++) {
            this.outputList.push({
                filename: 'EPUB/' + styleSheets[i].filename,
                contents: styleSheets[i].contents
            })
        }

        for (let i = 0; i < this.images.length; i++) {
            httpOutputList.push({
                filename: 'EPUB/' + this.images[i].filename,
                url: this.images[i].url
            })
        }

        if (this.math) {
            includeZips.push({
                'directory': 'EPUB',
                'url': window.staticUrl + 'zip/katex-style.zip'
            })
        }

        let zipper = new ZipFileCreator(
            this.outputList,
            httpOutputList,
            includeZips,
            'application/epub+zip'
        )

        zipper.init().then(
            blob => download(
                blob,
                createSlug(this.book.title) + '.epub',
                'application/epub+zip'
            )
        )

    }

}

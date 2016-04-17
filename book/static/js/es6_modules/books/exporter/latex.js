import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "./tools"
import {latexBookIndexTemplate} from "./latex-templates"
import {obj2Node} from "../../exporter/json"
import {BaseLatexExporter} from "../../exporter/latex"
import {createSlug, findImages} from "../../exporter/tools"
import {zipFileCreator} from "../../exporter/zip"
import {BibLatexExporter} from "../../bibliography/exporter/biblatex"


export class LatexBookExporter extends BaseLatexExporter {
    constructor(book, user, docList) {
        super()
        let that = this
        this.book = book
        this.user = user // Not used, but we keep it for consistency
        this.docList = docList
        getMissingChapterData(book, docList, function () {
            getImageAndBibDB(book, docList, function (imageDB,
                bibDB) {
                that.bibDB = bibDB
                that.imageDB = imageDB // Apparently not used
                that.exportOne()
            })
        })
    }


    exportOne() {
        let htmlCode, outputList = [],
            images = [],
            listedWorksList = [],
            allContent = document.createElement('div')


        this.book.chapters = _.sortBy(this.book.chapters, function (chapter) {
            return chapter.number
        })

        for (let i = 0; i < this.book.chapters.length; i++) {

            let aDocument = _.findWhere(this.docList, {
                id: this.book.chapters[i].text
            })

            let title = aDocument.title

            let contents = obj2Node(aDocument.contents)

            allContent.innerHTML += contents.innerHTML

            images = images.concat(findImages(contents))

            let latexCode = this.htmlToLatex(title, aDocument.owner.name, contents, this.bibDB,
                aDocument.settings, aDocument.metadata, true,
                listedWorksList)

            listedWorksList = latexCode.listedWorksList

            outputList.push({
                filename: 'chapter-' + this.book.chapters[i].number + '.tex',
                contents: latexCode.latex
            })

        }
        let author = this.book.owner_name
        if (this.book.metadata.author && this.book.metadata.author != '') {
            author = this.book.metadata.author
        }

        let documentFeatures = this.findLatexDocumentFeatures(
            allContent, this.book.title, author, this.book.metadata.subtitle, this.book.metadata.keywords, this.book.metadata.author, this.book.metadata, 'book')


        let latexStart = documentFeatures.latexStart
        let latexEnd = documentFeatures.latexEnd

        outputList.push({
            filename: createSlug(
                this.book.title) + '.tex',
            contents: latexBookIndexTemplate({
                aBook: this.book,
                latexStart: latexStart,
                latexEnd: latexEnd
            })
        })

        let bibtex = new BibLatexExporter(listedWorksList,
            this.bibDB, false)

        if (bibtex.bibtex_str.length > 0) {
            outputList.push({
                filename: 'bibliography.bib',
                contents: bibtex.bibtex_str
            })
        }

        images = uniqueObjects(images)

        zipFileCreator(outputList, images, createSlug(
                this.book.title) +
            '.latex.zip')
    }
}

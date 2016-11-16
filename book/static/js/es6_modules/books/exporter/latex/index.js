import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "../tools"
import {LatexExporterConvert} from "../../../exporter/latex/convert"
import {bookTexTemplate} from "./templates"
import {createSlug} from "../../../exporter/tools/file"
import {removeHidden} from "../../../exporter/tools/doc-contents"
import {BibLatexExporter} from "biblatex-csl-converter"
import {zipFileCreator} from "../../../exporter/tools/zip"

export class LatexBookExporter {

    constructor(book, user, docList) {
        let that = this
        this.book = book
        this.book.chapters = _.sortBy(this.book.chapters, function (chapter) {
            return chapter.number
        })
        this.user = user // Not used, but we keep it for consistency
        this.docList = docList
        this.textFiles = []
        this.httpFiles = []
        let p = []
        p.push(new window.Promise((resolve) => {
            getMissingChapterData(book, docList, function () {
                resolve()
            })
        }))
        p.push(new window.Promise((resolve) => {
            getImageAndBibDB(book, docList, function (imageDB,
                bibDB) {
                that.bibDB = bibDB
                that.imageDB = imageDB // Apparently not used
                resolve()
            })
        }))
        window.Promise.all(p).then(() => {
            that.init()
        })
    }

    init() {
        let that = this
        this.zipFileName = `${createSlug(this.book.title)}.latex.zip`
        let bibIds = [], imageIds = [], features = {}
        this.book.chapters.forEach((chapter, index) => {
            let converter = new LatexExporterConvert(that, that.imageDB, that.bibDB)
            let doc = _.findWhere(that.docList, {id: chapter.text})
            let chapterContents = removeHidden(doc.contents)
            let convertedDoc = converter.init(chapterContents)
            that.textFiles.push({
                filename: `chapter-${index+1}.tex`,
                contents: convertedDoc.latex
            })
            bibIds = _.unique(bibIds.concat(convertedDoc.bibIds))
            imageIds = _.unique(imageIds.concat(convertedDoc.imageIds))
            Object.assign(features, converter.features)
        })
        if (bibIds.length > 0) {
            let bibExport = new BibLatexExporter(this.bibDB.db, bibIds)
            this.textFiles.push({filename: 'bibliography.bib', contents: bibExport.output})
        }
        imageIds.forEach(function(id){
            that.httpFiles.push({
                filename: that.imageDB.db[id].image.split('/').pop(),
                url: that.imageDB.db[id].image
            })
        })
        // Start a converter, only for creating a preamble/epilogue that combines
        // the features of all of the contained chapters.
        let bookConverter = new LatexExporterConvert(that, that.imageDB, that.bibDB)
        bookConverter.features = features
        let preamble = bookConverter.assemblePreamble()
        let epilogue = bookConverter.assembleEpilogue()
        this.textFiles.push({
            filename: `book.tex`,
            contents: bookTexTemplate({
                book: this.book,
                preamble,
                epilogue
            })
        })

        zipFileCreator(this.textFiles, this.httpFiles, this.zipFileName)
    }
}

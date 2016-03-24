import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "./tools"
import {latexBookIndexTemplate} from "./latex-templates"
import {obj2Node} from "../../exporter/json"
import {findLatexDocumentFeatures, htmlToLatex} from "../../exporter/latex"
import {createSlug, findImages} from "../../exporter/tools"
import {zipFileCreator} from "../../exporter/zip"

export let downloadLatex = function (aBook) {
    getMissingChapterData(aBook, function () {
        getImageAndBibDB(aBook, function (anImageDB,
            aBibDB) {
            latexBookExport(aBook, anImageDB, aBibDB)
        })
    })
}

let latexBookExport = function (aBook, anImageDB, aBibDB) {
    let htmlCode, outputList = [],
        images = [],
        listedWorksList = [],
        allContent = document.createElement('div')


    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number
    })

    for (let i = 0; i < aBook.chapters.length; i++) {

        let aDocument = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        })

        let title = aDocument.title

        let contents = obj2Node(aDocument.contents)

        allContent.innerHTML += contents.innerHTML

        images = images.concat(findImages(contents))

        let latexCode = htmlToLatex(title, aDocument.owner.name, contents, aBibDB,
            aDocument.settings, aDocument.metadata, true,
            listedWorksList)

        listedWorksList = latexCode.listedWorksList

        outputList.push({
            filename: 'chapter-' + aBook.chapters[i].number + '.tex',
            contents: latexCode.latex
        })

    }
    let author = aBook.owner_name
    if (aBook.metadata.author && aBook.metadata.author != '') {
        author = aBook.metadata.author
    }

    let documentFeatures = findLatexDocumentFeatures(
        allContent, aBook.title, author, aBook.metadata.subtitle, aBook.metadata.keywords, aBook.metadata.author, aBook.metadata, 'book')


    let latexStart = documentFeatures.latexStart
    let latexEnd = documentFeatures.latexEnd

    outputList.push({
        filename: createSlug(
            aBook.title) + '.tex',
        contents: latexBookIndexTemplate({
            aBook: aBook,
            latexStart: latexStart,
            latexEnd: latexEnd
        })
    })

    let bibtex = new bibliographyHelpers.bibLatexExport(listedWorksList,
        aBibDB)

    if (bibtex.bibtex_str.length > 0) {
        outputList.push({
            filename: 'bibliography.bib',
            contents: bibtex.bibtex_str
        })
    }

    images = uniqueObjects(images)

    zipFileCreator(outputList, images, createSlug(
            aBook.title) +
        '.latex.zip')
}

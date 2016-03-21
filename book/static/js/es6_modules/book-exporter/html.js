import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "./tools"

export let downloadHtml = function (aBook) {
    getMissingChapterData(aBook, function () {
        getImageAndBibDB(aBook, function (anImageDB,
            aBibDB) {
            htmlBookExport(aBook, anImageDB, aBibDB)
        })
    })
}

let htmlBookExport = function (aBook, anImageDB, aBibDB) {
    let math = false,
        styleSheets = [],
        chapters = []


    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number
    })

    for (let i = 0; i < aBook.chapters.length; i++) {

        let aDocument = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        })

        let contents = exporter.obj2Node(aDocument.contents)

        let bibliography = citationHelpers.formatCitations(contents,
            aBook.settings.citationstyle,
            aBibDB)

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography
        }

        equations = contents.querySelectorAll('.equation')

        figureEquations = contents.querySelectorAll('.figure-equation')

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true
        }

        for (let j = 0; j < equations.length; j++) {
            let node = equations[j]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node)
        }
        for (let j = 0; j < figureEquations.length; j++) {
            let node = figureEquations[j]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                displayMode: true
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

        images = images.concat(exporter.findImages(contents))

        contents = exporter.cleanHTML(contents)

        if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
            contentItems.push({
                link: 'document-' + aBook.chapters[i].number + '.html',
                title: aBook.chapters[i].part,
                docNum: aBook.chapters[i].number,
                id: 0,
                level: -1,
                subItems: [],
            })
        }

        contentItems.push({
            link: 'document-' + aBook.chapters[i].number + '.html',
            title: title,
            docNum: aBook.chapters[i].number,
            id: 0,
            level: 0,
            subItems: [],
        })

        // Make links to all H1-3 and create a TOC list of them
        contentItems = contentItems.concat(exporter.setLinks(contents,
            aBook.chapters[i].number))


        contentsCode = exporter.replaceImgSrc(contents.innerHTML)

        htmlCode = tmp_html_export({
            'part': aBook.chapters[i].part,
            'title': title,
            'metadata': aDocument.metadata,
            'settings': aDocument.settings,
            'styleSheets': styleSheets,
            'contents': contentsCode,
            'math': math,
        })

        outputList.push({
            filename: 'document-' + aBook.chapters[i].number + '.html',
            contents: htmlCode
        })

    }

    contentItems = exporter.orderLinks(contentItems)



    outputList = outputList.concat(styleSheets)

    outputList.push({
        filename: 'index.html',
        contents: tmp_html_book_index({
            contentItems: contentItems,
            aBook: aBook,
            creator: theUser.name,
            language: gettext('English') //TODO: specify a book language rather than using the current users UI language
        })
    })

    if (math) {
        includeZips.push({
            'directory': '',
            'url': staticUrl + 'zip/katex-style.zip'
        })
    }

    images = uniqueObjects(images)

    exporter.zipFileCreator(outputList, images, exporter.createSlug(
            aBook.title) +
        '.html.zip', false, includeZips)
}

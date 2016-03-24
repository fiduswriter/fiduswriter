import {render as katexRender} from "katex"

import {getMissingChapterData, getImageAndBibDB, uniqueObjects} from "./tools"
import {htmlBookExportTemplate, htmlBookIndexTemplate, htmlBookIndexItemTemplate} from "./html-templates"
import {obj2Node} from "../../exporter/json"
import {setLinks, orderLinks} from "../../exporter/epub"
import {cleanHTML, replaceImgSrc} from "../../exporter/html"
import {createSlug, findImages} from "../../exporter/tools"
import {zipFileCreator} from "../../exporter/zip"
import {formatCitations} from "../../citations/format"

// Some templates need to be able to refer to these templates, so we hand the templates variable to such
// templates.
let templates = {htmlBookIndexItemTemplate}

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

        let contents = obj2Node(aDocument.contents)

        let bibliography = formatCitations(contents,
            aBook.settings.citationstyle,
            aBibDB)

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography
        }

        let equations = contents.querySelectorAll('.equation')

        let figureEquations = contents.querySelectorAll('.figure-equation')

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

        images = images.concat(findImages(contents))

        contents = cleanHTML(contents)

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
        contentItems = contentItems.concat(setLinks(contents,
            aBook.chapters[i].number))


        let contentsCode = replaceImgSrc(contents.innerHTML)

        let htmlCode = htmlBookExportTemplate({
            part: aBook.chapters[i].part,
            title,
            metadata: aDocument.metadata,
            settings: aDocument.settings,
            styleSheets,
            contents: contentsCode,
            math,
            obj2Node
        })

        outputList.push({
            filename: 'document-' + aBook.chapters[i].number + '.html',
            contents: htmlCode
        })

    }

    contentItems = orderLinks(contentItems)

    outputList = outputList.concat(styleSheets)

    outputList.push({
        filename: 'index.html',
        contents: htmlBookIndexTemplate({
            contentItems,
            aBook,
            creator: theUser.name,
            language: gettext('English'), //TODO: specify a book language rather than using the current users UI language
            templates
        })
    })

    if (math) {
        includeZips.push({
            'directory': '',
            'url': staticUrl + 'zip/katex-style.zip'
        })
    }

    images = uniqueObjects(images)

    zipFileCreator(outputList, images, createSlug(
            aBook.title) +
        '.html.zip', false, includeZips)
}

import {render as katexRender} from "katex"

/**
* Functions for exporting books (to epub, LaTeX, HTML).
* @namespace bookExporter
*/
let bookExporter = {}

bookExporter.getMissingChapterData = function (aBook, callback) {
    let bookDocuments = []

    for (let i = 0; i < aBook.chapters.length; i++) {
        if (!_.findWhere(theDocumentList, {id: aBook.chapters[i].text})) {
            $.addAlert('error', "Cannot produce book as you lack access rights to its chapters.")
            return
        }
        bookDocuments.push(aBook.chapters[i].text)
    }
    documentHelpers.getMissingDocumentListData(bookDocuments, callback)
}

bookExporter.getImageAndBibDB = function (aBook, callback) {
    let documentOwners = []
    for (let i = 0; i < aBook.chapters.length; i++) {
        documentOwners.push(_.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        }).owner.id)
    }

    documentOwners = _.unique(documentOwners).join(',')

    usermediaHelpers.getAnImageDB(documentOwners, function (anImageDB) {
        bibliographyHelpers.getABibDB(documentOwners, function (
            aBibDB) {
            callback(anImageDB, aBibDB)
        })
    })
}


bookExporter.uniqueObjects = function (array) {
    let results = []

    for (let i = 0; i < array.length; i++) {
        let willCopy = true
        for (let j = 0; j < i; j++) {
            if (_.isEqual(array[i], array[j])) {
                willCopy = false
                break
            }
        }
        if (willCopy) {
            results.push(array[i])
        }
    }

    return results
}

bookExporter.downloadEpub = function (aBook) {
    bookExporter.getMissingChapterData(aBook, function () {
        bookExporter.getImageAndBibDB(aBook, function (anImageDB,
            aBibDB) {
            bookExporter.epub(aBook, anImageDB, aBibDB)
        })
    })
}

bookExporter.epub = function (aBook, anImageDB, aBibDB) {
    let coverImage = false, contentItems = [],
        images = [],
        chapters = [],
        styleSheets = [],
        outputList = [],
        math = false

    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number
    })


    if (aBook.cover_image) {
        coverImage = _.findWhere(anImageDB, {
            pk: aBook.cover_image
        })
        images.push({
            url: coverImage.image.split('?')[0],
            filename: coverImage.image.split('/').pop().split('?')[0]
        })

        outputList.push({
            filename: 'EPUB/cover.xhtml',
            contents: tmp_epub_book_cover({aBook, coverImage})
        })
        contentItems.push({
            link: 'cover.xhtml#cover',
            title: gettext('Cover'),
            docNum: 0,
            id: 0,
            level: 0,
            subItems: [],
        })
    }
    contentItems.push({
        link: 'titlepage.xhtml#title',
        title: gettext('Title page'),
        docNum: 0,
        id: 1,
        level: 0,
        subItems: [],
    })




    for (let i = 0; i < aBook.chapters.length; i++) {

        let aChapter = {}

        aChapter.document = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        })

        let tempNode = exporter.obj2Node(aChapter.document.contents)

        let contents = document.createElement('body')

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild)
        }

        let bibliography = citationHelpers.formatCitations(contents,
            aBook.settings.citationstyle,
            aBibDB)

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography
        }

        images = images.concat(exporter.findImages(contents))

        let startHTML = '<h1 class="title">' + aChapter.document.title + '</h1>'

        if (aChapter.document.settings && aChapter.document.settings['metadata-subtitle'] && aChapter.document.metadata.subtitle) {
            tempNode = exporter.obj2Node(aChapter.document.metadata.subtitle)
            if (tempNode && tempNode.textContent.length > 0) {
                startHTML += '<h2 class="subtitle">' + tempNode.textContent +
                    '</h2>'
            }
        }
        if (aChapter.document.settings && aChapter.document.settings['metadata-abstract'] && aChapter.document.metadata.abstract) {
            tempNode = exporter.obj2Node(aChapter.document.metadata.abstract)
            if (tempNode && tempNode.textContent.length > 0) {
                startHTML += '<div class="abstract">' + tempNode.textContent +
                    '</div>'
            }
        }

        contents.innerHTML = startHTML + contents.innerHTML

        contents = exporter.cleanHTML(contents)

        contents = exporter.addFigureNumbers(contents)

        aChapter.number = aBook.chapters[i].number

        aChapter.part = aBook.chapters[i].part

        let equations = contents.querySelectorAll('.equation')

        let figureEquations = contents.querySelectorAll('.figure-equation')

        if (equations.length > 0 || figureEquations.length > 0) {
            aChapter.math = true
            math = true
        }

        for (let i = 0; i < equations.length; i++) {
            let node = equations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node)
        }
        for (let i = 0; i < figureEquations.length; i++) {
            let node = figureEquations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                displayMode: true
            })
        }

        if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
            contentItems.push({
                link: 'document-' + aBook.chapters[i].number + '.xhtml',
                title: aChapter.part,
                docNum: aChapter.number,
                id: 0,
                level: -1,
                subItems: [],
            })
        }

        // Make links to all H1-3 and create a TOC list of them
        contentItems = contentItems.concat(exporter.setLinks(
            contents, aChapter.number))

     //   aChapter.contents = exporter.styleEpubFootnotes(contents)

        aChapter.contents = contents

        chapters.push(aChapter)

    }

    let includeZips = [],
        httpOutputList = []


    for (let i=0;i<chapters.length;i++) {

        chapters[i].contents = exporter.styleEpubFootnotes(chapters[i].contents)


        let xhtmlCode = exporter.xhtmlTemplate({
            part: chapters[i].part,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: chapters[i].document.title,
            metadata: chapters[i].document.metadata,
            settings: chapters[i].document.settings,
            styleSheets,
            body: exporter.obj2Node(exporter.node2Obj(chapters[i].contents), 'xhtml').innerHTML,
            math: chapters[i].math
        })

        xhtmlCode = exporter.replaceImgSrc(xhtmlCode)

        outputList.push({
            filename: 'EPUB/document-' + chapters[i].number + '.xhtml',
            contents: xhtmlCode
        })
    }

    contentItems.push({
        link: 'copyright.xhtml#copyright',
        title: gettext('Copyright'),
        docNum: 0,
        id: 2,
        level: 0,
        subItems: [],
    })

    contentItems = exporter.orderLinks(contentItems)

    timestamp = exporter.getTimestamp()

    images = bookExporter.uniqueObjects(images)

    // mark cover image
    if (typeof(coverImage) != 'undefined') {
        _.findWhere(images, {
            url: coverImage.image.split('?')[0]
        }).coverImage = true
    }

    let opfCode = tmp_epub_book_opf({
        language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
        aBook,
        theUser,
        idType: 'fidus',
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets,
        math,
        images,
        chapters,
        coverImage
    })

    ncxCode = exporter.ncxTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: aBook.title,
        idType: 'fidus',
        id: aBook.id,
        contentItems: contentItems
    })

    navCode = exporter.navTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems
    })

    outputList = outputList.concat([{
        filename: 'META-INF/container.xml',
        contents: exporter.containerTemplate({})
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
        contents: tmp_epub_book_titlepage({
            aBook: aBook
        })
    }, {
        filename: 'EPUB/copyright.xhtml',
        contents: tmp_epub_book_copyright({
            aBook: aBook,
            creator: theUser.name,
            language: gettext('English') //TODO: specify a book language rather than using the current users UI language
        })
    }])




    for (let i = 0; i < styleSheets.length; i++) {
        outputList.push({
            filename: 'EPUB/' + styleSheets[i].filename,
            contents: styleSheets[i].contents
        })
    }



    for (let i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        })
    }

    if (math) {
        includeZips.push({
            'directory': 'EPUB',
            'url': staticUrl + 'zip/katex-style.zip'
        })
    }

    exporter.zipFileCreator(outputList, httpOutputList, exporter.createSlug(
            aBook.title) +
        '.epub', 'application/epub+zip', includeZips)
}

bookExporter.downloadHtml = function (aBook) {
    bookExporter.getMissingChapterData(aBook, function () {
        bookExporter.getImageAndBibDB(aBook, function (anImageDB,
            aBibDB) {
            bookExporter.html(aBook, anImageDB, aBibDB)
        })
    })
}

bookExporter.html = function (aBook, anImageDB, aBibDB) {
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

    images = bookExporter.uniqueObjects(images)

    exporter.zipFileCreator(outputList, images, exporter.createSlug(
            aBook.title) +
        '.html.zip', false, includeZips)
}

bookExporter.downloadLatex = function (aBook) {
    bookExporter.getMissingChapterData(aBook, function () {
        bookExporter.getImageAndBibDB(aBook, function (anImageDB,
            aBibDB) {
            bookExporter.latex(aBook, anImageDB, aBibDB)
        })
    })
}

bookExporter.latex = function (aBook, anImageDB, aBibDB) {
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

        let contents = exporter.obj2Node(aDocument.contents)

        allContent.innerHTML += contents.innerHTML

        images = images.concat(exporter.findImages(contents))

        let latexCode = exporter.htmlToLatex(title, aDocument.owner.name, contents, aBibDB,
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

    let documentFeatures = exporter.findLatexDocumentFeatures(
        allContent, aBook.title, author, aBook.metadata.subtitle, aBook.metadata.keywords, aBook.metadata.author, aBook.metadata, 'book')


    let latexStart = documentFeatures.latexStart
    let latexEnd = documentFeatures.latexEnd

    outputList.push({
        filename: exporter.createSlug(
            aBook.title) + '.tex',
        contents: tmp_latex_book_index({
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

    images = bookExporter.uniqueObjects(images)

    exporter.zipFileCreator(outputList, images, exporter.createSlug(
            aBook.title) +
        '.latex.zip')
}

window.bookExporter = bookExporter

import {joinDocumentParts, addFigureNumbers, replaceImgSrc, getMathjaxHeader} from "./html"
import {obj2Node, node2Obj} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {opfTemplate, containerTemplate, ncxTemplate, navTemplate, xhtmlTemplate} from "./epub-templates"

export let styleEpubFootnotes = function(htmlCode) {
    let footnotesCode = '', footnoteCounter = 0
    jQuery(htmlCode).find('.footnote').each(function() {
        footnoteCounter++
        footnotesCode += '<aside epub:type="footnote" id="n' +
            footnoteCounter + '"><p>' + footnoteCounter + ' ' +
            this.innerHTML + '</p></aside>'
        jQuery(this).replaceWith(
            '<sup><a epub:type="noteref" href="#n' +
            footnoteCounter + '">' + footnoteCounter +
            '</a></sup>'
        )
    })
    htmlCode.innerHTML += footnotesCode

    return htmlCode
}

export let getTimestamp = function() {
    let today = new Date()
    let second = today.getUTCSeconds()
    let minute = today.getUTCMinutes()
    let hour = today.getUTCHours()
    let day = today.getUTCDate()
    let month = today.getUTCMonth() + 1 //January is 0!
    let year = today.getUTCFullYear()

    if (second < 10) {
        second = '0' + second
    }
    if (minute < 10) {
        minute = '0' + minute
    }
    if (hour < 10) {
        hour = '0' + hour
    }
    if (day < 10) {
        day = '0' + day
    }
    if (month < 10) {
        month = '0' + month
    }

    return year + '-' + month + '-' + day + 'T' + hour + ':' +
        minute + ':' + second + 'Z'
}

export let downloadEpub = function(aDocument) {
    if (window.hasOwnProperty('theEditor') || (window.hasOwnProperty(
            'BibDB') && aDocument.is_owner)) {
        export1(aDocument, BibDB)
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function() {
            export1(aDocument, BibDB)
        })
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function(
            aBibDB) {
            export1(aDocument, aBibDB)
        })
    }
}

let export1 = function(aDocument, aBibDB) {
    let styleSheets = [] //TODO: fill style sheets with something meaningful.
    let title = aDocument.title

    $.addAlert('info', title + ': ' + gettext(
        'Epub export has been initiated.'))


    let contents = joinDocumentParts(aDocument, aBibDB)
    contents = addFigureNumbers(contents)

    let images = findImages(contents)

    let contentsBody = document.createElement('body')

    while (contents.firstChild) {
        contentsBody.appendChild(contents.firstChild)
    }

    let equations = contentsBody.querySelectorAll('.equation')

    let figureEquations = contentsBody.querySelectorAll('.figure-equation')

    let mathjax = false

    if (equations.length > 0 || figureEquations.length > 0) {
        mathjax = true
    }

    for (let i = 0; i < equations.length; i++) {
        mathHelpers.layoutMathNode(equations[i])
    }
    for (let i = 0; i < figureEquations.length; i++) {
        mathHelpers.layoutDisplayMathNode(figureEquations[i])
    }
    mathHelpers.queueExecution(function() {
        setTimeout(function() {
            export2(aDocument, contentsBody, images, title, styleSheets, mathjax)
        }, 2000)
    })
}

let export2 = function(aDocument, contentsBody, images, title, styleSheets, mathjax) {

    if (mathjax) {
        mathjax = getMathjaxHeader()

        if (mathjax) {
            mathjax = obj2Node(node2Obj(mathjax), 'xhtml').outerHTML
        }
    }

    // Make links to all H1-3 and create a TOC list of them
    let contentItems = orderLinks(setLinks(
        contentsBody))

    let contentsBodyEpubPrepared = styleEpubFootnotes(
        contentsBody)

    let xhtmlCode = xhtmlTemplate({
        part: false,
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        styleSheets: styleSheets,
        body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML,
        mathjax: mathjax,
    })

    xhtmlCode = replaceImgSrc(xhtmlCode)

    let containerCode = containerTemplate({})

    let timestamp = getTimestamp()

    let authors = [aDocument.owner.name]

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        let tempNode = obj2Node(aDocument.metadata.authors)
        if (tempNode.textContent.length > 0) {
            authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim)
        }
    }

    let keywords = []

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        let tempNode = obj2Node(aDocument.metadata.keywords)
        if (tempNode.textContent.length > 0) {
            keywords = jQuery.map(tempNode.textContent.split(","), jQuery.trim)
        }
    }


    let opfCode = opfTemplate({
        language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        authors: authors,
        keywords: keywords,
        idType: 'fidus',
        id: aDocument.id,
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets: styleSheets,
        mathjax: mathjax,
        images: images
    })

    let ncxCode = ncxTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        idType: 'fidus',
        id: aDocument.id,
        contentItems: contentItems
    })

    let navCode = navTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems
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
        outputList.push({
            filename: 'EPUB/' + styleSheets[i].filename,
            contents: styleSheets[i].contents
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
    if (mathjax) {
        includeZips.push({
            'directory': 'EPUB',
            'url': mathjaxZipUrl,
        })
    }

    zipFileCreator(outputList, httpOutputList, createSlug(
            title) +
        '.epub', 'application/epub+zip', includeZips)
}

export let setLinks = function(htmlCode, docNum) {
    let contentItems = [], title

    jQuery(htmlCode).find('h1,h2,h3').each(function() {
        title = jQuery.trim(this.textContent)
        if (title !== '') {
            let contentItem = {}
            contentItem.title = title
            contentItem.level = parseInt(this.tagName.substring(
                1, 2))
            if (docNum) {
                contentItem.docNum = docNum
            }
            if (this.classList.contains('title')) {
                contentItem.level = 0
            }
            this.id = 'id' + contentItems.length

            contentItem.id = this.id
            contentItems.push(contentItem)
        }
    })
    return contentItems
}

export let orderLinks = function(contentItems) {
    for (let i = 0; i < contentItems.length; i++) {
        contentItems[i].subItems = []
        if (i > 0) {
            for (let j = i - 1; j > -1; j--) {
                if (contentItems[j].level < contentItems[i].level) {
                    contentItems[j].subItems.push(contentItems[i])
                    contentItems[i].delete = true
                    break
                }
            }
        }

    }

    for (let i = contentItems.length; i > -1; i--) {
        if (contentItems[i] && contentItems[i].delete) {
            delete contentItems[i].delete
            contentItems.splice(i, 1)
        }
    }
    return contentItems
}

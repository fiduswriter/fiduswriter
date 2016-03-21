import {joinDocumentParts, addFigureNumbers, replaceImgSrc} from "./html"
import {obj2Node, node2Obj} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {opfTemplate, containerTemplate, ncxTemplate, ncxItemTemplate, navTemplate,
  navItemTemplate, xhtmlTemplate} from "./epub-templates"
import {render as katexRender} from "katex"

let templates = {ncxTemplate, ncxItemTemplate, navTemplate, navItemTemplate}

export let styleEpubFootnotes = function(htmlCode) {
    // Converts RASH style footnotes into epub footnotes.
    let footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'))
    let footnoteCounter = 1
    footnotes.forEach(function(footnote){
        let newFootnote = document.createElement('aside')
        newFootnote.setAttribute('epub:type', 'footnote')
        newFootnote.id = footnote.id
        while(footnote.firstChild) {
            newFootnote.appendChild(footnote.firstChild)
        }
        newFootnote.firstChild.innerHTML = footnoteCounter + ' ' + newFootnote.firstChild.innerHTML
        footnote.parentNode.replaceChild(newFootnote, footnote)
        footnoteCounter++
    })
    let footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('a.fn'))
    let footnoteMarkerCounter = 1
    footnoteMarkers.forEach(function(fnMarker){
        let newFnMarker = document.createElement('sup')
        let newFnMarkerLink = document.createElement('a')
        newFnMarkerLink.setAttribute('epub:type', 'noteref')
        newFnMarkerLink.setAttribute('href', fnMarker.getAttribute('href'))
        newFnMarkerLink.innerHTML = footnoteMarkerCounter
        newFnMarker.appendChild(newFnMarkerLink)
        fnMarker.parentNode.replaceChild(newFnMarker, fnMarker)
        footnoteMarkerCounter++
    })

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

export let downloadEpub = function(aDocument, inEditor) {
    if (inEditor || (window.hasOwnProperty(
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

    let math = false

    if (equations.length > 0 || figureEquations.length > 0) {
        math = true
        styleSheets.push({filename: 'katex.min.css'})
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
        body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
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
        title,
        authors,
        keywords,
        idType: 'fidus',
        id: aDocument.id,
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets,
        math,
        images
    })

    let ncxCode = ncxTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        idType: 'fidus',
        id: aDocument.id,
        contentItems: contentItems,
        templates
    })

    let navCode = navTemplate({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems,
        templates
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
        let styleSheet = styleSheets[i]
        if (styleSheet.contents) {
            outputList.push({
                filename: 'EPUB/' + styleSheet.filename,
                contents: styleSheet.contents
            })
        }
    }

    let httpOutputList = []
    for (let i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        })
    }
    let includeZips = []
    if (math) {
        includeZips.push({
            'directory': 'EPUB',
            'url': staticUrl + 'zip/katex-style.zip'
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

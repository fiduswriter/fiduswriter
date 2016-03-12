import {obj2Node} from "./json"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {htmlExportTemplate} from "./html-templates"

export let downloadHtml = function(aDocument) {
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
    let styleSheets = [], mathjax = false

    let title = aDocument.title

    $.addAlert('info', title + ': ' + gettext(
        'HTML export has been initiated.'))

    let contents = document.createElement('div')

    let tempNode = obj2Node(aDocument.contents)

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild)
    }

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        let tempNode = obj2Node(aDocument.metadata.keywords)
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'keywords'
            contents.insertBefore(tempNode, contents.firstChild)
        }
    }

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        let tempNode = obj2Node(aDocument.metadata.authors)
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'authors'
            contents.insertBefore(tempNode, contents.firstChild)
        }
    }

    if (aDocument.settings['metadata-abstract'] && aDocument.metadata.abstract) {
        let tempNode = obj2Node(aDocument.metadata.abstract)
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'abstract'
            contents.insertBefore(tempNode, contents.firstChild)
        }
    }

    if (aDocument.settings['metadata-subtitle'] && aDocument.metadata.subtitle) {
        let tempNode = obj2Node(aDocument.metadata.subtitle)
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'subtitle'
            contents.insertBefore(tempNode, contents.firstChild)
        }
    }

    if (title) {
        let tempNode = document.createElement('h1')
        tempNode.classList.add('title')
        tempNode.textContent = title
        contents.insertBefore(tempNode, contents.firstChild)
    }

    let equations = contents.querySelectorAll('.equation')

    let figureEquations = contents.querySelectorAll('.figure-equation')

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
        export2(aDocument, aBibDB, styleSheets, title, contents, mathjax)
    })
}

let export2 = function(aDocument, aBibDB, styleSheets, title, contents, mathjax) {

    let includeZips = []

    if (mathjax) {
        mathjax = getMathjaxHeader()

        if (mathjax) {
            mathjax = mathjax.outerHTML
        }
    }

    let bibliography = citationHelpers.formatCitations(contents,
        aDocument.settings.citationstyle,
        aBibDB)

    if (bibliography.length > 0) {
        let tempNode = document.createElement('div')
        tempNode.innerHTML = bibliography
        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild)
        }
    }

    let httpOutputList = findImages(contents)

    contents = cleanHTML(contents)
    contents = addFigureNumbers(contents)

    let contentsCode = replaceImgSrc(contents.innerHTML)

    let htmlCode = htmlExportTemplate({
        part: false,
        title: title,
        metadata: aDocument.metadata,
        settings: aDocument.settings,
        styleSheets: styleSheets,
        contents: contentsCode,
        mathjax: mathjax,
    })

    let outputList = [{
        filename: 'document.html',
        contents: htmlCode
    }]

    outputList = outputList.concat(styleSheets)

    if (mathjax) {
        includeZips.push({
            'directory': '',
            'url': mathjaxZipUrl,
        })
    }
    zipFileCreator(outputList, httpOutputList, createSlug(
            title) +
        '.html.zip', false, includeZips)
}

export let cleanHTML = function(htmlCode) {

    // Replace the footnotes with markers and the footnotes to the back of the
    // document, so they can survive the normalization that happens when
    // assigning innerHTML.
    // Also link the footnote marker with the footnote according to
    // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
    let footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote'))
    let footnotesContainer = document.createElement('section')
    footnotesContainer.id = 'fnlist'
    footnotesContainer.setAttribute('role', 'doc-footnotes')

    footnotes.forEach(function(footnote, index) {
        let footnoteMarker = document.createElement('a')
        let counter = index + 1
        footnoteMarker.setAttribute('href','#fn'+counter)
        // RASH 0.5 doesn't mark the footnote markers, so we add this class
        footnoteMarker.classList.add('fn')
        footnote.parentNode.replaceChild(footnoteMarker, footnote)
        let newFootnote = document.createElement('section')
        newFootnote.id = 'fn' + counter
        newFootnote.setAttribute('role','doc-footnote')
        while (footnote.firstChild) {
            newFootnote.appendChild(footnote.firstChild)
        }
        footnotesContainer.appendChild(newFootnote)
    })
    htmlCode.appendChild(footnotesContainer)

    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ')

    /* Related to tracked changes
    jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = ''
    })

    jQuery(htmlCode).find('.ins').each(function() {
        this.outerHTML = this.innerHTML
    })
     END tracked changes */

    jQuery(htmlCode).find('.comment').each(function() {
       this.outerHTML = this.innerHTML
    })

    jQuery(htmlCode).find('script').each(function() {
        this.outerHTML = ''
    })

    return htmlCode
}

export let addFigureNumbers = function (htmlCode) {

    jQuery(htmlCode).find('figcaption .figure-cat-figure').each(
        function(index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })

    jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function(
        index) {
        this.innerHTML += ' ' + (index + 1) + ': '
    })

    jQuery(htmlCode).find('figcaption .figure-cat-table').each(function(
        index) {
        this.innerHTML += ' ' + (index + 1) + ': '
    })
    return htmlCode

}

export let replaceImgSrc = function(htmlString) {
    htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
        "<$1 src$2>")
    return htmlString
}

// Mathjax automatically adds some elements to the current document after making SVGs. We need these elements.
export let getMathjaxHeader = function() {
    let mathjax = document.getElementById('MathJax_SVG_Hidden')
    if (mathjax === undefined || mathjax === null) {
        return false
    } else {
        return mathjax.parentElement
    }
}

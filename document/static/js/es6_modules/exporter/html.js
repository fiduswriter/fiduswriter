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
        contents.innerHTML += bibliography
    }

    let httpOutputList = findImages(contents)

    contents = cleanHTML(contents)

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
    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ')

    jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = ''
    })

    jQuery(htmlCode).find('.citation,.ins').each(function() {
        this.outerHTML = this.innerHTML
    })

    jQuery(htmlCode).find('script').each(function() {
        this.outerHTML = ''
    })

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
    var mathjax = document.getElementById('MathJax_SVG_Hidden')
    if (mathjax === undefined || mathjax === null) {
        return false
    } else {
        return mathjax.parentElement
    }
}

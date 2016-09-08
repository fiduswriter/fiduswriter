import {BaseHTMLExporter} from "./html"
import {obj2Node, node2Obj} from "./json"
import {BibliographyDB} from "../bibliography/database"
import {createSlug, findImages} from "./tools"
import {zipFileCreator} from "./zip"
import {opfTemplate, containerTemplate, ncxTemplate, ncxItemTemplate, navTemplate,
  navItemTemplate, xhtmlTemplate} from "./epub-templates"
import {katexOpfIncludes} from "../katex/opf-includes"
import {addAlert} from "../common/common"
import {katexRender} from "../katex/katex"

export class BaseEpubExporter extends BaseHTMLExporter {
    getTimestamp() {
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

    styleEpubFootnotes(htmlCode) {
        // Converts RASH style footnotes into epub footnotes.
        let footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'))
        let footnoteCounter = 1
        footnotes.forEach(function(footnote){
            let newFootnote = document.createElement('aside')
            newFootnote.setAttribute('epub:type', 'footnote')
            newFootnote.id = footnote.id
            if(footnote.firstChild) {
                while(footnote.firstChild) {
                    newFootnote.appendChild(footnote.firstChild)
                }
                newFootnote.firstChild.innerHTML = footnoteCounter + ' ' + newFootnote.firstChild.innerHTML
            } else {
                newFootnote.innerHTML = '<p>'+footnoteCounter+'</p>'
            }

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



    setLinks(htmlCode, docNum) {
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

    orderLinks(contentItems) {
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

}


export class EpubExporter extends BaseEpubExporter {

    constructor(doc, bibDB) {
        super()
        let that = this
        this.doc = doc
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exportOne()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
            this.bibDB.getBibDB(function() {
                that.exportOne()
            })
        }
    }

    exportOne() {
        let that = this
        addAlert('info', this.doc.title + ': ' + gettext(
            'Epub export has been initiated.'))


        this.joinDocumentParts(function() {
            that.exportTwo()
        })
    }

    exportTwo() {
        let styleSheets = [] //TODO: fill style sheets with something meaningful.
        let title = this.doc.title

        let contents = this.contents

        contents = this.addFigureNumbers(contents)

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
        }

        for (let i = 0; i < equations.length; i++) {
            let node = equations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {throwOnError: false})
        }
        for (let i = 0; i < figureEquations.length; i++) {
            let node = figureEquations[i]
            let formula = node.getAttribute('data-equation')
            katexRender(formula, node, {
                displayMode: true,
                throwOnError: false
            })
        }

        // Make links to all H1-3 and create a TOC list of them
        let contentItems = this.orderLinks(this.setLinks(
            contentsBody))

        let contentsBodyEpubPrepared = this.styleEpubFootnotes(
            contentsBody)

        let xhtmlCode = xhtmlTemplate({
            part: false,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title,
            styleSheets,
            math,
            body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
        })

        xhtmlCode = this.replaceImgSrc(xhtmlCode)

        let containerCode = containerTemplate({})

        let timestamp = this.getTimestamp()

        let authors = [this.doc.owner.name]

        if (this.doc.settings['metadata-authors'] && this.doc.metadata.authors) {
            let tempNode = obj2Node(this.doc.metadata.authors)
            if (tempNode.textContent.length > 0) {
                authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim)
            }
        }

        let keywords = []

        if (this.doc.settings['metadata-keywords'] && this.doc.metadata.keywords) {
            let tempNode = obj2Node(this.doc.metadata.keywords)
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
            id: this.doc.id,
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets,
            math,
            images,
            katexOpfIncludes
        })

        let ncxCode = ncxTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title,
            idType: 'fidus',
            id: this.doc.id,
            contentItems,
            templates: {ncxTemplate, ncxItemTemplate}
        })

        let navCode = navTemplate({
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            contentItems,
            templates: {navTemplate, navItemTemplate}
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
            outputList.push({
                filename: 'EPUB/' + styleSheet.filename,
                contents: styleSheet.contents
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
}

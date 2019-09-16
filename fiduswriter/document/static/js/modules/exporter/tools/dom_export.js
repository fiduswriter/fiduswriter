import {DOMSerializer} from "prosemirror-model"
import {RenderCitations} from "../../citations/render"
import {BIBLIOGRAPHY_HEADERS, FIG_CATS} from "../../schema/i18n"
import {get} from "../../common"

/*

WARNING: DEPRECATED!

Base exporter class for dom-based exports. This is the deprecated way of creating exports.
The epub, html and print export filters go over a DOM of a document which they change little
by little, and they are all based on the BaseDOMExporter class.

    New exporters should instead by walking the doc.contents tree.
    This is how the LaTeX, ODT and DOCX export filters work.
*/

export class DOMExporter {

    constructor(schema, staticUrl, csl, documentStyles) {
        this.schema = schema
        this.staticUrl = staticUrl
        this.csl = csl
        this.documentStyles = documentStyles

        this.fontFiles = []
        this.binaryFiles = []
        this.styleSheets = [
            {url: `${this.staticUrl}css/document.css?v=${process.env.TRANSPILE_VERSION}`}
        ]
    }

    addDocStyle(doc) {
        const docStyle = this.documentStyles.find(docStyle => docStyle.slug===doc.settings.documentstyle)

        // The files will be in the base directory. The filenames of
        // DocumentStyleFiles will therefore not need to replaced with their URLs.
        if (!docStyle) {
            return
        }
        this.styleSheets.push({contents: docStyle.contents, filename: `${docStyle.slug}.css`})
        this.fontFiles = this.fontFiles.concat(docStyle.documentstylefile_set.map(([url, filename]) => ({
            filename,
            url
        })))
    }

    loadStyles() {
        const p = []
        this.styleSheets.forEach(sheet => {
            if (sheet.url) {
                p.push(
                    get(sheet.url).then(
                        response => response.text()
                    ).then(
                        response => {
                            sheet.contents = response
                            sheet.filename = sheet.url.split('/').pop().split('?')[0]
                            delete sheet.url
                            // TODO: include fonts/images included in files
                        }
                    )
                )
            }
        })
        return Promise.all(p)
    }

    joinDocumentParts() {
        this.schema.cached.imageDB = this.imageDB
        const serializer = DOMSerializer.fromSchema(this.schema)
        this.contents = serializer.serializeNode(this.schema.nodeFromJSON(this.docContents))
        this.addFigureLabels(this.doc.settings.language)
        const bibliographyHeader = this.doc.settings.bibliography_header[this.doc.settings.language] || BIBLIOGRAPHY_HEADERS[this.doc.settings.language]
        const citRenderer = new RenderCitations(
            this.contents,
            this.doc.settings.citationstyle,
            bibliographyHeader,
            this.bibDB,
            this.csl
        )
        return citRenderer.init().then(
            () => {
                this.addBibliographyHTML(citRenderer.fm.bibHTML)
                this.cleanHTML(citRenderer.fm)
                return Promise.resolve()
            }
        )
    }

    addFigureLabels(language) {
        this.contents.querySelectorAll('*[class^="figure-cat-"]').forEach(el => el.innerHTML = FIG_CATS[el.dataset.figureCategory][language])
    }

    addBibliographyHTML(bibliographyHTML) {
        if (bibliographyHTML.length > 0) {
            const tempNode = document.createElement('div')
            tempNode.innerHTML = bibliographyHTML
            while (tempNode.firstChild) {
                this.contents.appendChild(tempNode.firstChild)
            }
        }
    }

    replaceImgSrc(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>")
        return htmlString
    }
    // Replace all instances of the before string in all descendant textnodes of
    // node.
    replaceText(node, before, after) {
        if (node.nodeType === 1) {
            [].forEach.call(node.childNodes, child => this.replaceText(child, before, after))
        } else if (node.nodeType === 3) {
            node.textContent = node.textContent.replace(window.RegExp(before, 'g'), after)
        }
    }

    cleanNode(node) {
        if (node.contentEditable === 'true') {
            node.removeAttribute('contentEditable')
        }
        if (node.children) {
            Array.from(node.children).forEach(childNode => this.cleanNode(childNode))
        }
    }

    getFootnoteAnchor(counter) {
        const footnoteAnchor = document.createElement('a')
        footnoteAnchor.setAttribute('href', '#fn'+counter)
        // RASH 0.5 doesn't mark the footnote anchors, so we add this class
        footnoteAnchor.classList.add('fn')
        return footnoteAnchor
    }

    cleanHTML(citationFormatter) {

        const footnoteSelector = citationFormatter.citationType === 'note' ?
            '.footnote-marker, .citation' :
            '.footnote-marker'
        // Replace the footnote markers with anchors and put footnotes with contents
        // at the back of the document.
        // Also, link the footnote anchor with the footnote according to
        // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
        const footnotes = this.contents.querySelectorAll(footnoteSelector)
        const footnotesContainer = document.createElement('section')
        let citationCount = 0
        footnotesContainer.classList.add('fnlist')
        footnotesContainer.setAttribute('role', 'doc-footnotes')

        footnotes.forEach(
            (footnote, index) => {
                const counter = index + 1
                const footnoteAnchor = this.getFootnoteAnchor(counter)
                footnote.parentNode.replaceChild(footnoteAnchor, footnote)
                const newFootnote = document.createElement('section')
                newFootnote.id = 'fn' + counter
                newFootnote.setAttribute('role', 'doc-footnote')
                newFootnote.innerHTML = footnote.matches('.footnote-marker') ?
                    footnote.dataset.footnote :
                    `<p>${citationFormatter.citationTexts[citationCount++] || " "}</p>`
                footnotesContainer.appendChild(newFootnote)
            }
        )
        this.contents.appendChild(footnotesContainer)
        this.cleanNode(this.contents)

        // Replace nbsp spaces with normal ones
        this.replaceText(this.contents, '&nbsp;', ' ')

        this.contents.querySelectorAll('.comment').forEach(el => {
            el.insertAdjacentHTML(
                'afterend',
                el.innerHTML
            )
            el.parentElement.removeChild(el)
        })

        this.contents.querySelectorAll('.citation').forEach(el => {
            delete el.dataset.references
            delete el.dataset.bibs
            delete el.dataset.format
        })

        this.contents.querySelectorAll('.equation, .figure-equation').forEach(el => {
            delete el.dataset.equation
        })

        this.contents.querySelectorAll('.figure').forEach(el => {
            delete el.dataset.equation
            delete el.dataset.image
            delete el.dataset.figureCategory
            delete el.dataset.caption
        })

        this.contents.querySelectorAll('.figure-cat-figure').forEach(el => {
            delete el.dataset.figureCategory
        })
    }

    // Fill the contents of table of contents.
    fillToc() {
        const headlines = Array.from(this.contents.querySelectorAll('h1,h2,h3,h4,h5,h6'))
        const tocs = Array.from(this.contents.querySelectorAll('div.table-of-contents'))
        tocs.forEach(toc => {
            toc.innerHTML += headlines.map(headline => {
                if (!headline.id || !headline.textContent.length) {
                    // ignore the tocs own headlines
                    return ''
                }
                const tagName = headline.tagName.toLowerCase()
                return `<${tagName}><a href="#${headline.id}">${headline.innerHTML}</a></${tagName}>`
            }).join('')
        })
    }
}

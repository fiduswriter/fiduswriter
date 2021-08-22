import {DOMSerializer} from "prosemirror-model"
import {RenderCitations} from "../../citations/render"
import {BIBLIOGRAPHY_HEADERS, CATS} from "../../schema/i18n"
import {get} from "../../common"

/*

WARNING: DEPRECATED!

Base exporter class for dom-based exports. This is the deprecated way of creating exports.
The epub, html and print export filters go over a DOM of a document which they change little
by little, and they are all based on the BaseDOMExporter class.

    New exporters should instead by walking the doc.content tree.
    This is how the JATS, LaTeX, ODT and DOCX export filters work.
*/

export class DOMExporter {

    constructor(schema, csl, documentStyles) {
        this.schema = schema
        this.csl = csl
        this.documentStyles = documentStyles

        this.fontFiles = []
        this.binaryFiles = []
        this.styleSheets = [
            {url: `${settings_STATIC_URL}css/document.css?v=${transpile_VERSION}`}
        ]
    }

    addDocStyle(doc) {
        const docStyle = this.documentStyles.find(docStyle => docStyle.slug === doc.settings.documentstyle)

        // The files will be in the base directory. The filenames of
        // DocumentStyleFiles will therefore not need to replaced with their URLs.
        if (!docStyle) {
            return
        }
        let contents = docStyle.contents
        docStyle.documentstylefile_set.forEach(
            ([_url, filename]) => contents = contents.replace(
                new RegExp(filename, 'g'),
                `media/${filename}`
            )
        )
        this.styleSheets.push({contents, filename: `css/${docStyle.slug}.css`})
        this.fontFiles = this.fontFiles.concat(docStyle.documentstylefile_set.map(([url, filename]) => ({
            filename: `css/media/${filename}`,
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
                            sheet.filename = `css/${sheet.url.split('/').pop().split('?')[0]}`
                            delete sheet.url
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
        this.content = serializer.serializeNode(this.schema.nodeFromJSON(this.docContent))

        this.addFootnotes()
        const bibliographyHeader = this.doc.settings.bibliography_header[this.doc.settings.language] || BIBLIOGRAPHY_HEADERS[this.doc.settings.language]
        const citRenderer = new RenderCitations(
            this.content,
            this.doc.settings.citationstyle,
            bibliographyHeader,
            this.bibDB,
            this.csl
        )
        return citRenderer.init().then(
            () => {
                this.addBibliographyHTML(citRenderer.fm.bibHTML)
                this.cleanHTML(citRenderer.fm)
                this.addCategoryLabels(this.doc.settings.language)
                return Promise.resolve()
            }
        )
    }

    addCategoryLabels(language) {
        this.content.querySelectorAll('figcaption span.label,caption span.label').forEach(el => {
            const category = el.parentElement.parentElement.dataset.category
            el.innerHTML = category === 'none' ? '' : CATS[category][language]
        })
    }

    addBibliographyHTML(bibliographyHTML) {
        if (bibliographyHTML.length > 0) {
            const tempNode = document.createElement('div')
            tempNode.innerHTML = bibliographyHTML
            while (tempNode.firstChild) {
                const footnotesContainer = this.content.querySelector('section.fnlist')
                this.content.insertBefore(tempNode.firstChild, footnotesContainer)
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
        footnoteAnchor.setAttribute('href', '#fn' + counter)
        // RASH 0.5 doesn't mark the footnote anchors, so we add this class
        footnoteAnchor.classList.add('fn')
        return footnoteAnchor
    }

    addFootnotes() {
        // Replace the footnote markers with anchors and put footnotes with contents
        // at the back of the document.
        // Also, link the footnote anchor with the footnote according to
        // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
        const footnotes = this.content.querySelectorAll('.footnote-marker')
        const footnotesContainer = document.createElement('section')
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
                newFootnote.innerHTML = footnote.dataset.footnote
                footnotesContainer.appendChild(newFootnote)
            }
        )
        this.content.appendChild(footnotesContainer)
    }

    moveCitationFootnotes(citationFormatter) {
        const footnotes = this.content.querySelectorAll('a.fn, .citation')
        const footnotesContainer = this.content.querySelector('section.fnlist')
        const fnCountOffset = this.content.querySelectorAll('a.fn').length

        if (footnotes.length === fnCountOffset) {
            // There are no citations to move
            return
        }

        let counter = 0

        footnotes.forEach(
            (footnote, index) => {
                if (footnote.matches('a.fn')) {
                    // Regular footnote - skip
                    return
                }
                if (footnote.matches('section.fnlist .citation')) {
                    // The citation is already in a footnote. Do not add a second footnote.
                    footnote.innerHTML = `<p><span class="citation">${citationFormatter.citationTexts[
                        counter
                    ] || " "}</span></p>`
                    return
                }
                const id = fnCountOffset + counter + 1
                const footnoteAnchor = this.getFootnoteAnchor(id)
                footnote.parentNode.replaceChild(footnoteAnchor, footnote)
                const newFootnote = document.createElement('section')
                newFootnote.id = 'fn' + (id)
                newFootnote.setAttribute('role', 'doc-footnote')
                newFootnote.innerHTML = `<p><span class="citation">${citationFormatter.citationTexts[
                    counter
                ] || " "}</span></p>`
                footnotesContainer.insertBefore(
                    newFootnote, footnotesContainer.childNodes[index]
                )
                counter += 1
            }
        )
    }

    cleanHTML(citationFormatter) {
        if (citationFormatter.citationType === 'note') {
            this.moveCitationFootnotes(citationFormatter)
        }

        this.cleanNode(this.content)

        // Replace nbsp spaces with normal ones
        this.replaceText(this.content, '&nbsp;', ' ')

        this.content.querySelectorAll('.comment').forEach(el => {
            el.insertAdjacentHTML(
                'afterend',
                el.innerHTML
            )
            el.parentElement.removeChild(el)
        })

        this.content.querySelectorAll('.citation').forEach(el => {
            delete el.dataset.references
            delete el.dataset.bibs
            delete el.dataset.format
        })
        this.content.querySelectorAll('img').forEach(el => {
            delete el.dataset.image
            delete el.dataset.imageSrc
        })

        this.content.querySelectorAll('table').forEach(el => {
            delete el.dataset.captionHidden
        })

        this.content.querySelectorAll('figcaption span.text:empty,caption span.text:empty').forEach(el => {
            el.parentElement.removeChild(el)
        })

        this.content.querySelectorAll('.cross-reference').forEach(el => {
            el.innerHTML = `<a href="#${el.dataset.id}">${el.innerHTML}</a>`
        })
    }

    // Fill the contents of table of contents.
    fillToc() {
        const headlines = Array.from(this.content.querySelectorAll('h1,h2,h3,h4,h5,h6'))
        const tocs = Array.from(this.content.querySelectorAll('div.table-of-contents'))
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

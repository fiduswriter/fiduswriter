/*

WARNING: DEPRECATED!

Base exporter class for dom-based exports. This is the deprecated way of creating exports.
The epub and html export filters go over a DOM of a document which they change little
by little, and they are all based on the BaseDOMExporter class.

    New exporters should instead by walking the doc.contents tree.
    This is how the LaTeX, ODT and DOCX export filters work.
*/

export class BaseDOMExporter {

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
        footnoteAnchor.setAttribute('href','#fn'+counter)
        // RASH 0.5 doesn't mark the footnote anchors, so we add this class
        footnoteAnchor.classList.add('fn')
        return footnoteAnchor
    }

    cleanHTML(htmlEl, citationType) {

        const footnoteSelector = citationType === 'note' ? '.footnote-marker, .citation' : '.citation'
        // Replace the footnote markers with anchors and put footnotes with contents
        // at the back of the document.
        // Also, link the footnote anchor with the footnote according to
        // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
        const footnotes = htmlEl.querySelectorAll(footnoteSelector)
        const footnotesContainer = document.createElement('section')
        footnotesContainer.id = 'fnlist'
        footnotesContainer.setAttribute('role', 'doc-footnotes')

        footnotes.forEach(
            (footnote, index) => {
                const counter = index + 1
                const footnoteAnchor = this.getFootnoteAnchor(counter)
                footnote.parentNode.replaceChild(footnoteAnchor, footnote)
                const newFootnote = document.createElement('section')
                newFootnote.id = 'fn' + counter
                newFootnote.setAttribute('role', 'doc-footnote')
                newFootnote.innerHTML = footnote.dataset.footnote ? footnote.dataset.footnote : `<p>${footnote.innerHTML}</p>`
                footnotesContainer.appendChild(newFootnote)
            }
        )
        htmlEl.appendChild(footnotesContainer)
        this.cleanNode(htmlEl)

        // Replace nbsp spaces with normal ones
        this.replaceText(htmlEl, '&nbsp;', ' ')

        htmlEl.querySelectorAll('.comment').forEach(el => {
            el.insertAdjacentHTML(
                'afterend',
                el.innerHTMLs
            )
            el.parentElement.removeChild(el)
        })

        htmlEl.querySelectorAll('.citation').forEach(el => {
            delete el.dataset.references
            delete el.dataset.bibs
            delete el.dataset.format
        })

        htmlEl.querySelectorAll('.equation, .figure-equation').forEach(el => {
            delete el.dataset.equation
        })

        htmlEl.querySelectorAll('.figure').forEach(el => {
            delete el.dataset.equation
            delete el.dataset.image
            delete el.dataset.figureCategory
            delete el.dataset.caption
        })

        htmlEl.querySelectorAll('.figure-cat-figure').forEach(el => {
            delete el.dataset.figureCategory
        })


        return htmlEl
    }
}

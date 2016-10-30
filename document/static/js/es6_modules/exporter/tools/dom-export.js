/*

WARNING: DEPRECATED!

Base exporter class for dom-based exports. This is the deprecated way of creating exports.
The latex, epub and html export filters go over a DOM of a document which they change little
by little, and they are all based on the BaseDOMExporter class.

    New exporters should instead by walking a pmJSON tree.
    This is how the ODT and DOCX export filters work.
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

    cleanHTML(htmlCode) {

        // Replace the footnote markers with anchors and put footnotes with contents
        // at the back of the document.
        // Also, link the footnote anchor with the footnote according to
        // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
        let footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote-marker'))
        let footnotesContainer = document.createElement('section')
        footnotesContainer.id = 'fnlist'
        footnotesContainer.setAttribute('role', 'doc-footnotes')

        footnotes.forEach(function(footnote, index) {
            let footnoteAnchor = document.createElement('a')
            let counter = index + 1
            footnoteAnchor.setAttribute('href','#fn'+counter)
            // RASH 0.5 doesn't mark the footnote anchors, so we add this class
            footnoteAnchor.classList.add('fn')
            footnote.parentNode.replaceChild(footnoteAnchor, footnote)
            let newFootnote = document.createElement('section')
            newFootnote.id = 'fn' + counter
            newFootnote.setAttribute('role','doc-footnote')
            newFootnote.innerHTML = footnote.getAttribute('contents')
            //while (footnote.firstChild) {
            //    newFootnote.appendChild(footnote.firstChild)
            //}
            footnotesContainer.appendChild(newFootnote)
        })
        htmlCode.appendChild(footnotesContainer)

        // Replace nbsp spaces with normal ones
        this.replaceText(htmlCode, '&nbsp;', ' ')

        jQuery(htmlCode).find('.comment').each(function() {
           jQuery(this).replaceWith(this.innerHTML)
        })

        //jQuery(htmlCode).find('script').each(function() {
        //    jQuery(this).replaceWith('')
        //})

        return htmlCode
    }
}

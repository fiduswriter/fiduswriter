/* Base exporter class */

export class BaseExporter {

    cleanHTML(htmlCode) {

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

        jQuery(htmlCode).find('.comment').each(function() {
           this.outerHTML = this.innerHTML
        })

        jQuery(htmlCode).find('script').each(function() {
            this.outerHTML = ''
        })

        return htmlCode
    }
}

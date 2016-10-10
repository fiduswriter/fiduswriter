/* A class to make footnotes appear correctly off the side of their referrer. */
export class ModFootnoteLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.setup()
        this.bindEvents()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `<style type="text/css" id="footnote-placement-style"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
    }

    bindEvents() {
        let that = this, pm = this.mod.editor.pm
        pm.updateScheduler([pm.on.change, pm.on.setDoc], () => {return that.updateDOM()})
        let fnPm = this.mod.fnPm
        fnPm.updateScheduler([fnPm.on.change, fnPm.on.setDoc], () => {return that.updateDOM()})
    }

    layoutFootnotes() {
        let that = this
        this.mod.editor.pm.scheduleDOMUpdate(() => {return that.updateDOM()})
    }

    updateDOM() {
        // Handle the CSS layout of the footnotes on the screen.
        // DOM write phase - nothing to do.
        let that = this
        return function () {
            // DOM read phase
            let totalOffset = document.getElementById('footnote-box-container').getBoundingClientRect().top + 10,
              footnoteBoxes = document.querySelectorAll('#footnote-box-container .footnote-container'),
              footnotePlacementStyle = '', referrers = that.mod.footnotes
            if (referrers.length !== footnoteBoxes.length) {
                // Apparently not all footnote boxes have been drawn. Abort for now.
                return
            }
            if (that.mod.editor.mod.citations.citationType==='note') {
                /* Citations are also in footnotes, so both citation footnotes
                 * and editor footnotes have to be placed. They should be placed
                 * in the order the markers appear in the content, even though
                 * editor footnotes and citations footnotes are separated in the DOM.
                */
                let citationFootnotes = document.querySelectorAll('#citation-footnote-box-container .footnote-citation'),
                editorFootnoteIndex = 0, citationFootnoteIndex = 0, totalEditorOffset = totalOffset,
                totalCitationOffset = totalOffset
                that.mod.editor.pm.doc.descendants(function(node, pos){
                    if (node.isInline && (node.type.name === 'footnote' || node.type.name === 'citation')) {
                        let topMargin = 10
                        if (node.type.name === 'footnote') {
                            let footnoteBox = footnoteBoxes[editorFootnoteIndex],
                                selector = '.footnote-container:nth-of-type('+(editorFootnoteIndex+1)+')',
                                footnoteBoxCoords = footnoteBox.getBoundingClientRect(),
                                footnoteBoxHeight = footnoteBoxCoords.height,
                                referrerTop = that.mod.editor.pm.coordsAtPos(pos).top
                            editorFootnoteIndex++
                            if (referrerTop > totalEditorOffset || totalEditorOffset < (totalCitationOffset + topMargin)) {
                                topMargin = parseInt(Math.max(referrerTop - totalEditorOffset, totalCitationOffset - totalEditorOffset + topMargin))
                                footnotePlacementStyle += selector + ' {margin-top: ' + topMargin + 'px;}\n'
                            }
                            totalEditorOffset += footnoteBoxHeight + topMargin
                        } else {
                            if (citationFootnotes.length > citationFootnoteIndex) {
                                let footnoteBox = citationFootnotes[citationFootnoteIndex],
                                    selector = '.footnote-citation:nth-of-type('+(citationFootnoteIndex+1)+')',
                                    footnoteBoxCoords = footnoteBox.getBoundingClientRect(),
                                    footnoteBoxHeight = footnoteBoxCoords.height,
                                    referrerTop = that.mod.editor.pm.coordsAtPos(pos).top
                                citationFootnoteIndex++
                                if (referrerTop > totalCitationOffset || totalCitationOffset < (totalEditorOffset + topMargin)) {
                                    topMargin = parseInt(Math.max(referrerTop - totalCitationOffset, totalEditorOffset - totalCitationOffset + topMargin))
                                    footnotePlacementStyle += selector + ' {margin-top: ' + topMargin + 'px;}\n'
                                }
                                totalCitationOffset += footnoteBoxHeight + topMargin
                            }
                        }
                    }
                })

            } else {
                /* Only editor footnotes (no citation footnotes) need to be layouted.
                 * We use the existing footnote markers referrers to find the
                 * placement.
                 */
                referrers.forEach(function(referrer, index) {
                    let footnoteBox = footnoteBoxes[index]

                    let footnoteBoxCoords = footnoteBox.getBoundingClientRect(),
                      footnoteBoxHeight = footnoteBoxCoords.height,
                      referrerTop = that.mod.editor.pm.coordsAtPos(referrer.from).top,
                      topMargin = 10

                    if (referrerTop > totalOffset) {
                        topMargin = parseInt(referrerTop - totalOffset)
                        footnotePlacementStyle += '.footnote-container:nth-of-type('+(index+1)+') {margin-top: ' + topMargin + 'px;}\n'
                    }
                    totalOffset += footnoteBoxHeight + topMargin
                })
            }


            return function () {
                //DOM write phase
                if (document.getElementById('footnote-placement-style').innerHTML != footnotePlacementStyle) {
                    document.getElementById('footnote-placement-style').innerHTML = footnotePlacementStyle
                }
            }

        }
    }

}

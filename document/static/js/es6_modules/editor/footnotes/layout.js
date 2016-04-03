import {UpdateScheduler, scheduleDOMUpdate} from "prosemirror/dist/ui/update"

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
        let that = this
        new UpdateScheduler(this.mod.editor.pm, "change setDoc", () => {return that.updateDOM()})
        new UpdateScheduler(this.mod.fnPm, "change setDoc", () => {return that.updateDOM()})
    }

    layoutFootnotes() {
        let that = this
        scheduleDOMUpdate(this.mod.editor.pm, () => {return that.updateDOM()})
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
            return function () {
                //DOM write phase
                if (document.getElementById('footnote-placement-style').innerHTML != footnotePlacementStyle) {
                    document.getElementById('footnote-placement-style').innerHTML = footnotePlacementStyle
                }
            }

        }
    }

}

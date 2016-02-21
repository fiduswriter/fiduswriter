

import {fromHTML} from "prosemirror/dist/format"
import {fidusFnSchema} from "../schema"

/* Functions related to layouting of footnotes */
export class ModFootnoteLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents () {
      let that = this
      this.mod.pm.on('documentUpdated', function(){that.renderFootnotes()})
      this.mod.pm.on('transform', function(transform, object){
        if (that.mod.changes.updating) {
            return false;
        }
        console.log('update 1')
        console.log('transform')
        if (transform.steps.some(function(step) {
                return step.type === "replace"
            })) {
            console.log('rerendering footnotes')
            that.renderFootnotes()
        }
      })

    }

    findFootnotes(rootNode) {
        var footnotes = []

        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                footnotes.push(inlineNode)
            }
        })

        return footnotes
    }

    sameArrayContents(arrayOne, arrayTwo) {
        if (arrayOne.length != arrayTwo.length) {
            return false
        }
        return arrayOne.every(function(element, index) {
            return element === arrayTwo[index]
        })
    }

    renderFootnotes() {
        let currentFootnotes = this.findFootnotes(this.mod.pm.doc)
        if (this.sameArrayContents(currentFootnotes, this.mod.changes.lastFootnotes)) {
            return true
        }
        let footnotesHTML = ''
        console.log('redrawing footnotes')
        currentFootnotes.forEach(footnote => {
            footnotesHTML += "<div class='footnote-container'>" + footnote.attrs.contents + "</div>"
        })
        console.log(footnotesHTML)
        this.mod.fnPm.setOption("collab", null)
        this.mod.fnPm.setContent(fromHTML(fidusFnSchema, footnotesHTML, {preserveWhitespace: true}))
        this.mod.fnPm.setOption("collab", {version: 0})
        this.mod.changes.bindEvents()
        this.mod.changes.lastFootnotes = currentFootnotes
    }

}

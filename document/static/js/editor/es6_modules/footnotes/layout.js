
import {fromHTML} from "prosemirror/dist/format"
import {Pos} from "prosemirror/dist/model"

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
            return false
        }
        let ranges = that.replacedRanges(transform)
        let newFootnotes = []
        ranges.forEach(function(range) {
            newFootnotes = newFootnotes.concat(that.findFootnotes(that.mod.pm.doc, range.from, range.to))
        })
        if (newFootnotes.length > 0) {
            that.renderFootnotes()
        }

        /*if (transform.steps.some(function(step) {
                return step.type === "replace"
            })) {
            console.log('rerendering footnotes')
            that.renderFootnotes()
        }*/
      })

    }

    replacedRanges(transform) {
        let ranges = []
        for (let i = 0; i < transform.steps.length; i++) {
            let step = transform.steps[i], map = transform.maps[i]
            if (step.type == "replace") {
                // Could write a more complicated algorithm to insert it in
                // sorted order and join with overlapping ranges here. That way,
                // you wouldn't have to worry about scanning nodes multiple
                // times.
                ranges.push({from: step.from, to: step.to})
            }
            for (let j = 0; j < ranges.length; j++) {
                let range = ranges[j]
                range.from = map.map(range.from, -1).pos
                range.to = map.map(range.from, 1).pos
            }
        }
        return ranges
    }

    findFootnotes(rootNode, fromPos, toPos) {
        let footnotes = [], that = this

        rootNode.inlineNodesBetween(fromPos, toPos, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                footnotes.push({
                  node: inlineNode,
                  range: that.mod.pm.markRange(new Pos(path, start), new Pos(path, end))
                })


            }
        })

        return footnotes
    }

    sameFootnotes(arrayOne, arrayTwo) {
        if (arrayOne.length != arrayTwo.length) {
            return false
        }
        return arrayOne.every(function(element, index) {
            return element.node === arrayTwo[index].node
        })
    }

    renderFootnotes() {
        let currentFootnotes = this.findFootnotes(this.mod.pm.doc)
        if (this.sameFootnotes(currentFootnotes, this.mod.footnotes)) {
            return true
        }
        let footnotesHTML = ''
        console.log('redrawing footnotes')
        currentFootnotes.forEach(footnote => {
            footnotesHTML += "<div class='footnote-container'>" + footnote.node.attrs.contents + "</div>"
        })
        console.log(footnotesHTML)
        this.mod.fnPm.setOption("collab", null)
        this.mod.fnPm.setContent(fromHTML(fidusFnSchema, footnotesHTML, {preserveWhitespace: true}))
        this.mod.fnPm.setOption("collab", {version: 0})
        this.mod.changes.bindEvents()
        this.mod.footnotes = currentFootnotes
    }

}

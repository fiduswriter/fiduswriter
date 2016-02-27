
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
      this.mod.pm.on('documentUpdated', function(){that.renderAllFootnotes()})
      this.mod.pm.on('transform', function(transform, object){that.scanForFootnotes(transform)})

    }

    scanForFootnotes(transform) {
        let that = this
        if (this.mod.changes.updating) {
            return false
        }
        let ranges = this.replacedRanges(transform)
        ranges.forEach(function(range) {
            let newFootnotes = that.findFootnotes(range.from, range.to)
            if (newFootnotes.length > 0) {
                let firstFootNoteStart = newFootnotes[0].range.from
                let index = 0
                while(that.mod.footnotes.length > index && firstFootNoteStart.cmp(that.mod.footnotes[index].range.from) > 0) {
                    index++
                }
                newFootnotes.forEach(function(footnote){
                    that.mod.footnotes.splice(index, 0, footnote)
                    that.renderFootnote(footnote.node.attrs.contents, index)
                    index++
                })
            }
        })

    }

    replacedRanges(transform) {
        let ranges = []
        for (let i = 0; i < transform.steps.length; i++) {
            let step = transform.steps[i], map = transform.maps[i]
            if (step.type == "replace") {
                let index = 0

                while(index < (ranges.length -1) && step.from.cmp(ranges[index].from) < 0) {
                    index++
                }
                if (ranges.length === 0) {
                    ranges = [{from: step.from, to: step.to}]
                } else {
                    if (step.from.cmp(ranges[index].from) === 0) {
                        if (step.to.cmp(ranges[index].to) > 0) {
                            // This range has an endpoint further down than the
                            // range that was found previously.
                            // We replace the old range with the newly found
                            // range.
                            ranges[index] = {from: step.from, to: step.to}
                        }
                    } else {
                        if (step.to.cmp(ranges[index].from) > -1) {
                            ranges[index] = {from: step.from, to: ranges[index].to}
                        } else {
                            ranges.splice(index, 0, {from: step.from, to: step.to})
                        }
                    }
                }
            }
            for (let j = 0; j < ranges.length; j++) {
                let range = ranges[j]
                range.from = map.map(range.from, -1).pos
                range.to = map.map(range.from, 1).pos
            }
        }
        return ranges
    }

    removeFootnote(footnote) {
        if (this.mod.changes.updating) {
            return false
        }
        let index = 0
        while(footnote != this.mod.footnotes[index] && this.mod.footnotes.length > index) {
          index++
        }
        this.mod.footnotes.splice(index, 1)
        this.mod.fnPm.tr.delete(new Pos([], index), new Pos([], index + 1)).apply()
    }

    findFootnotes(fromPos, toPos) {
        let footnotes = [], that = this

        this.mod.pm.doc.inlineNodesBetween(fromPos, toPos, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                let footnote = {
                  node: inlineNode,
                  range: that.mod.pm.markRange(new Pos(path, start), new Pos(path, end))
                }
                footnote.range.on('removed', function(){that.removeFootnote(footnote)})
                footnotes.push(footnote)


            }
        })

        return footnotes
    }

    // Checks if the footnotes as we have them in the list of footnotes
    // corresponds to the footnotes as they can be found in the document.
    checkFootnotes() {
        let count = 0, passed = true, that = this
        this.mod.pm.doc.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name !== 'footnote') {
                return
            }
            if (that.mod.footnotes.length <= count) {
                passed = false
            } else {
                let startPos = new Pos(path, start)
                if (startPos.cmp(that.mod.footnotes[count].range.from) !== 0) {
                    passed = false
                }
                let endPos = new Pos(path, end)
                if (endPos.cmp(that.mod.footnotes[count].range.to) !== 0) {
                    passed = false
                }
                if (that.mod.footnotes[count].node.attrs.contents !== inlineNode.attrs.contents) {
                    passed = false
                }
            }
            count++
        })
        if (count !== that.mod.footnotes.length) {
            passed = false
        }
        return passed
    }

    renderFootnote(contents, index = 0) {
        let footnoteHTML = "<div class='footnote-container'>" + contents + "</div>"
        let node = fromHTML(fidusFnSchema, footnoteHTML, {preserveWhitespace: true}).firstChild
        this.mod.fnPm.tr.insert(new Pos([], index), node).apply()
    }

    renderAllFootnotes() {
        if (this.checkFootnotes()) {
            return false
        }
        let footnotes = this.findFootnotes()

        this.mod.footnotes = footnotes
        this.mod.fnPm.setOption("collab", null)
        console.log('redrawing all footnotes')
        this.mod.fnPm.setContent('','html')
        this.mod.footnotes.forEach((footnote, index) => {
            this.renderFootnote(footnote.node.attrs.contents, index)
        })
        this.mod.fnPm.setOption("collab", {version: 0})
        this.mod.changes.bindEvents()
    }

}

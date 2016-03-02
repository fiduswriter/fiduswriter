import {Pos} from "prosemirror/dist/model"
import {fromHTML, toHTML} from "prosemirror/dist/format"
import {fidusFnSchema} from "../schema"


/* Functions related to footnote markers in the main editor */
export class ModFootnoteMarkers {
    constructor(mod) {
        mod.markers = this
        this.mod = mod

        this.updating = false
        this.bindEvents()
    }

    bindEvents() {
        let that = this
        this.mod.pm.on('documentUpdated', function() {
            that.mod.editor.renderAllFootnotes()
        })
        this.mod.pm.on('transform', function(transform, object) {
            that.scanForFootnoteMarkers(transform, true)
        })
        this.mod.pm.on('receivedTransform', function(transform, object) {
            that.scanForFootnoteMarkers(transform, false)
        })
    }

    scanForFootnoteMarkers(transform, renderFootnote) {
        let that = this
        if (this.updating) {
            return false
        }
        let ranges = this.getAddedRanges(transform)
        ranges.forEach(function(range) {
            let newFootnotes = that.findFootnoteMarkers(range.from, range.to)
            if (newFootnotes.length > 0) {
                let firstFootNoteStart = newFootnotes[0].from
                let index = 0
                while (that.mod.footnotes.length > index && firstFootNoteStart.cmp(that.mod.footnotes[index].from) > 0) {
                    index++
                }
                newFootnotes.forEach(function(footnote) {
                    that.mod.footnotes.splice(index, 0, footnote)
                    if (renderFootnote) {
                        let node = that.mod.pm.doc.nodeAfter(footnote.from)
                        that.mod.editor.renderFootnote(node.attrs.contents, index)
                    }
                    index++
                })
            }
        })

    }

    getAddedRanges(transform) {
        let ranges = []
        for (let i = 0; i < transform.steps.length; i++) {
            let step = transform.steps[i],
                map = transform.maps[i]
            if (step.type == "replace") {
                let index = 0

                while (index < (ranges.length - 1) && step.from.cmp(ranges[index].from) < 0) {
                    index++
                }
                if (ranges.length === 0) {
                    ranges = [{
                        from: step.from,
                        to: step.to
                    }]
                } else {
                    if (step.from.cmp(ranges[index].from) === 0) {
                        if (step.to.cmp(ranges[index].to) > 0) {
                            // This range has an endpoint further down than the
                            // range that was found previously.
                            // We replace the old range with the newly found
                            // range.
                            ranges[index] = {
                                from: step.from,
                                to: step.to
                            }
                        }
                    } else {
                        if (step.to.cmp(ranges[index].from) > -1) {
                            ranges[index] = {
                                from: step.from,
                                to: ranges[index].to
                            }
                        } else {
                            ranges.splice(index, 0, {
                                from: step.from,
                                to: step.to
                            })
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



    findFootnoteMarkers(fromPos, toPos) {
        let footnoteMarkers = [],
            that = this

        this.mod.pm.doc.inlineNodesBetween(fromPos, toPos, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                let footnoteMarker = that.mod.pm.markRange(new Pos(path, start), new Pos(path, end))
                footnoteMarker.on('removed', function() {
                    that.mod.editor.removeFootnote(footnoteMarker)
                })
                footnoteMarkers.push(footnoteMarker)


            }
        })
        return footnoteMarkers
    }

    // Checks if the footnotes as we have them in the list of footnotes
    // corresponds to the footnotes as they can be found in the document.
    checkFootnoteMarkers() {
        let count = 0,
            passed = true,
            that = this
        this.mod.pm.doc.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name !== 'footnote') {
                return
            }
            if (that.mod.footnotes.length <= count) {
                passed = false
            } else {
                let startPos = new Pos(path, start)
                if (startPos.cmp(that.mod.footnotes[count].from) !== 0) {
                    passed = false
                }
                let endPos = new Pos(path, end)
                if (endPos.cmp(that.mod.footnotes[count].to) !== 0) {
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

    updateFootnoteMarker(index) {
        this.updating = true
        let footnoteContents = toHTML(this.mod.fnPm.doc.child(index))
        let footnote = this.mod.footnotes[index]
        let node = this.mod.pm.doc.nodeAfter(footnote.from)
        this.mod.pm.tr.setNodeType(footnote.from, node.type, {
            contents: footnoteContents
        }).apply()
        this.updating = false
    }
}

import {toHTML} from "prosemirror/dist/format"

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
        this.mod.editor.pm.on('documentUpdated', function() {
            that.mod.fnEditor.renderAllFootnotes()
        })
        this.mod.editor.pm.on('transform', function(transform, object) {
            that.scanForFootnoteMarkers(transform, true)
        })
        this.mod.editor.pm.mod.collab.on('collabTransform', function(transform, object) {
            that.remoteScanForFootnoteMarkers(transform)
        })
    }

    remoteScanForFootnoteMarkers(transform) {
        // We add unconfirmed local steps to the remote steps to make sure we map the ranges to current ranges.
        let unconfirmedMaps = this.mod.editor.pm.mod.collab.unconfirmedMaps
        let unconfirmedSteps = this.mod.editor.pm.mod.collab.unconfirmedSteps
        let doc = this.mod.editor.pm.mod.versionDoc
        maps = transform.maps.concat(unconfirmedMaps)
        unconfirmedSteps.forEach(function(step) {
            // We add pseudo steps for all the unconfirmed steps so that the
            // unconfirmed maps will be applied when handling the transform
            transform.steps.push({
                type: 'unconfirmed'
            })
            // We add real docs
            let result = step.apply(doc)
            doc = result.doc
            transform.docs.push(doc)
        })
        this.scanForFootnoteMarkers(transform, false)
    }

    scanForFootnoteMarkers(transform, renderFootnote) {
        /* Look through the ranges added through a transform for the presence of one or more footnote markers */
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
                while (that.mod.footnotes.length > index && firstFootNoteStart > that.mod.footnotes[index].from) {
                    index++
                }
                newFootnotes.forEach(function(footnote) {
                    that.mod.footnotes.splice(index, 0, footnote)
                    if (renderFootnote) {
                        let node = that.mod.editor.pm.doc.nodeAt(footnote.from)
                        that.mod.fnEditor.renderFootnote(node.attrs.contents, index)
                    }
                    index++
                })
            }
        })

    }

    getAddedRanges(transform) {
        /* find ranges of the current document that have been added by means of a transformation. */
        let ranges = []
        for (let i = 0; i < transform.steps.length; i++) {
            let step = transform.steps[i],
                map = transform.maps[i]
            if (step.type == "replace") {
                let index = 0

                while (index < (ranges.length - 1) && step.from < ranges[index].from) {
                    index++
                }
                if (ranges.length === 0) {
                    ranges = [{
                        from: step.from,
                        to: step.to
                    }]
                } else {
                    if (step.from === ranges[index].from) {
                        if (step.to > ranges[index].to) {
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
                        if (step.to >= ranges[index].from) {
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
                range.from = map.map(range.from, -1)
                range.to = map.map(range.from, 1)
            }
        }
        return ranges
    }



    findFootnoteMarkers(fromPos = 0, toPos = this.mod.editor.pm.doc.content.size) {
        let footnoteMarkers = [],
            that = this
        this.mod.editor.pm.doc.nodesBetween(fromPos, toPos, function(node, pos, parent) {
            if (!node.isInline) {
                return
            }
            if (node.type.name === 'footnote') {
                let startPos = pos
                let endPos = pos + node.nodeSize
                let footnoteMarker = that.mod.editor.pm.markRange(startPos, endPos)
                footnoteMarker.on('removed', function() {
                    that.mod.fnEditor.removeFootnote(footnoteMarker)
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
        this.mod.editor.pm.doc.descendants(function(node, pos, parent) {

            if (!node.isInline || node.type.name !== 'footnote') {
                return
            }
            if (that.mod.footnotes.length <= count) {
                passed = false
            } else {
                let startPos = pos
                if (startPos !== that.mod.footnotes[count].from) {
                    passed = false
                }
                let endPos = pos + node.nodeSize
                if (endPos !== that.mod.footnotes[count].to) {
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
        let node = this.mod.editor.pm.doc.nodeAt(footnote.from)
        this.mod.editor.pm.tr.setNodeType(footnote.from, node.type, {
            contents: footnoteContents
        }).apply()
        this.updating = false
    }
}

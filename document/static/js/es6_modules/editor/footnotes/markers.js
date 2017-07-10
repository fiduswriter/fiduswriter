import {sendableSteps} from "prosemirror-collab"

/* Functions related to footnote markers in the main editor */
export class ModFootnoteMarkers {
    constructor(mod) {
        mod.markers = this
        this.mod = mod

        this.updating = false
        //this.bindEvents()
    }


    scanForFootnoteMarkers(transaction, remote) {
        /* Look through the ranges added through a transaction for the presence of
         * one or more footnote markers.
        */
        /*if (remote) {
            // We add unconfirmed local steps to the remote steps to make sure we map
            // the ranges to current ranges.
            let toSend = sendableSteps(this.mod.editor.view.state)

            if (!toSend) {
                return
            }

            let unconfirmedMaps = toSend.maps
            let unconfirmedSteps = toSend.steps
            let doc = this.mod.editor.confirmedDoc
            transaction.mapping.maps = transaction.mapping.maps.concat(unconfirmedMaps)
            unconfirmedSteps.forEach(step => {
                // We add pseudo steps for all the unconfirmed steps so that the
                // unconfirmed maps will be applied when handling the transaction
                transaction.steps.push({
                    type: 'unconfirmed'
                })
                // We add real docs
                let result = step.apply(doc)
                doc = result.doc
                transaction.docs.push(doc)
            })
        }*/

        if (this.updating) {
            return false
        }
        let ranges = this.getAddedRanges(transaction)
        ranges.forEach(range => {
            let newFootnotes = this.findFootnoteMarkers(range.from, range.to)
            if (newFootnotes.length > 0) {
                let firstFootNoteStart = newFootnotes[0].from
                let index = 0
                while (this.mod.footnotes.length > index &&
                    firstFootNoteStart > this.mod.footnotes[index].from) {
                    index++
                }
                newFootnotes.forEach(footnote => {
                    this.mod.footnotes.splice(index, 0, footnote)
                    if (!remote) {
                        let node = this.mod.editor.view.state.doc.nodeAt(footnote.from)
                        this.mod.fnEditor.renderFootnote(node.attrs.footnote, index)
                    }
                    index++
                })
            }
        })

    }

    getAddedRanges(transaction) {
        /* find ranges of the current document that have been added by means of
         * a transaction.
         */
        let ranges = []
        for (let i = 0; i < transaction.steps.length; i++) {
            let step = transaction.steps[i],
                map = transaction.mapping.maps[i]
            if (step.jsonID === "replace" || step.jsonID === "replaceWrap") {
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



    findFootnoteMarkers(fromPos = 0, toPos = this.mod.editor.view.state.doc.content.size) {
        let footnoteMarkers = []
        this.mod.editor.view.state.doc.nodesBetween(fromPos, toPos, (node, pos, parent) => {
            if (!node.isInline) {
                return
            }
            if (node.type.name === 'footnote') {
                let from = pos
                let to = pos + node.nodeSize
                let footnoteMarker = {from, to}
                /*let footnoteMarker = this.mod.editor.pm.markRange(startPos, endPos, {
                    onRemove: () => {
                        this.mod.fnEditor.removeFootnote(footnoteMarker)
                    }
                })*/
                footnoteMarkers.push(footnoteMarker)

            }
        })
        return footnoteMarkers
    }

    // Checks if the footnotes as we have them in the list of footnotes
    // corresponds to the footnotes as they can be found in the document.
    checkFootnoteMarkers() {
        let count = 0,
            passed = true
        this.mod.editor.view.state.doc.descendants((node, pos, parent) => {

            if (!node.isInline || node.type.name !== 'footnote') {
                return
            }

            if (this.mod.footnotes.length <= count) {
                passed = false
            } else {
                let startPos = pos
                if (startPos !== this.mod.footnotes[count].from) {
                    passed = false
                }
                let endPos = pos + node.nodeSize
                if (endPos !== this.mod.footnotes[count].to) {
                    passed = false
                }
            }
            count++
        })

        if (count !== this.mod.footnotes.length) {
            passed = false
        }
        return passed
    }


    updateFootnoteMarker(index) {
        this.updating = true
        let fnContents = this.mod.fnView.state.doc.child(index).toJSON().content
        let footnote = this.mod.footnotes[index]
        if (footnote) {
            let node = this.mod.editor.view.state.doc.nodeAt(footnote.from)
            let transaction = this.mod.editor.view.state.tr.setNodeType(footnote.from, node.type, {
                footnote: fnContents
            })
            this.mod.editor.view.dispatch(transaction)
        }
        this.updating = false
    }

    // Reset the list of footnotes.
    removeAllMarkers() {
        this.mod.footnotes.forEach(footnote => {footnote.remove()})
    }
}

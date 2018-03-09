import {Plugin, PluginKey} from "prosemirror-state"
import {sendableSteps} from "prosemirror-collab"

const key = new PluginKey('footnoteMarkers')

export let findFootnoteMarkers = function(fromPos, toPos, doc) {
    let footnoteMarkers = []
    doc.nodesBetween(fromPos, toPos, (node, pos, parent) => {
        if (!node.isInline) {
            return
        }
        if (node.type.name === 'footnote') {
            let from = pos
            let to = pos + node.nodeSize
            let footnoteMarker = {from, to}
            footnoteMarkers.push(footnoteMarker)
        }
    })
    return footnoteMarkers
}


let getAddedRanges = function(transaction) {
    /* find ranges of the current document that have been added by means of
     * a transaction.
     */
    let ranges = []
    transaction.steps.forEach((step, index) => {
        if (step.jsonID === "replace" || step.jsonID === "replaceWrap") {
            ranges.push({from: step.from, to: step.to})
        }
        let map = transaction.mapping.maps[index]
        ranges = ranges.map(range => ({from: map.map(range.from, -1), to: map.map(range.to, 1)}))
    })

    let nonOverlappingRanges = []

    ranges.forEach(range => {
        let addedRange = false
        nonOverlappingRanges.forEach(noRange => {
            if (!addedRange && range.from <= noRange.from && range.to >= noRange.from) {
                noRange.from = range.from
                noRange.to = noRange.to > range.to ? noRange.to : range.to
                addedRange = true
            } else if (!addedRange && range.from <= noRange.to && range.to >= noRange.to) {
                noRange.from = noRange.from < range.from ? noRange.from : range.from
                noRange.to = range.to
                addedRange = true
            }
        })
        if (!addedRange) {
            nonOverlappingRanges.push(range)
        }
    })

    return nonOverlappingRanges
}

export let getFootnoteMarkerContents = function(state) {
    let {
        fnMarkers
    } = key.getState(state)
    return fnMarkers.map(fnMarker => state.doc.nodeAt(fnMarker.from).attrs.footnote)
}

export let updateFootnoteMarker = function(state, index, content) {
    let {
        fnMarkers
    } = key.getState(state)

    let footnote = fnMarkers[index]
    let node = state.doc.nodeAt(footnote.from)
    if (node.attrs.footnote === content) {
        return
    }
    let transaction = state.tr.setNodeMarkup(footnote.from, node.type, {
        footnote: content
    })
    transaction.setMeta('fromFootnote', true)
    return transaction
}

export let getFootnoteMarkers = function(state) {
    let {
        fnMarkers
    } = key.getState(state)
    return fnMarkers
}

export let footnoteMarkersPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(state) {
                let fnMarkers = []
                state.doc.descendants((node, pos, parent) => {
                    if (node.type.name==='footnote') {
                        fnMarkers.push({
                            from: pos,
                            to: pos + node.nodeSize
                        })
                    }
                })

                return {
                    fnMarkers
                }
            },
            apply(tr, prev, oldState, state) {
                let meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update of a footnote marker,
                    // return values from meta instead of previous values
                    // to prevent deletion of decoration
                    return meta
                }

                let {
                    fnMarkers
                } = this.getState(oldState)

                if (!tr.steps.length) {
                    return {
                        fnMarkers
                    }
                }

                let remote = tr.getMeta('remote'),
                    fromFootnote = tr.getMeta('fromFootnote'),
                    ranges = getAddedRanges(tr), deletedFootnotesIndexes = []
                fnMarkers = fnMarkers.map(marker => ({
                    from: tr.mapping.map(marker.from, 1),
                    to: tr.mapping.map(marker.to, -1)
                })).filter((marker, index) => {
                    if (marker.from !== (marker.to - 1)) {
                        // Add in reverse order as highest numbers need to be deleted
                        // first so that index numbers of lower numbers continue
                        // to be valid when these are deleted. Only relevant when
                        // several footnotes are deleted simultaneously.
                        deletedFootnotesIndexes.unshift(index)
                        return false
                    }
                    return true
                })
                deletedFootnotesIndexes.forEach(index =>
                    options.editor.mod.footnotes.fnEditor.removeFootnote(index)
                )
                if (!fromFootnote) {
                    ranges.forEach(range => {
                        let newFootnotes = findFootnoteMarkers(range.from, range.to, tr.doc)
                        if (newFootnotes.length) {

                            let firstFn = newFootnotes[0]
                            let offset = fnMarkers.findIndex(marker => marker.from > firstFn.from)
                            if (offset < 0) {
                                offset = fnMarkers.length
                            }
                            if (remote) {
                                newFootnotes = newFootnotes.filter(
                                    // In case of remote trasnactions, we cannot mark them as coming from footnote, so we
                                    // will need to remove duplicates instead.
                                    newMarker =>
                                        fnMarkers.find(oldMarker => oldMarker.from === newMarker.from) ?
                                        false :
                                        true
                                )
                            } else {
                                newFootnotes.forEach((footnote, index) => {
                                    let fnContent = state.doc.nodeAt(footnote.from).attrs.footnote
                                    options.editor.mod.footnotes.fnEditor.renderFootnote(
                                        fnContent,
                                        offset + index
                                    )
                                })
                            }
                            fnMarkers = fnMarkers.concat(newFootnotes).sort((a,b) => a.from > b.from)
                        }
                    })
                }

                options.editor.mod.footnotes.layout.layoutFootnotes()
                return {
                    fnMarkers
                }
            }
        },
        view(editorView) {
            return {
                update: (view, prevState) => {
                    options.editor.mod.footnotes.layout.updateDOM()
                }
            }
        },
    })
}

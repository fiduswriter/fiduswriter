import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {sendableSteps} from "prosemirror-collab"

const footnoteMarkersKey = new PluginKey('footnoteMarkers')

let findFootnoteMarkers = function(fromPos, toPos, doc) {
    let footnoteMarkers = []
    doc.nodesBetween(fromPos, toPos, (node, pos, parent) => {
        if (!node.isInline) {
            return
        }
        if (node.type.name === 'footnote') {
            let from = pos
            let to = pos + node.nodeSize
            let footnoteMarker = Decoration.inline(from, to, {}, {id: `${Date.now()}-${from}`})
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
        decos
    } = footnoteMarkersKey.getState(state)
    return decos.find().map(fnMarker => state.doc.nodeAt(fnMarker.from).attrs.footnote)
}

export let updateFootnoteMarker = function(state, index, content) {
    let {
        decos
    } = footnoteMarkersKey.getState(state)

    let footnote = decos.find()[index]
    let node = state.doc.nodeAt(footnote.from)
    if (node.attrs.footnote === content) {
        return
    }
    let transaction = state.tr.setNodeType(footnote.from, node.type, {
        footnote: content
    })
    return transaction
}

export let getFootnoteMarkers = function(state) {
    let {
        decos
    } = footnoteMarkersKey.getState(state)
    return decos.find()
}

export let footnoteMarkersPlugin = function(options) {
    return new Plugin({
        key: footnoteMarkersKey,
        state: {
            init(state) {
                let decos = DecorationSet.empty,
                    newDecos = []
                state.doc.descendants((node, pos, parent) => {
                    if (node.type.name==='footnote') {
                        let from = pos
                        let to = pos + node.nodeSize
                        let deco = Decoration.inline(from, to, {}, {id: `${Date.now()}-${from}`})
                        newDecos.push(deco)
                    }
                })
                decos = decos.add(state.doc, newDecos)

                return {
                    decos
                }
            },
            apply(tr, prev, oldState, state) {
                let meta = tr.getMeta(footnoteMarkersKey)
                if (meta) {
                    // There has been an update of a footnote marker,
                    // return values from meta instead of previous values
                    // to prevent deletion of decoration
                    return meta
                }


                let remote = tr.getMeta('remote'),
                    {
                        decos
                    } = this.getState(oldState),
                    ranges = getAddedRanges(tr)
                decos = decos.map(tr.mapping, tr.doc, {onRemove: decoSpec => {
                    let index = decos.find().findIndex(deco => deco.spec === decoSpec)
                    options.editor.mod.footnotes.fnEditor.removeFootnote(index)
                }})

                ranges.forEach(range => {
                    let newFootnotes = findFootnoteMarkers(range.from, range.to, tr.doc)
                    if (newFootnotes.length) {
                        let firstFootNoteStart = newFootnotes[0].from
                        let offset = decos.find().findIndex(fn => fn.from > firstFootNoteStart)
                        newFootnotes.forEach((footnote, index) => {
                            if (!remote) {
                                let fnContent = state.doc.nodeAt(footnote.from).attrs.footnote
                                options.editor.mod.footnotes.fnEditor.renderFootnote(fnContent, offset + index)
                            }
                            index++
                        })
                        decos = decos.add(state.doc, newFootnotes)
                    }
                })

                options.editor.mod.footnotes.layout.layoutFootnotes()
                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
				let {
					decos
				} = this.getState(state)
				return decos
			}
        }
    })
}

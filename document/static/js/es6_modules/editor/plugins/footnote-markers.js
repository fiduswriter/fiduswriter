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
                let newDecos = decos.map(tr.mapping, tr.doc, {onRemove: decoSpec => {
                    let index = decos.find().findIndex(deco => deco.spec.id === decoSpec.id)
                    if (index < 0) {
                        return
                    }
                    options.footnotes.fnEditor.removeFootnote(index)
                }})
                decos = newDecos
                ranges.forEach(range => {
                    let newFootnotes = findFootnoteMarkers(range.from, range.to, tr.doc)
                    if (newFootnotes.length) {
                        let firstFootNoteStart = newFootnotes[0].from
                        let offset = decos.find().findIndex(fn => fn.from > firstFootNoteStart)
                        newFootnotes.forEach((footnote, index) => {
                            if (!remote) {
                                let fnContent = state.doc.nodeAt(footnote.from).attrs.footnote
                                options.footnotes.fnEditor.renderFootnote(fnContent, offset + index)
                            }
                            index++
                        })
                        decos = decos.add(state.doc, newFootnotes)
                    }
                })

                options.footnotes.layout.layoutFootnotes()
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

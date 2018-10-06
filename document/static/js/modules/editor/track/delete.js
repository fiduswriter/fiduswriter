import {ReplaceStep, ReplaceAroundStep, Transform, replaceStep} from "prosemirror-transform"
import {Slice} from "prosemirror-model"
import {Selection, TextSelection, EditorState} from "prosemirror-state"
import {liftListItem} from "prosemirror-schema-list"

export let deleteNode = function(tr, node, nodePos, map, accept) { // Delete a node either because a deletion has been accepted or an insertion rejected.
    let newNodePos = map.map(nodePos), delStep, trackType = accept ? 'deletion' : 'insertion'
    if (node.isTextblock) {
        let selectionBefore = Selection.findFrom(tr.doc.resolve(newNodePos), -1)
        if (selectionBefore instanceof TextSelection) {
            let start = selectionBefore.$anchor.pos,
                end = newNodePos + 1,
                allowMerge = true
            // Make sure there is no isolating nodes inbetween.
            tr.doc.nodesBetween(start, end, (node, pos) => {
                if (pos < start) {
                    return true
                }
                if (node.type.spec.isolating) {
                    allowMerge = false
                }
            })
            if (allowMerge) {
                delStep = replaceStep(
                    tr.doc,
                    start,
                    end
                )
            } else {
                let track = node.attrs.track.filter(track => track.type !== trackType)
                tr.setNodeMarkup(newNodePos, null, Object.assign({}, node.attrs, {track}), node.marks)
            }
        } else {
            // There is a block node right in front of it that cannot be removed. Give up. (table/figure/etc.)
            let track = node.attrs.track.filter(track => track.type !== trackType)
            tr.setNodeMarkup(newNodePos, null, Object.assign({}, node.attrs, {track}), node.marks)
        }
    } else if (node.isLeaf || node.type === tr.doc.type.schema.nodes['table']) {
        delStep = new ReplaceStep(
            newNodePos,
            map.map(nodePos + node.nodeSize),
            Slice.empty
        )
    } else if (node.type === tr.doc.type.schema.nodes['list_item']) {
        let state = EditorState.create({
            doc: tr.doc,
            selection: Selection.findFrom(tr.doc.resolve(newNodePos), 1)
        })
        liftListItem(node.type)(state, newTr => {
                newTr.steps.forEach(step => {
                    tr.step(step)
                    map.appendMap(step.getMap())
                })
            }
        )
    } else {
        let end = map.map(nodePos + node.nodeSize)
        delStep = new ReplaceAroundStep(
            newNodePos,
            end,
            newNodePos+1,
            end-1,
            Slice.empty,
            0,
            true
        )
    }
    if (delStep) {
        tr.step(delStep)
        let stepMap = delStep.getMap()
        map.appendMap(stepMap)
    }
}

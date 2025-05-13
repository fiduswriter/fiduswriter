import {GapCursor} from "prosemirror-gapcursor"
import {TextSelection} from "prosemirror-state"

export const nextSelection = (state, pos, dir) => {
    let newSelection
    let newPos = pos
    let $newPos

    while (!newSelection) {
        newPos += dir
        if (newPos === 0 || newPos === state.doc.nodeSize) {
            // Could not find any valid position
            break
        }
        $newPos = state.doc.resolve(newPos)
        if ($newPos.parent.inlineContent) {
            newSelection = new TextSelection($newPos)
        } else if (GapCursor.valid($newPos)) {
            newSelection = new GapCursor($newPos)
        }
    }

    return newSelection
}

export const submitTag = (tagInputView, view, getPos) => {
    const tagState = tagInputView.state
    const selectionTo = tagState.selection.to
    const tag =
        selectionTo > 1
            ? tagState.doc.textBetween(1, selectionTo)
            : tagState.doc.textContent
    if (tag.length) {
        const eState = view.state,
            startPos = getPos(),
            pos = startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
            node = eState.schema.nodes.tag.create({tag})
        view.dispatch(view.state.tr.insert(pos, node))
        tagInputView.dispatch(
            tagState.tr.delete(
                1,
                selectionTo > 1 ? selectionTo : tagState.doc.nodeSize - 3
            )
        )
    }
}

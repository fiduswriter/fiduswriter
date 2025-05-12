import {GapCursor} from "prosemirror-gapcursor"

export const findValidCaretPosition = (state, pos, dir) => {
    let selectionType
    let newPos = pos
    let $newPos
    while (!selectionType) {
        newPos += dir
        if (newPos === 0 || newPos === state.doc.nodeSize) {
            // Could not find any valid position
            break
        }
        $newPos = state.doc.resolve(newPos)
        if ($newPos.parent.inlineContent) {
            selectionType = "text"
        } else if (GapCursor.valid($newPos)) {
            selectionType = "gap"
        }
    }
    return {$newPos, selectionType}
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

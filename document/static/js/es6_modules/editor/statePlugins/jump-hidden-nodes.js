import {Plugin, PluginKey, TextSelection} from "prosemirror-state"

// A plugin that makes sure that the selecion is not put into a node that has been
// hidden.

let posHidden = function($pos) {
    let hidden = false
    for (let i=$pos.depth; i > 0; i--) {
        if ($pos.node(i).attrs.hidden) {
            hidden = true
        }
    }
    return hidden
}

const key = new PluginKey('jump-hidden-nodes')
export let jumpHiddenNodesPlugin = function(options) {

    return new Plugin({
        key,
        appendTransaction: (transactions, oldState, state) => {
            if (state.selection.from !== state.selection.to) {
                // Only applies to collapsed selection
                return
            }
            let selectionSet = transactions.find(tr => tr.selectionSet)

            if (selectionSet && posHidden(state.selection.$from)) {
                let dir = state.selection.from > oldState.selection.from ? 1 : -1,
                    newPos = state.selection.from,
                    $pos = state.doc.resolve(newPos)
                while (posHidden($pos) || !$pos.parent.inlineContent) {
                    newPos += dir
                    if (newPos === 0 || newPos === state.doc.nodeSize) {
                        // Could not find any valid position
                        return
                    }
                    $pos = state.doc.resolve(newPos)
                }
                return state.tr.setSelection(new TextSelection($pos, $pos))
            }
        }
    })
}

import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {GapCursor} from "prosemirror-gapcursor"

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
                    hidden = true,
                    validTextSelection = false,
                    validGapCursor = false,
                    $pos
                while (hidden || (!validGapCursor && !validTextSelection)) {
                    newPos += dir
                    if (newPos === 0 || newPos === state.doc.nodeSize) {
                        // Could not find any valid position
                        return
                    }
                    $pos = state.doc.resolve(newPos)
                    validTextSelection = $pos.parent.inlineContent
                    validGapCursor = GapCursor.valid($pos)
                    hidden = posHidden($pos)
                }
                let selection = validTextSelection ? new TextSelection($pos) : new GapCursor($pos)
                return state.tr.setSelection(selection)
            }
        }
    })
}

import {chainCommands, deleteSelection, joinBackward, selectNodeBackward} from "prosemirror-commands"
import {undo, redo} from "prosemirror-history"
const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)
let addInputType = (tr, inputType) => tr.setMeta('inputType', inputType)

/* Adjusted version of setBlockType that preserves attributes */
/* source https://github.com/ProseMirror/prosemirror-commands/blob/b9ceb06e340ffcb3e12cd214f58939e81c0b61af/src/commands.js#L414-L432 */
export function setBlockType(nodeType, attrs = {}) {
    return function(state, dispatch) {
        let {
            from,
            to
        } = state.selection
        let tr = state.tr
        state.doc.nodesBetween(from, to, (node, pos) => {
            if (!node.isTextblock || node.hasMarkup(nodeType, attrs)) return
            let applicable = false
            if (node.type == nodeType) {
                applicable = true
            } else {
                let $pos = state.doc.resolve(pos),
                    index = $pos.index()
                applicable = $pos.parent.canReplaceWith(index, index + 1, nodeType)
            }
            if (applicable) {
                tr.setBlockType(
                    pos,
                    pos + node.nodeSize,
                    nodeType,
                    Object.assign({}, node.attrs, attrs) // preserve existing attributes
                )
            }
        })
        if (!tr.steps.length) return false
        if (dispatch) dispatch(tr.scrollIntoView())
        return true
    }
}

export let buildEditorKeymap = schema => {
    let editorKeymap = {
        "Backspace": (state, dispatch, view) => backspace(state, tr => dispatch(addInputType(tr, 'deleteContentBackward')), view),
        "Mod-z": (state, dispatch, view) => undo(state, tr => dispatch(addInputType(tr, 'historyUndo')), view),
        "Shift-Mod-z": (state, dispatch, view) => redo(state, tr => dispatch(addInputType(tr, 'historyRedo')), view),
        "Shift-Ctrl-0": setBlockType(schema.nodes.paragraph),
        "Shift-Ctrl-\\": setBlockType(schema.nodes.code_block)
    }
    for (let i = 1; i <= 6; i++) {
        editorKeymap["Shift-Ctrl-" + i] = setBlockType(schema.nodes.heading, {level: i})
    }
    if (!mac) {
        editorKeymap["Mod-y"] = (state, dispatch, view) => redo(state, tr => dispatch(addInputType(tr, 'historyRedo')), view)
    }
    return editorKeymap
}

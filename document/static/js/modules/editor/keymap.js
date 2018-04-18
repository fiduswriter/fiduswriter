import {chainCommands, deleteSelection, joinBackward, selectNodeBackward} from "prosemirror-commands"
import {undo, redo} from "prosemirror-history"
const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)

let addInputType = (tr, inputType) => tr.setMeta('inputType', inputType)


export let editorKeymap = {
  "Backspace": (state, dispatch, view) => backspace(state, tr => dispatch(addInputType(tr, 'deleteContentBackward')), view),
  "Mod-z": (state, dispatch, view) => undo(state, tr => dispatch(addInputType(tr, 'historyUndo')), view),
  "Shift-Mod-z": (state, dispatch, view) => redo(state, tr => dispatch(addInputType(tr, 'historyRedo')), view)
}

if (!mac) {
    editorKeymap["Mod-y"] = (state, dispatch, view) => redo(state, tr => dispatch(addInputType(tr, 'historyRedo')), view)
}

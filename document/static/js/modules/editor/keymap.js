import {chainCommands, deleteSelection, joinBackward, selectNodeBackward} from "prosemirror-commands"
import {undo, redo} from "prosemirror-history"
const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform) : false

let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)

export let editorKeymap = {
  "Backspace": (state, dispatch, view) => backspace(state, tr => dispatch(tr.setMeta('backspace', true)), view),
  "Mod-z": (state, dispatch, view) => undo(state, tr => dispatch(tr.setMeta('undo', true)), view),
  "Shift-Mod-z": (state, dispatch, view) => redo(state, tr => dispatch(tr.setMeta('redo', true)), view)
}

if (!mac) {
    editorKeymap["Mod-y"] = (state, dispatch, view) => redo(state, tr => dispatch(tr.setMeta('redo', true)), view)
}

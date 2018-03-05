import {chainCommands, deleteSelection, joinBackward, selectNodeBackward} from "prosemirror-commands"

let backspace = chainCommands(deleteSelection, joinBackward, selectNodeBackward)

export let editorKeymap = {
  "Backspace": (state, dispatch, view) => backspace(state, tr => dispatch(tr.setMeta('backspace', true)), view)
}

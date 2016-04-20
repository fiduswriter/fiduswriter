import {ModCaretLayout} from "./layout"
import {ModCaretInteractions} from "./interactions"

export class ModCarets {
  constructor(editor) {
    editor.mod.carets = this
    this.editor = editor
    new ModCaretLayout(this)
    new ModCaretInteractions(this)
  }
}

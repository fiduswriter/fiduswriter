import {ModCollabCaretLayout} from "./layout"
import {ModCollabCaretInteractions} from "./interactions"

export class ModCollabCarets {
  constructor(mod) {
    mod.carets = this
    this.mod = mod
    new ModCollabCaretLayout(this)
    new ModCollabCaretInteractions(this)
  }
}

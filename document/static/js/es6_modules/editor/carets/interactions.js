/* Functions related to user interactions with carets */

import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"
import {Pos} from "prosemirror/dist/model"
export class ModCaretInteractions {
    constructor(mod) {
        mod.interactions = this
        this.mod = mod
    }

    // Create a new caret as the current user
    caretPosition() {
    let selection = this.mod.editor.pm.selection
    let selectionUser = {id: this.mod.editor.user.id, position:selection}
    let selectionJSON = JSON.stringify(selectionUser)
    return selectionJSON
    }
}

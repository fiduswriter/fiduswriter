/* Functions related to user interactions with carets */

export class ModCollabCaretInteractions {
    constructor(mod) {
        mod.interactions = this
        this.mod = mod
    }

    // Create a new caret as the current user
    caretPosition() {
        let selection = this.mod.mod.editor.pm.selection
        let selectionUser = {
            id: this.mod.mod.editor.user.id,
            sessionId: this.mod.mod.editor.docInfo.session_id,
            posFrom:selection.from,
            posTo:selection.to
        }
        return selectionUser
    }
}

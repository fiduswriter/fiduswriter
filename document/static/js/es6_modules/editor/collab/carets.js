export class ModCollabCarets {
    constructor(mod) {
        mod.carets = this
        this.mod = mod
        this.markedSelectionUser = {}
    }

    // Create a new caret as the current user
    caretPosition() {
        let selectionFrom = this.mod.editor.pm.selection.from
        let selectionTo = this.mod.editor.pm.selection.to

        if (selectionFrom===selectionTo) {
            /* Workaround to allow for an empty marked range.
             * See https://github.com/ProseMirror/prosemirror/issues/313
             */
            selectionTo += 0.1
        }
        let selectionUser = {
            id: this.mod.editor.user.id,
            sessionId: this.mod.editor.docInfo.session_id,
            posFrom: selectionFrom,
            posTo: selectionTo
        }
        return selectionUser
    }

    // Update the position of a collaborator's caret
    updateCaret(selectionUser){
        let colorId = this.mod.colorIds[selectionUser.id]
        let posFrom = selectionUser.posFrom
        let posTo = selectionUser.posTo

        // Delete an old marked range for the same session, if there is one.
        this.removeSelection(selectionUser.sessionId)

        // Map the positions through all still unconfirmed changes
        this.mod.editor.pm.mod.collab.unconfirmedMaps.forEach(function(map){
            posFrom = map.map(posFrom)
            posTo = map.map(posTo)
        })

        this.markedSelectionUser[selectionUser.sessionId] = this.mod.editor.pm.markRange(
            posFrom,
            posTo,
            {
                removeWhenEmpty: false,
                className: 'cursor-user-' + colorId
            }
        )
    }

    removeSelection(sessionId) {
        if (sessionId in this.markedSelectionUser) {
            this.mod.editor.pm.removeRange(this.markedSelectionUser[sessionId])
            delete this.markedSelectionUser[sessionId]
        }
    }
}

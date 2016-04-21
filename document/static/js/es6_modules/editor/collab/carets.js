export class ModCollabCarets {
    constructor(mod) {
        mod.carets = this
        this.mod = mod
        this.markedSelectionUser = {}
    }

    // Create a new caret as the current user
    caretPosition() {
        let selection = this.mod.editor.pm.selection
        let selectionUser = {
            id: this.mod.editor.user.id,
            sessionId: this.mod.editor.docInfo.session_id,
            posFrom:selection.from -1, // Teporary while ProseMirror is being fixed. Should be without "-1"
            posTo:selection.to
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

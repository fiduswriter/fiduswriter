export class ModCollabCarets {
    constructor(mod) {
        mod.carets = this
        this.mod = mod
        this.markedSelectionUser = {}
    }

    // Create a new caret as the current user
    caretPosition() {

        let selectionUser = {
            id: this.mod.editor.user.id,
            sessionId: this.mod.editor.docInfo.session_id,
            posFrom: this.mod.editor.pm.selection.from,
            posTo: this.mod.editor.pm.selection.to
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

        let className = 'cursor-user-' + colorId

        /* Workaround to allow for an empty marked range in some cases.
         * See https://github.com/ProseMirror/prosemirror/issues/313
         */
        if (posFrom===posTo) {
            let rp = this.mod.editor.pm.doc.resolve(posFrom)
            if (rp.nodeAfter) {
                posTo += 0.1
            } else if (rp.nodeBefore) {
                posFrom -= 1
                className = 'cursor-user-right-' + colorId
            } else {
                // The caret is likely in an empty paragraph.
                // TODO: Figure out what to do.
            }
        }

        this.markedSelectionUser[selectionUser.sessionId] = this.mod.editor.pm.markRange(
            posFrom,
            posTo,
            {
                removeWhenEmpty: true,
                className
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

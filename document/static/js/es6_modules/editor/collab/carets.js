export class ModCollabCarets {
    constructor(mod) {
        mod.carets = this
        this.mod = mod
        this.markedSelectionUser = {}
        this.init()
    }

    init() {

    }

    // Create a new caret as the current user
    caretPosition() {
        let selectionUser = {
            id: this.mod.editor.user.id,
            sessionId: this.mod.editor.docInfo.session_id,
            from: this.mod.editor.currentPm.selection.from,
            to: this.mod.editor.currentPm.selection.to,
            anchor: this.mod.editor.currentPm.selection.anchor ?
                this.mod.editor.currentPm.selection.anchor : this.mod.editor.currentPm.selection.from,
            // Whether the selection is in the footnote or the main editor
            pm: this.mod.editor.currentPm === this.mod.editor.pm ? 'pm' : 'fnPm'
        }
        return selectionUser
    }

    // Update the position of a collaborator's caret
    updateCaret(selectionUser){
        let colorId = this.mod.colorIds[selectionUser.id]
        let posFrom = selectionUser.from
        let posTo = selectionUser.to
        let pm = selectionUser.pm === 'pm' ? this.mod.editor.pm : this.mod.editor.mod.footnotes.fnPm

        // Delete an old marked range for the same session, if there is one.
        this.removeSelection(selectionUser.sessionId)

        // Map the positions through all still unconfirmed changes
        pm.mod.collab.unconfirmedMaps.forEach(function(map){
            posFrom = map.map(posFrom)
            posTo = map.map(posTo)
        })

        let className = 'cursor-user-' + colorId

        /* Workaround to allow for an empty marked range in some cases.
         * See https://github.com/ProseMirror/prosemirror/issues/313
         */
        if (posFrom===posTo) {
            let rp = pm.doc.resolve(posFrom)
            if (rp.nodeAfter) {
                posTo += 0.1
            } else if (rp.nodeBefore) {
                posFrom -= 1
                className = 'cursor-user-right-' + colorId
            } else {
                console.log('nowhere to put the caret')
                // The caret is likely in an empty paragraph.
                // TODO: Figure out what to do.
            }
        }

        this.markedSelectionUser[selectionUser.sessionId] = {
            pm,
            range: pm.markRange(
                posFrom,
                posTo,
                {
                    removeWhenEmpty: true,
                    className
                }
            )
        }
    }

    removeSelection(sessionId) {
        if (sessionId in this.markedSelectionUser) {
            let selectionUser = this.markedSelectionUser[sessionId]
            if (_.isFinite(selectionUser.range)) {
                this.mod.editor[selectionUser.pm].removeRange(selectionUser.range)
            }
            delete this.markedSelectionUser[sessionId]
        }
    }
}

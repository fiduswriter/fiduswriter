export class ModCollabCaretLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.markedSelectionUser = {}
    }

    updateCaret(positionUser){
        let colorId = this.mod.mod.editor.mod.collab.colorIds[positionUser.id]
        let posFrom = positionUser.posFrom
        let posTo = positionUser.posTo
        // Delete an old marked range for the same session, if there is one.
        if (positionUser.sessionId in this.markedSelectionUser) {
            this.mod.mod.editor.pm.removeRange(this.markedSelectionUser[positionUser.sessionId])
            delete this.markedSelectionUser[positionUser.sessionId]
        }
        // Map the positions through all still unconfirmed changes
        this.mod.mod.editor.pm.mod.collab.unconfirmedMaps.forEach(function(map){
            posFrom = map.map(posFrom)
            posTo = map.map(posTo)
        })

        this.markedSelectionUser[positionUser.sessionId] = this.mod.mod.editor.pm.markRange(
            posFrom,
            posTo,
            {
                removeWhenEmpty: false,
                className: 'cursor-user-' + colorId
            }
        )
    }
}

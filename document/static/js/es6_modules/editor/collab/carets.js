import {UpdateScheduler} from "prosemirror/dist/ui/update"

export class ModCollabCarets {
    constructor(mod) {
        mod.carets = this
        this.mod = mod
        this.markedSelectionUser = {}
        this.caretContainer = false
        this.caretPlacementStyle =-false
        this.setup()
        this.bindEvents()
    }

    setup() {
        // Add one elements to hold dynamic CSS info about carets
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `<style type="text/css" id="caret-placement-style"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
        this.caretPlacementStyle = document.getElementById('caret-placement-style')
        // Add one container element to hold carets
        this.caretContainer = document.createElement('div')
        this.caretContainer.id = 'caret-markers'
        document.getElementById('paper-editable').appendChild(this.caretContainer)
    }

    bindEvents() {
        let that = this
        new UpdateScheduler(this.mod.editor.pm, "change", () => {return that.updatePositionCSS()})
        new UpdateScheduler(this.mod.editor.mod.footnotes.fnPm, "change", () => {return that.updatePositionCSS()})
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
        let posAnchor = selectionUser.anchor
        let pm = selectionUser.pm === 'pm' ? this.mod.editor.pm : this.mod.editor.mod.footnotes.fnPm

        // Delete an old marked range for the same session, if there is one.
        this.removeSelection(selectionUser.sessionId)

        // Map the positions through all still unconfirmed changes
        pm.mod.collab.unconfirmedMaps.forEach(function(map){
            posFrom = map.map(posFrom)
            posTo = map.map(posTo)
            posAnchor = map.map(posAnchor)
        })

        let className = 'cursor-user-' + colorId

        let range = false

        if (posFrom !== posTo) {
            range = pm.markRange(
                posFrom,
                posTo,
                {
                    removeWhenEmpty: true,
                    className
                }
            )
        }

        let anchorRange = pm.markRange(
            posAnchor,
            posAnchor,
            {
                removeWhenEmpty: false
            }
        )


        let anchorNode = document.createElement('div')
        anchorNode.id = 'caret-' + selectionUser.sessionId
        anchorNode.classList.add('caret')
        anchorNode.classList.add(className)
        anchorNode.innerHTML = '<div class="caret-head"></div>'
        anchorNode.firstChild.classList.add(className)
        let tooltip = _.findWhere(this.mod.participants,{id:selectionUser.id}).name
        anchorNode.title = tooltip
        anchorNode.firstChild.title = tooltip
        this.caretContainer.appendChild(anchorNode)
        this.markedSelectionUser[selectionUser.sessionId] = {pm, range, anchorRange, anchorNode}
    }

    removeSelection(sessionId) {
        if (sessionId in this.markedSelectionUser) {
            let selectionUser = this.markedSelectionUser[sessionId]
            if (_.isFinite(selectionUser.range)) {
                this.mod.editor[selectionUser.pm].removeRange(selectionUser.range)
            }
            if (_.isFinite(selectionUser.anchorRange)) {
                this.mod.editor[selectionUser.pm].removeRange(selectionUser.anchorRange)
            }
            selectionUser.anchorNode.parentNode.removeChild(selectionUser.anchorNode)
            delete this.markedSelectionUser[sessionId]
        }
    }

    updatePositionCSS() {
        // 1st write phase
        let that = this

        return function () {
            // 1st read phase
            // This phase + next write pahse are used for footnote placement,
            // so we cannot find carets in the footnotes before the next read
            // phase
            return function () {
                // 2nd write phase
                return function () {
                    // 2nd read phase
                    let positionCSS = ''
                    for (let sessionId in that.markedSelectionUser) {
                        let selectionUser = that.markedSelectionUser[sessionId]
                        let coords = selectionUser.pm.coordsAtPos(selectionUser.anchorRange.from)
                        let offsets = that.caretContainer.getBoundingClientRect()
                        let height = coords.bottom - coords.top
                        let top = coords.top - offsets.top
                        let left = coords.left - offsets.left
                        positionCSS += `#caret-${sessionId} {top: ${top}px; left: ${left}px; height: ${height}px;}`
                    }
                    return function () {
                        // 3rd write phase
                        if (that.caretPlacementStyle.innerHTML !== positionCSS) {
                            that.caretPlacementStyle.innerHTML = positionCSS
                        }
                    }
                }
            }
        }
    }
}

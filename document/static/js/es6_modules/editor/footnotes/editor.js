import {Pos} from "prosemirror/dist/model"
import {fromHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import {fidusFnSchema, Footnote} from "../schema"

/* Functions related to the footnote editor instance */
export class ModFootnoteEditor {
    constructor(mod) {
        mod.fnEditor = this
        this.mod = mod
        this.rendering = false
        this.bindEvents()
    }

    bindEvents() {
        let that = this
        this.mod.fnPm.mod.collab.on("mustSend", function() {
            that.footnoteEdit()
        })

    }


    footnoteEdit() {
        if (this.rendering) {
            // We are currently adding or removing footnotes in the footnote editor
            // due to changes at the footnote marker level, so abort.
            return false
        }
        console.log('footnote update')
        let length = this.mod.fnPm.mod.collab.unconfirmedSteps.length
        let lastStep = this.mod.fnPm.mod.collab.unconfirmedSteps[length - 1]
        if (lastStep.from && lastStep.from.path && lastStep.from.path.length > 0) {
            // We find the number of the last footnote that was updated by
            // looking at the last step and seeing what path that change referred to.
            let updatedFootnote = lastStep.from.path[0]
            this.mod.markers.updateFootnoteMarker(updatedFootnote)
        } else {
            // TODO: Figure out if there are cases where this is really needed.
        }
    }

    applyDiffs(diffs) {
        this.mod.fnPm.mod.collab.receive(diffs.map(j => Step.fromJSON(fidusFnSchema, j)))
    }

    renderAllFootnotes() {
        if (this.mod.markers.checkFootnoteMarkers()) {
            return false
        }
        let that = this
        let footnotes = this.mod.markers.findFootnoteMarkers()

        this.mod.footnotes = footnotes
        this.mod.fnPm.setOption("collab", null)
        console.log('redrawing all footnotes')
        this.mod.fnPm.setContent('', 'html')
        this.mod.footnotes.forEach((footnote, index) => {
            let node = that.mod.editor.pm.doc.nodeAfter(footnote.from)
            that.renderFootnote(node.attrs.contents, index)
        })
        this.mod.fnPm.setOption("collab", {
            version: 0
        })
        this.bindEvents()
    }



    renderFootnote(contents, index = 0) {
        this.rendering = true
        let footnoteHTML = "<div class='footnote-container'>" + contents + "</div>"
        let node = fromHTML(fidusFnSchema, footnoteHTML, {
            preserveWhitespace: true
        }).firstChild
        this.mod.fnPm.tr.insert(new Pos([], index), node).apply()
        this.rendering = false
    }

    removeFootnote(footnote) {
        let index = 0
        while (footnote != this.mod.footnotes[index] && this.mod.footnotes.length > index) {
            index++
        }
        this.mod.footnotes.splice(index, 1)
        if (!this.mod.editor.mod.collab.docChanges.receiving) {
            this.rendering = true
            this.mod.fnPm.tr.delete(new Pos([], index), new Pos([], index + 1)).apply()
            this.rendering = false
        }
    }

}

import {fromHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"

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
        this.mod.fnPm.on("filterTransform", (transform) => {
            return that.onFilterTransform(transform)
        })

    }

    // filter transformations, disallowing all transformations going across document parts/footnotes.
    onFilterTransform(transform) {
        let prohibited = false

        if (this.mod.editor.docInfo.rights === "e" || this.mod.editor.docInfo.rights === "c") {
            prohibited = true
            return prohibited
        }

        if (transform.docs[0].childCount !== transform.doc.childCount) {
            prohibited = true
        }
        return prohibited
    }

    footnoteEdit() {
        // Handle an edit in the footnote editor.
        if (this.rendering) {
            // We are currently adding or removing footnotes in the footnote editor
            // due to changes at the footnote marker level, so abort.
            return false
        }
        console.log('footnote update')
        let length = this.mod.fnPm.mod.collab.unconfirmedSteps.length
        let lastStep = this.mod.fnPm.mod.collab.unconfirmedSteps[length - 1]
        if (lastStep.from) {
            // We find the number of the last footnote that was updated by
            // looking at the last step and seeing footnote number that change referred to.
            let updatedFootnote = this.mod.fnPm.doc.resolve(lastStep.from).index(0)
            this.mod.markers.updateFootnoteMarker(updatedFootnote)
        } else {
            // TODO: Figure out if there are cases where this is really needed.
        }
    }

    applyDiffs(diffs) {
        console.log('applying footnote diff')
        this.mod.fnPm.mod.collab.receive(diffs.map(j => Step.fromJSON(this.mod.schema, j)))
    }

    renderAllFootnotes() {
        console.log('renderAllFootnotes')
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
            let node = that.mod.editor.pm.doc.nodeAt(footnote.from)
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
        let node = fromHTML(this.mod.schema, footnoteHTML, {
            preserveWhitespace: true
        }).firstChild
        let pos = 0
        for (let i=0; i<index;i++) {
            pos += this.mod.fnPm.doc.child(i).nodeSize
        }
        this.mod.fnPm.tr.insert(pos, node).apply({filter:false})
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
            let startPos = 0
            for (let i=0;i<index;i++) {
                startPos += this.mod.fnPm.doc.child(i).nodeSize
            }
            let endPos = startPos + this.mod.fnPm.doc.child(index).nodeSize
            this.mod.fnPm.tr.delete(startPos, endPos).apply({filter:false})
            this.rendering = false
        }
    }

}

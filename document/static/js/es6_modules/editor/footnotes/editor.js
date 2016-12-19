import {parseDOM} from "prosemirror-old/dist/model/from_dom"
import {Step} from "prosemirror-old/dist/transform"
import {Paste} from "../paste/paste"
import {COMMENT_ONLY_ROLES} from "../editor"
import {collabEditing} from "prosemirror-old/dist/collab"
import {fnNodeToPmNode} from "../../schema/footnotes-convert"

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
        this.mod.fnPm.mod.collab.mustSend.add(function() {
            that.footnoteEdit()
        })
        this.mod.fnPm.on.filterTransform.add((transform) => {
            return that.onFilterTransform(transform)
        })
        this.mod.fnPm.on.transform.add((transform) => {
            return that.onTransform(transform)
        })
        this.mod.fnPm.on.transformPastedHTML.add((inHTML) => {
            let ph = new Paste(inHTML, "footnote")
            return ph.getOutput()
        })
    }

    // filter transformations, disallowing all transformations going across document parts/footnotes.
    onFilterTransform(transform) {
        let prohibited = false

        if (COMMENT_ONLY_ROLES.indexOf(this.mod.editor.docInfo.right) > -1) {
            prohibited = true
        }

        if (transform.docs[0].childCount !== transform.doc.childCount) {
            prohibited = true
        }
        return prohibited
    }

    // Find out if we need to recalculate the bibliography
    onTransform(transform, local) {
        let updateBibliography = false, that = this
            // Check what area is affected

        transform.steps.forEach(function(step, index) {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                if (step.from !== step.to) {
                    transform.docs[index].nodesBetween(
                        step.from,
                        step.to,
                        function(node, pos, parent) {
                            if (node.type.name === 'citation') {
                                // A citation was replaced
                                updateBibliography = true
                            }
                        }
                    )
                }
            }
        })

        if (updateBibliography) {
            // Recreate the bibliography on next flush.
            this.mod.editor.pm.scheduleDOMUpdate(
                () => {
                    return that.mod.editor.mod.citations.resetCitations()
                }
            )
        }

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
        if (lastStep.hasOwnProperty('from')) {
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
        let steps = diffs.map(j => Step.fromJSON(this.mod.schema, j))
        let client_ids = diffs.map(j => j.client_id)
        this.mod.fnPm.mod.collab.receive(steps, client_ids)
    }

    renderAllFootnotes() {
        console.log('renderAllFootnotes')
        if (this.mod.markers.checkFootnoteMarkers()) {
            return false
        }
        let that = this
        let footnotes = this.mod.markers.findFootnoteMarkers()

        this.mod.footnotes = footnotes
        this.mod.fnPm.setDoc(this.mod.fnPm.schema.nodeFromJSON({"type":"doc","content":[{"type": "footnote_end"}]}))
        this.mod.footnotes.forEach((footnote, index) => {
            let node = that.mod.editor.pm.doc.nodeAt(footnote.from)
            that.renderFootnote(node.attrs.footnote, index)
        })
        let collab = this.mod.fnPm.mod.collab
        collab.versionDoc = this.mod.fnPm.doc
        collab.unconfirmedSteps = []
        collab.unconfirmedMaps = []
        this.bindEvents()
    }

    renderFootnote(contents, index = 0) {
        this.rendering = true
        let node = fnNodeToPmNode(contents)
        let pos = 0
        for (let i=0; i<index;i++) {
            pos += this.mod.fnPm.doc.child(i).nodeSize
        }

        this.mod.fnPm.tr.insert(pos, node).apply({filter:false})
        // Most changes to the footnotes are followed by a change to the main editor,
        // so changes are sent to collaborators automatically. When footnotes are added/deleted,
        // the change is reversed, so we need to inform collabs manually.
        this.mod.editor.mod.collab.docChanges.sendToCollaborators()
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
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reverse, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
            this.rendering = false
        }
    }

}

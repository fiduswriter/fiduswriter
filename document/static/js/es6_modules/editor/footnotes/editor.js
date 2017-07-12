import {Step} from "prosemirror-transform"
import {sendableSteps, collab, receiveTransaction} from "prosemirror-collab"
import {buildKeymap} from "prosemirror-example-setup"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"

import {toolbarPlugin} from "../plugins/toolbar"
import {COMMENT_ONLY_ROLES} from ".."
import {fnNodeToPmNode} from "../../schema/footnotes-convert"

/* Functions related to the footnote editor instance */
export class ModFootnoteEditor {
    constructor(mod) {
        mod.fnEditor = this
        this.mod = mod
        this.rendering = false
    }

    // filter transactions, disallowing all transactions going across document parts/footnotes.
    onFilterTransaction(transaction) {
        let prohibited = false

        if (COMMENT_ONLY_ROLES.indexOf(this.mod.editor.docInfo.right) > -1) {
            prohibited = true
        }

        if (transaction.docs.length && transaction.docs[0].childCount !== transaction.doc.childCount) {
            prohibited = true
        }
        return prohibited
    }

    // Find out if we need to recalculate the bibliography
    onTransaction(transaction, local) {
        let updateBibliography = false
            // Check what area is affected

        transaction.steps.forEach((step, index) => {
            if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                if (step.from !== step.to) {
                    transaction.docs[index].nodesBetween(
                        step.from,
                        step.to,
                        (node, pos, parent) => {
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
            this.mod.editor.mod.citations.resetCitations()
        } else {
            this.mod.editor.mod.citations.layoutCitations()
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
        let toSend = sendableSteps(this.mod.fnView.state)
        if (toSend) {
            let length = toSend.steps.length
            let lastStep = toSend.steps[length - 1]
            if (lastStep.hasOwnProperty('from')) {
                // We find the number of the last footnote that was updated by
                // looking at the last step and seeing footnote number that change referred to.
                let updatedFootnote = this.mod.fnView.state.doc.resolve(lastStep.from).index(0)
                this.mod.markers.updateFootnoteMarker(updatedFootnote)
            } else {
                // TODO: Figure out if there are cases where this is really needed.
            }
        }
    }

    applyDiffs(diffs) {
        console.log('applying footnote diff')
        let steps = diffs.map(j => Step.fromJSON(this.modtransaction, j))
        let client_ids = diffs.map(j => j.client_id)
        this.mod.fnView.dispatch(
            receiveTransaction(
                this.mod.fnView.state,
                steps,
                steps.map(
                    step => step.client_id
                )
            )
        )
    }

    renderAllFootnotes() {
        if (this.mod.markers.checkFootnoteMarkers()) {
            return false
        }
        let footnotes = this.mod.markers.findFootnoteMarkers()

        this.mod.footnotes = footnotes

        let newState = EditorState.create({
            schema: this.mod.schema,
            doc: this.mod.schema.nodeFromJSON({"type":"doc","content":[{"type": "footnote_end"}]}),
            plugins: [
                history(),
                keymap(baseKeymap),
                keymap(buildKeymap(this.mod.schema)),
                collab(),
                toolbarPlugin({editor: this.mod.editor})
            ]
        })

        this.mod.fnView.updateState(newState)

        this.mod.footnotes.forEach((footnote, index) => {
            let node = this.mod.editor.view.state.doc.nodeAt(footnote.from)
            this.renderFootnote(node.attrs.footnote, index)
        })
        //this.bindEvents()
    }

    renderFootnote(contents, index = 0) {
        this.rendering = true
        let node = fnNodeToPmNode(contents)
        let pos = 0
        for (let i=0; i<index;i++) {
            pos += this.mod.fnView.state.doc.child(i).nodeSize
        }

        let transaction = this.mod.fnView.state.tr.insert(pos, node)

        transaction.setMeta('filterFree', true)

        this.mod.fnView.dispatch(transaction)
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
                startPos += this.mod.fnView.state.doc.child(i).nodeSize
            }
            let endPos = startPos + this.mod.fnView.state.doc.child(index).nodeSize
            let transaction = this.mod.fnView.state.tr.delete(startPos, endPos)
            transaction.setMeta('filterFree', true)
            this.mod.fnView.dispatch(transaction)
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reverse, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
            this.rendering = false
        }
    }

}

import {Step} from "prosemirror-transform"
import {collab, receiveTransaction, sendableSteps} from "prosemirror-collab"
import {buildKeymap} from "prosemirror-example-setup"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"

import {fnSchema} from "../../schema/footnotes"
import {
    pastePlugin,
    toolbarPlugin,
    collabCaretsPlugin,
    linksPlugin,
    getFootnoteMarkerContents,
    updateFootnoteMarker
} from "../statePlugins"
import {COMMENT_ONLY_ROLES} from ".."
import {fnNodeToPmNode} from "../../schema/footnotes-convert"

/* Functions related to the footnote editor instance */
export class ModFootnoteEditor {
    constructor(mod) {
        mod.fnEditor = this
        this.mod = mod
        this.rendering = false
        this.schema = fnSchema
        this.fnStatePlugins = [
            [linksPlugin, () => ({editor: this.mod.editor})],
            [history],
            [keymap, () => baseKeymap],
            [keymap, () => buildKeymap(this.schema)],
            [collab],
            [toolbarPlugin, () => ({editor: this.mod.editor})],
            [collabCaretsPlugin],
            [pastePlugin, () => ({editor: this.mod.editor})]
        ]
    }

    init() {
        let doc = this.schema.nodeFromJSON({"type":"doc","content":[]}),
            plugins = this.fnStatePlugins.map(plugin => {
                if (plugin[1]) {
                    return plugin[0](plugin[1](doc))
                } else {
                    return plugin[0](doc)
                }
            })

        this.view = new EditorView(document.getElementById('footnote-box-container'), {
            state: EditorState.create({
                schema: this.schema,
                doc,
                plugins
            }),
            onFocus: () => {
                this.mod.editor.currentView = this.view
            },
            onBlur: () => {

            },
            dispatchTransaction: (transaction) => {
                let remote = transaction.getMeta('remote')
                if (!remote) {
                    let filterFree = transaction.getMeta('filterFree')
                    if (!filterFree & this.onFilterTransaction(transaction)) {
                        return
                    }
                }

                let newState = this.view.state.apply(transaction)
                this.view.updateState(newState)

                this.onTransaction(transaction, remote)
                this.mod.layout.updateDOM()
            }
        })

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
    onTransaction(transaction, remote) {
        if (!remote) {
            this.footnoteEdit(transaction)
        }

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

    footnoteEdit(transaction) {
        // Handle an edit in the footnote editor.
        if (this.rendering) {
            // We are currently adding or removing footnotes in the footnote editor
            // due to changes at the footnote marker level, so abort.
            return false
        }

        if (transaction.docChanged) {
            let length = transaction.steps.length
            let lastStep = transaction.steps[length - 1]
            if (lastStep.hasOwnProperty('from')) {
                // We find the number of the last footnote that was updated by
                // looking at the last step and seeing footnote number that change referred to.
                let fnIndex = this.view.state.doc.resolve(lastStep.from).index(0)
                let fnContent = this.view.state.doc.child(fnIndex).toJSON().content
                let transaction = updateFootnoteMarker(this.mod.editor.view.state, fnIndex, fnContent)
                if (transaction) {
                    // Mark this change as originating from footnote to prevent circularity
                    transaction.setMeta('fromFootnote', true)
                    this.mod.editor.view.dispatch(transaction)
                }
            } else {
                // TODO: Figure out if there are cases where this is really needed.
            }
        }
    }

    applyDiffs(diffs) {
        let steps = diffs.map(j => Step.fromJSON(this.view.state.schema, j))
        let clientIds = diffs.map(j => j.client_id)
        let transaction = receiveTransaction(
            this.view.state,
            steps,
            clientIds
        )
        transaction.setMeta('remote', true)
        this.view.dispatch(transaction)
    }

    renderAllFootnotes() {
        let fnContents = getFootnoteMarkerContents(this.mod.editor.view.state)
        let doc = this.schema.nodeFromJSON({"type":"doc","content":[]}),
            plugins = this.fnStatePlugins.map(plugin => {
                if (plugin[1]) {
                    return plugin[0](plugin[1](doc))
                } else {
                    return plugin[0]()
                }
            })

        let newState = EditorState.create({
            schema: this.schema,
            doc,
            plugins
        })

        this.view.updateState(newState)

        fnContents.forEach((fnContent, index) => {
            this.renderFootnote(fnContent, index, true)
        })
    }

    renderFootnote(contents, index = 0, setDoc = false) {
        this.rendering = true
        let node = fnNodeToPmNode(contents)
        let pos = 0
        for (let i=0; i<index;i++) {
            pos += this.view.state.doc.child(i).nodeSize
        }

        let transaction = this.view.state.tr.insert(pos, node)

        transaction.setMeta('filterFree', true)

        this.view.dispatch(transaction)
        if (setDoc) {
            let initialSteps = sendableSteps(this.view.state)

            this.view.dispatch(receiveTransaction(
                this.view.state,
                initialSteps.steps,
                initialSteps.steps.map(
                    step => initialSteps.clientID
                )
            ))
        } else {
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reversed, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
        }
        this.rendering = false
    }

    removeFootnote(index) {
        if (!this.mod.editor.mod.collab.docChanges.receiving) {
            this.rendering = true
            let startPos = 0
            for (let i=0;i<index;i++) {
                startPos += this.view.state.doc.child(i).nodeSize
            }
            let endPos = startPos + this.view.state.doc.child(index).nodeSize
            let transaction = this.view.state.tr.delete(startPos, endPos)
            transaction.setMeta('filterFree', true)
            this.view.dispatch(transaction)
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reverse, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
            this.rendering = false
        }
    }

}

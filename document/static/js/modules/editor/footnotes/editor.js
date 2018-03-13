import {Step} from "prosemirror-transform"
import {collab, receiveTransaction, sendableSteps} from "prosemirror-collab"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"
import {dropCursor} from "prosemirror-dropcursor"
import {gapCursor} from "prosemirror-gapcursor"
import {buildKeymap} from "prosemirror-example-setup"

import {fnSchema} from "../../schema/footnotes"
import {
    citationRenderPlugin,
    pastePlugin,
    toolbarPlugin,
    collabCaretsPlugin,
    linksPlugin,
    getFootnoteMarkerContents,
    updateFootnoteMarker
} from "../state_plugins"
import {
    accessRightsPlugin
} from "./state_plugins"
import {fnNodeToPmNode} from "../../schema/footnotes_convert"

/* Functions related to the footnote editor instance */
export class ModFootnoteEditor {
    constructor(mod) {
        mod.fnEditor = this
        this.mod = mod
        this.schema = fnSchema
        this.fnStatePlugins = [
            [linksPlugin, () => ({editor: this.mod.editor})],
            [history],
            [keymap, () => baseKeymap],
            [keymap, () => buildKeymap(this.schema)],
            [collab, () => ({clientID: this.mod.editor.client_id})],
            [dropCursor],
            [gapCursor],
            [toolbarPlugin, () => ({editor: this.mod.editor})],
            [citationRenderPlugin, () => ({editor: this.mod.editor})],
            [collabCaretsPlugin, () => ({editor: this.mod.editor})],
            [pastePlugin, () => ({editor: this.mod.editor})],
            [accessRightsPlugin, () => ({editor: this.mod.editor})]
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
            handleDOMEvents : {
                focus: (view, event) => {
                    this.mod.editor.currentView = this.view
                }
            },
            dispatchTransaction: (tr) => {
                let remote = tr.getMeta('remote'),
                    filterFree = tr.getMeta('filterFree')
                // Skip if creating new footnote by typing directly into empty footnote editor.
                if (
                    tr.docChanged &&
                    tr.steps[0].jsonID === 'replace' &&
                    tr.steps[0].from === 0 &&
                    tr.steps[0].to === 0 &&
                    !remote &&
                    !filterFree
                ) {
                    return
                }

                let newState = this.view.state.apply(tr)

                this.view.updateState(newState)
                this.onTransaction(tr, remote, filterFree)
                this.mod.layout.updateDOM()
            }
        })

    }

    // Find out if we need to recalculate the bibliography
    onTransaction(transaction, remote, filterFree) {
        if (!remote && !filterFree && transaction.docChanged) {
            let steps = transaction.steps,
                lastStep = steps[steps.length - 1]
            if (lastStep.hasOwnProperty('from')) {
                // We find the number of the last footnote that was updated by
                // looking at the last step and seeing footnote number that change referred to.
                let fnIndex = transaction.doc.resolve(lastStep.from).index(0),
                    fnContent = transaction.doc.child(fnIndex).toJSON().content,
                    mainTransaction = updateFootnoteMarker(this.mod.editor.view.state, fnIndex, fnContent)
                if (mainTransaction) {
                    this.mod.editor.view.dispatch(mainTransaction)
                }
            }
        }

    }

    applyDiffs(diffs, cid) {
        let steps = diffs.map(j => Step.fromJSON(this.view.state.schema, j))
        let clientIds = diffs.map(j => cid)
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
            let rTransaction = receiveTransaction(
                this.view.state,
                initialSteps.steps,
                initialSteps.steps.map(
                    step => initialSteps.clientID
                )
            )
            this.view.updateState(
                this.view.state.apply(rTransaction)
            )
        } else {
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reversed, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
        }
    }

    removeFootnote(index) {
        if (!this.mod.editor.mod.collab.docChanges.receiving) {
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
        }
    }

}

import {Step} from "prosemirror-transform"
import {collab, receiveTransaction} from "prosemirror-collab"
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
    clipboardPlugin,
    selectionMenuPlugin,
    toolbarPlugin,
    collabCaretsPlugin,
    linksPlugin,
    getFootnoteMarkerContents,
    updateFootnoteMarker,
    trackPlugin,
    marginboxesPlugin,
    commentsPlugin
} from "../state_plugins"
import {
    accessRightsPlugin
} from "./state_plugins"
import {
    amendTransaction
} from "../track"
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
            [selectionMenuPlugin, () => ({editor: this.mod.editor})],
            [toolbarPlugin, () => ({editor: this.mod.editor})],
            [citationRenderPlugin, () => ({editor: this.mod.editor})],
            [collabCaretsPlugin, () => ({editor: this.mod.editor})],
            [clipboardPlugin, () => ({editor: this.mod.editor, viewType: 'footnotes'})],
            [accessRightsPlugin, () => ({editor: this.mod.editor})],
            [commentsPlugin, () => ({editor: this.mod.editor})],
            [trackPlugin, () => ({editor: this.mod.editor})],
            [marginboxesPlugin, () => ({editor: this.mod.editor})]
        ]
    }

    init() {
        const doc = this.schema.nodeFromJSON({"type":"doc", "content":[]}),
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
                focus: (_view, _event) => {
                    this.mod.editor.currentView = this.view
                }
            },
            dispatchTransaction: (tr) => {
                const remote = tr.getMeta('remote'),
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
                const trackedTr = amendTransaction(tr, this.view.state, this.mod.editor)
                const newState = this.view.state.apply(trackedTr)

                this.view.updateState(newState)
                this.onTransaction(trackedTr, remote, filterFree)
                this.mod.layout.updateDOM()
            }
        })

    }

    // Find out if we need to recalculate the bibliography
    onTransaction(tr, remote, filterFree) {
        if (!remote && !filterFree && tr.docChanged) {
            const steps = tr.steps,
                lastStep = steps[steps.length - 1]
            if (lastStep.hasOwnProperty('from')) {
                // We find the number of the last footnote that was updated by
                // looking at the last step and seeing footnote number that change referred to.
                const fnIndex = tr.doc.resolve(lastStep.from).index(0),
                    fnContent = tr.doc.child(fnIndex).toJSON().content,
                    mainTransaction = updateFootnoteMarker(this.mod.editor.view.state, fnIndex, fnContent)
                if (mainTransaction) {
                    this.mod.editor.view.dispatch(mainTransaction)
                }
            }
        }

    }

    applyDiffs(diffs, cid) {
        const steps = diffs.map(j => Step.fromJSON(this.view.state.schema, j))
        const clientIds = diffs.map(_ => cid)
        const tr = receiveTransaction(
            this.view.state,
            steps,
            clientIds
        )
        tr.setMeta('remote', true)
        this.view.dispatch(tr)
    }

    renderAllFootnotes() {
        const content = getFootnoteMarkerContents(this.mod.editor.view.state).map(fnContent => ({
            type: 'footnotecontainer',
            content: fnContent
        }))
        const doc = this.schema.nodeFromJSON(
                {type:"doc", content}
            ),
            plugins = this.fnStatePlugins.map(plugin => {
                if (plugin[1]) {
                    return plugin[0](plugin[1](doc))
                } else {
                    return plugin[0]()
                }
            }),
            newState = EditorState.create({
                schema: this.schema,
                doc,
                plugins
            })
        this.view.updateState(newState)
    }

    renderFootnote(contents, index = 0) {
        const node = fnNodeToPmNode(contents)
        let pos = 0
        for (let i=0; i<index;i++) {
            pos += this.view.state.doc.child(i).nodeSize
        }

        const tr = this.view.state.tr.insert(pos, node)

        tr.setMeta('filterFree', true)

        this.view.dispatch(tr)
        // Most changes to the footnotes are followed by a change to the main editor,
        // so changes are sent to collaborators automatically. When footnotes are added/deleted,
        // the change is reversed, so we need to inform collabs manually.
        this.mod.editor.mod.collab.docChanges.sendToCollaborators()
    }

    removeFootnote(index) {
        if (!this.mod.editor.mod.collab.docChanges.receiving) {
            let startPos = 0
            for (let i=0;i<index;i++) {
                startPos += this.view.state.doc.child(i).nodeSize
            }
            const endPos = startPos + this.view.state.doc.child(index).nodeSize
            const tr = this.view.state.tr.delete(startPos, endPos)
            tr.setMeta('filterFree', true)
            this.view.dispatch(tr)
            // Most changes to the footnotes are followed by a change to the main editor,
            // so changes are sent to collaborators automatically. When footnotes are added/deleted,
            // the change is reverse, so we need to inform collabs manually.
            this.mod.editor.mod.collab.docChanges.sendToCollaborators()
        }
    }

}

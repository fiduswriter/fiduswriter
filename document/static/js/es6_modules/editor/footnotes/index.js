import {fnSchema} from "../../schema/footnotes"
import {buildKeymap} from "prosemirror-example-setup"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"
import {collab} from "prosemirror-collab"

import {toolbarPlugin} from "../plugins/toolbar"
import {collabCaretsPlugin} from "../plugins/collab-carets"
import {Paste} from "../paste"
import {ModFootnoteEditor} from "./editor"
import {ModFootnoteLayout} from "./layout"

export class ModFootnotes {
    constructor(editor) {
        editor.mod.footnotes = this
        this.editor = editor
        this.schema = fnSchema
        new ModFootnoteEditor(this)
        this.init()
        new ModFootnoteLayout(this)
    }

    init() {
        this.fnView = new EditorView(document.getElementById('footnote-box-container'), {
            state: EditorState.create({
                schema: this.schema,
                doc: this.schema.nodeFromJSON({"type":"doc","content":[{"type": "footnote_end"}]}),
                plugins: [
                    history(),
                    keymap(baseKeymap),
                    keymap(buildKeymap(this.schema)),
                    collab(),
                    toolbarPlugin({editor: this.editor}),
                    collabCaretsPlugin()
                ]
            }),
            onFocus: () => {
                this.editor.currentView = this.fnView
            },
            onBlur: () => {

            },
            transformPastedHTML: inHTML => {
                let ph = new Paste(inHTML, "footnote")
                return ph.getOutput()
            },
            dispatchTransaction: (transaction) => {
                let remote = transaction.getMeta('remote')
                if (!remote) {
                    let filterFree = transaction.getMeta('filterFree')
                    if (!filterFree & this.fnEditor.onFilterTransaction(transaction)) {
                        return
                    }
                    this.editor.onBeforeTransaction(this.fnView, transaction)
                }

                let newState = this.fnView.state.apply(transaction)
                this.fnView.updateState(newState)

                this.fnEditor.onTransaction(transaction, remote)
                this.layout.updateDOM()
            }
        })

        // TODO: get rid of footnote_end once Pm doesn't have a bug that requires it.

    }
}

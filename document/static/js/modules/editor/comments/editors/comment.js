import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {commentSchema} from "./schema"

export class CommentEditor {
    constructor(dom, {text, isMajor}) {
        this.dom = dom
        this.text = text
        this.isMajor = isMajor
    }

    init() {
        let viewDOM = document.createElement('div')
        viewDOM.classList.add('ProseMirror-wrapper')
        this.dom.appendChild(viewDOM)
        this.dom.insertAdjacentHTML(
            'beforeend',
            `<input class="comment-is-major" type="checkbox" name="isMajor"
                ${this.isMajor ? 'checked' : ''}/>
            <label>${gettext("Is major")}</label>`
        )
        this.view = new EditorView(viewDOM, {
            state: EditorState.create({
                schema: commentSchema,
                doc: commentSchema.nodeFromJSON({
                    type: 'doc',
                    content: this.text
                }),
                plugins: [
                    history(),
                    keymap(baseKeymap),
                    keymap({
                        "Mod-z": undo,
                        "Mod-shift-z": undo,
                        "Mod-y": redo,
                    })
                ]
            }),
            dispatchTransaction: tr => {
                let newState = this.view.state.apply(tr)
                this.view.updateState(newState)
            }
        })
    }

    get value() {
        return {
            text: this.view.state.doc.toJSON().content,
            isMajor: this.dom.querySelector('.comment-is-major').checked
        }
    }
}

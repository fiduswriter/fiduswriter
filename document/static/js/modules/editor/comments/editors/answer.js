import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {commentSchema} from "./schema"

export class CommentAnswerEditor {
    constructor(mod, id, commentId, dom, {text}) {
        this.mod = mod
        this.id = id
        this.commentId = commentId
        this.dom = dom
        this.text = text
    }

    init() {
        let viewDOM = document.createElement('div')
        viewDOM.classList.add('ProseMirror-wrapper')
        this.dom.appendChild(viewDOM)
        this.dom.insertAdjacentHTML(
            'beforeend',
            `<div class="comment-btns">
                <button class="submit fw-button fw-dark" type="submit">
                    ${this.id ? gettext("Edit") :gettext("Submit")}
                </button>
                <button class="cancel fw-button fw-orange" type="submit">
                    ${gettext("Cancel")}
                </button>
            </div>`
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
                        "Ctrl-Enter": () => this.submit()
                    })
                ]
            }),
            dispatchTransaction: tr => {
                let newState = this.view.state.apply(tr)
                this.view.updateState(newState)
            }
        })
        this.view.focus()
        this.bind()
    }

    bind() {
        this.dom.querySelector('button.submit').addEventListener('click',
            event => this.submit()
        )
        this.dom.querySelector('button.cancel').addEventListener('click',
            event => this.mod.interactions.cancelSubmit()
        )
        this.dom.querySelector('.ProseMirror-wrapper').addEventListener('click',
            event => this.view.focus()
        )
    }

    submit() {
        if (this.id) {
            this.mod.interactions.submitAnswerUpdate(this.commentId, this.id, this.value.text)
        } else {
            this.mod.interactions.createNewAnswer(this.commentId, this.value.text)
        }
    }

    get value() {
        return {
            text: this.view.state.doc.toJSON().content
        }
    }
}

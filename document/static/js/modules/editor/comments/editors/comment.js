import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {commentSchema} from "./schema"

export class CommentEditor {
    constructor(mod, id, dom, {text, isMajor}) {
        this.mod = mod
        this.id = id
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
            <label>${gettext("Is major")}</label>
            <div class="comment-btns">
                <button class="submit fw-button fw-dark" type="submit">
                    ${this.id !== -1 ? gettext("Edit") :gettext("Submit")}
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
        let {text, isMajor} = this.value
        if (text.length > 0) {
            this.mod.interactions.updateComment(this.id, text, isMajor)
        } else {
            this.mod.interactions.deleteComment(this.id)
        }
    }

    get value() {
        return {
            text: this.view.state.doc.toJSON().content,
            isMajor: this.dom.querySelector('.comment-is-major').checked
        }
    }
}

import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {titleSchema} from "../../schema/title"

export class TitleFieldForm{
    constructor(dom, initialValue) {
        this.initialValue = initialValue
        this.dom = dom
    }

    init() {
        this.view = new EditorView(this.dom, {
            state: EditorState.create({
                schema: titleSchema,
                doc: titleSchema.nodeFromJSON({
                    type: 'doc',
                    content:[{
                        type: 'literal',
                        content: this.initialValue
                    }]
                }),
                plugins: [
                    history(),
                    keymap(baseKeymap),
                    keymap({
                        "Mod-z": undo,
                        "Mod-shift-z": undo,
                        "Mod-y": redo,
                        "Mod-b": () => {
                            const sMark = this.view.state.schema.marks['strong']
                            const command = toggleMark(sMark)
                            command(this.view.state, tr => this.view.dispatch(tr))
                        },
                        "Mod-i": () => {
                            const sMark = this.view.state.schema.marks['em']
                            const command = toggleMark(sMark)
                            command(this.view.state, tr => this.view.dispatch(tr))
                        }
                    })
                ]
            }),
            handleDOMEvents: {
                focus: (_view, _event) => {
                    document.querySelectorAll('.ui-dialog-buttonset .fw-edit').forEach(el => el.classList.remove('disabled'))
                },
                blur: (_view, _event) => {
                    document.querySelectorAll('.ui-dialog-buttonset .fw-edit').forEach(el => el.classList.add('disabled'))
                }
            },
            dispatchTransaction: tr => {
                const newState = this.view.state.apply(tr)
                this.view.updateState(newState)
            }
        })
        const supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps', 'nocase']
        supportedMarks.forEach(mark =>{
            this.linkMarkButton(mark)
        })
    }

    linkMarkButton(mark) {
        document.querySelector(`.ui-dialog-buttonset .fw-${mark}`).addEventListener("mousedown", event => {
            event.preventDefault()
            event.stopPropagation()
            if (!this.view.hasFocus()) {
                return
            }
            const sMark = this.view.state.schema.marks[mark]
            const command = toggleMark(sMark)
            command(this.view.state, tr => this.view.dispatch(tr))
        })
    }

    get value() {
        const titleContents = this.view.state.doc.firstChild.content.toJSON()
        return titleContents && titleContents.length ? titleContents : false
    }

    check() {
        return true
    }
}

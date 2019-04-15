import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {longLitSchema} from "../../schema/literal_long"

export class LiteralLongFieldForm {
    constructor(dom, initialValue = []) {
        this.dom = dom
        this.initialValue = initialValue
    }

    init() {
        this.view = new EditorView(this.dom, {
            state: EditorState.create({
                schema: longLitSchema,
                doc: longLitSchema.nodeFromJSON({
                    type: 'doc',
                    content:[{
                        type: 'longliteral',
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
                    document.querySelectorAll('.ui-dialog-buttonset .fw-nocase').forEach(el => el.classList.add('disabled'))
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

        const supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps']
        supportedMarks.forEach(mark =>{
            this.linkMarkButton(mark)
        })
    }

    linkMarkButton(mark) {
        document.querySelector(`.ui-dialog-buttonset .fw-${mark}`).addEventListener("mousedown", (event)=>{
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
        const literalContents = this.view.state.doc.firstChild.content.toJSON()
        return literalContents && literalContents.length ? literalContents : false
    }

    check() {
        return true
    }

}

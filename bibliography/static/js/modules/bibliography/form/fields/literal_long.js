import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {longLitSchema} from "../../schema/literal_long"

export class LiteralLongFieldForm{
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
                            let sMark = this.view.state.schema.marks['strong']
                            let command = toggleMark(sMark)
                            command(this.view.state, tr => this.view.dispatch(tr))
                        },
                        "Mod-i": () => {
                            let sMark = this.view.state.schema.marks['em']
                            let command = toggleMark(sMark)
                            command(this.view.state, tr => this.view.dispatch(tr))
                        }
                    })
                ]
            }),
            onFocus: () => {
                jQuery('.ui-dialog-buttonset .fw-edit').removeClass('disabled')
                jQuery('.ui-dialog-buttonset .fw-nocase').addClass('disabled')
            },
            onBlur: () => {
                jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
            },
            dispatchTransaction: (transaction) => {
                let newState = this.view.state.apply(transaction)
                this.view.updateState(newState)
            }
        })

        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps']
        supportedMarks.forEach(mark =>{
            this.linkMarkButton(mark)
        })
    }

    linkMarkButton(mark) {
        jQuery(`.ui-dialog-buttonset .fw-${mark}`).on("mousedown", (event)=>{
            event.preventDefault()
            event.stopPropagation()
            if (!this.view.hasFocus()) {
                return
            }
            let sMark = this.view.state.schema.marks[mark]
            let command = toggleMark(sMark)
            command(this.view.state, tr => this.view.dispatch(tr))
        })
    }

    get value() {
        let literalContents = this.view.state.doc.firstChild.content.toJSON()
        return literalContents && literalContents.length ? literalContents : false
    }

    check() {
        return true
    }

}

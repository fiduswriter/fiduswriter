import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"

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
            },
            onBlur: () => {
                jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
            },
            dispatchTransaction: (transaction) => {
                let newState = this.view.state.apply(transaction)
                this.view.updateState(newState)
            }
        })
        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps', 'nocase']
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
        let titleContents = this.view.state.doc.firstChild.content.toJSON()
        return titleContents && titleContents.length ? titleContents : false
    }

    check() {
        return true
    }
}

import {EditorState, Plugin} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap/dist/keymap"

import {litSchema} from "../../schema/literal"

export class LiteralFieldForm{
    constructor(dom, initialValue = [], placeHolder = false) {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
        this.placeHolderSet = false
    }

    init() {
        this.view = new EditorView(this.dom, {
            state: EditorState.create({
                schema: litSchema,
                doc: litSchema.nodeFromJSON({
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
                    }),
                    this.placeholderPlugin()
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

    placeholderPlugin() {
        return new Plugin({
            props: {
                decorations: (state) => {
                    let doc = state.doc
                    if (doc.childCount === 1 && doc.firstChild.isTextblock && doc.firstChild.content.size === 0) {
                        let placeHolder = document.createElement('span')
                        placeHolder.classList.add('placeholder')
                        placeHolder.setAttribute('data-placeholder', this.placeHolder)
                        return DecorationSet.create(doc, [Decoration.widget(1, placeHolder)])
                    }
                }
            }
        })
    }

}

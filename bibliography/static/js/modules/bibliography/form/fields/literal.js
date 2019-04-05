import {EditorState, Plugin} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {toggleMark, baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"

import {litSchema} from "../../schema/literal"

export class LiteralFieldForm{
    constructor(dom, initialValue = [], placeHolder = false) {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
        this.placeHolderSet = false
    }

    init() {

        const doc = litSchema.nodeFromJSON({
            type: 'doc',
            content:[{
                type: 'literal',
                content: this.initialValue
            }]
        })

        this.view = new EditorView(this.dom, {
            state: EditorState.create({
                schema: litSchema,
                doc,
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
                    }),
                    this.placeholderPlugin()
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
        document.querySelector(`.ui-dialog-buttonset .fw-${mark}`).addEventListener("mousedown",  event => {
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

    placeholderPlugin() {
        return new Plugin({
            props: {
                decorations: (state) => {
                    const doc = state.doc
                    if (
                        doc.childCount === 1 &&
                        doc.firstChild.isTextblock &&
                        doc.firstChild.content.size === 0 &&
                        this.placeHolder
                    ) {
                        const placeHolder = document.createElement('span')
                        placeHolder.classList.add('placeholder')
                        // There is only one field, so we know the selection is there
                        placeHolder.classList.add('selected')
                        placeHolder.setAttribute('data-placeholder', this.placeHolder)
                        return DecorationSet.create(doc, [Decoration.widget(1, placeHolder)])
                    }
                }
            }
        })
    }

}

import {Schema} from "prosemirror-model"
import {EditorState, Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"



const key = new PluginKey('keywordInput')

let doc = {content: 'keyword'},
    keyword = {
        content: 'inline*',
        parseDOM: [{tag: 'div.keyword-input-editor'}],
        toDOM() {
            return ["div", {
                class: 'keyword-input-editor'
            }, 0]
        }
    },
    text = {group: 'inline'}

const schema = new Schema({
    nodes: {doc, keyword, text},
    marks: {}
})


let placeholderPlugin = function() {
    return new Plugin({
        props: {
            decorations: (state) => {
                let doc = state.doc
                if (
                    doc.childCount === 1 &&
                    doc.firstChild.isTextblock &&
                    doc.firstChild.content.size === 0
                ) {
                    let placeHolder = document.createElement('span')
                    placeHolder.classList.add('placeholder')
                    // There is only one field, so we know the selection is there
                    placeHolder.classList.add('selected')
                    placeHolder.setAttribute('data-placeholder', gettext('Add keyword...'))
                    return DecorationSet.create(doc, [Decoration.widget(1, placeHolder)])
                }
            }
        }
    })
}

export let keywordInputPlugin = function(options) {
    let keywordView // The input element for keywords

    let submitKeyword = (state, dispatch, view) => {
        let keyword = state.doc.textContent
        if (keyword.length) {
            let eState = options.editor.view.state,
                {decos} = key.getState(eState),
                deco = decos.find()[0],
                pos = deco.from,
                node = eState.schema.nodes.keyword.create({keyword})
            options.editor.view.dispatch(
                options.editor.view.state.tr.insert(pos, node)
            )
            view.dispatch(
                state.tr.delete(1, state.doc.nodeSize - 3)
            )
        }
        return true
    }

    let createKeywordInputDom = function() {
        let dom = document.createElement('div')
        dom.classList.add('keyword-input')

        keywordView = new EditorView(dom, {
            state: EditorState.create({
                schema,
                doc: schema.nodeFromJSON({
                    type: 'doc',
                    content:[{
                        type: 'keyword',
                        content: []
                    }]
                }),
                plugins: [
                    history(),
                    placeholderPlugin(),
                    keymap({
                        "Mod-z": undo,
                        "Mod-shift-z": undo,
                        "Mod-y": redo,
                        "Enter": submitKeyword,
                        ",": submitKeyword,
                        ";": submitKeyword
                    })
                ]
            }),
            onFocus: () => {
            },
            onBlur: (view) => {
            },
            dispatchTransaction: (transaction) => {
                let newState = keywordView.state.apply(transaction)
                keywordView.updateState(newState)
            }
        })

        dom.addEventListener('click', event => {
            let state = options.editor.view.state,
                {decos} = key.getState(state),
                deco = decos.find()[0],
                pos = deco.from
            if (
                state.selection.from !== pos ||
                state.selection.to !== pos
            ) {
                let $pos = state.doc.resolve(pos)
                options.editor.view.dispatch(
                    state.tr.setSelection(new TextSelection($pos, $pos))
                )
                keywordView.focus()
            }

        })
        return dom
    }

    return new Plugin({
        key,
        state: {
            init(config, state) {
                let pos = 1, // enter article
                    child = 0,
                    decos = DecorationSet.empty

                if (options.editor.docInfo.access_rights !== 'write') {
                    return {decos}
                }

                while(state.doc.firstChild.child(child).type.name !== 'keywords') {
                    pos += state.doc.firstChild.child(child).nodeSize
                    child++
                }
                // Put decoration at end within keywords element
                pos += state.doc.firstChild.child(child).nodeSize - 1

                let dom = createKeywordInputDom(),
                    deco = Decoration.widget(pos, dom, {
                        side: 1,
                        stopEvent: event => {
                            if (
                                event.type==='keydown' &&
                                event.key==='ArrowRight' &&
                                keywordView.state.selection.from ===
                                    keywordView.state.doc.nodeSize -3
                            ) {
                                window.getSelection().removeAllRanges()
                                options.editor.view.focus()
                                return false
                            } else if (
                                event.type==='keydown' &&
                                event.key==='ArrowLeft' &&
                                keywordView.state.selection.to === 1
                            ) {
                                window.getSelection().removeAllRanges()
                                options.editor.view.focus()
                                return false
                            }
                            return true
                        }
                    })

                decos = decos.add(state.doc, [deco])

                return {
                    decos
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos
                } = this.getState(oldState)

                decos = decos.map(tr.mapping, tr.doc)
                if (options.editor.docInfo.access_rights !== 'write') {
                    return {decos}
                }
                let decoPos = decos.find()[0].from
                if (
                    tr.selection.from === tr.selection.to &&
                    decoPos === tr.selection.from &&
                    !keywordView.hasFocus()
                ) {
                    keywordView.focus()
                    let pos
                    if (oldState.selection.from < decoPos) {
                        pos = 1
                    } else {
                        pos = keywordView.state.doc.nodeSize - 3
                    }
                    let $pos = keywordView.state.doc.resolve(pos)
                    keywordView.dispatch(
                        keywordView.state.tr.setSelection(new TextSelection($pos, $pos))
                    )
                }

                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
				let {
					decos
				} = this.getState(state)
				return decos
			}
        }
    })
}

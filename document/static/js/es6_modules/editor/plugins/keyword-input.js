import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('keywordInput')
export let keywordInputPlugin = function(options) {
    let lastKeyArrowLeft = false, // whether or not the last selection change event was caused by an arrow left key
        rightExitKeywordInput = false, // whether the user tries to exit keyword input to the right
        keywordInput // The input element for keywords
    let createKeywordInputDom = function() {
        let dom = document.createElement('div')
        dom.classList.add('keyword-input')
        dom.innerHTML = `<input type="text" placeholder="${gettext("Add keyword...")}">`

        keywordInput = dom.querySelector('input')
        keywordInput.addEventListener('keydown', event => {
            if (['Enter', ';', ','].includes(event.key)) {
                event.preventDefault()
                let keyword = keywordInput.value,
                    state = options.editor.view.state,
                    {decos} = key.getState(state),
                    deco = decos.find()[0],
                    pos = deco.from,
                    node = state.schema.nodes.keyword.create({keyword})
                keywordInput.value = ''
                options.editor.view.dispatch(
                    options.editor.view.state.tr.insert(pos, node)
                )
            }
            return false
        })

        keywordInput.addEventListener('click', event => {
            let state = options.editor.view.state,
                {decos} = key.getState(state),
                deco = decos.find()[0],
                pos = deco.from
            if (
                state.selection.from !== pos ||
                state.selection.to !== pos
            ) {
                window.getSelection().removeAllRanges()
                options.editor.view.focus()
                let $pos = state.doc.resolve(pos)
                options.editor.view.dispatch(
                    state.tr.setSelection(new TextSelection($pos, $pos))
                )
                keywordInput.select()
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
                                keywordInput.selectionStart === keywordInput.value.length
                            ) {
                                rightExitKeywordInput = true
                                window.getSelection().removeAllRanges()
                                options.editor.view.focus()
                                return false
                            } else if (
                                event.type==='keydown' &&
                                event.key==='ArrowLeft' &&
                                keywordInput.selectionEnd === 0
                            ) {
                                window.getSelection().removeAllRanges()
                                options.editor.view.focus()
                                return true
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
                if (tr.setSelection) {
                    if (lastKeyArrowLeft) {
                        let decoPos= decos.find()[0].from
                        if (
                            tr.selection.from === tr.selection.to &&
                            decoPos === tr.selection.from
                        ) {
                            let len = keywordInput.value.length
                            keywordInput.select()
                            keywordInput.setSelectionRange(len, len)
                        }
                    }
                    lastKeyArrowLeft = false
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
			},
            handleKeyDown(view, event) {
                if (
                    view.state.selection.from === view.state.selection.to &&
                    ['ArrowLeft', 'ArrowRight'].includes(event.key)
                ) {
                    if (
                        event.key === 'ArrowLeft'
                    ) {
                        lastKeyArrowLeft = true
                    } else if (
                        event.key === 'ArrowRight'
                    ) {
                        if (rightExitKeywordInput) {
                            rightExitKeywordInput = false
                            return false
                        }
                        let {decos} = this.getState(view.state),
                            decoPos = decos.find()[0].from
                        if (view.state.selection.from === decoPos) {
                            keywordInput.select()
                            keywordInput.setSelectionRange(0, 0)
                            return true
                        }
                    }
                }
            }
        }
    })
}

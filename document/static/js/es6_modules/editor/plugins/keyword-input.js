import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('keywordInput')
export let keywordInputPlugin = function(options) {
    let keywordInput
    let createKeywordInputWidget = function() {
        let widget = document.createElement('div')
        widget.classList.add('keyword-input')
        widget.innerHTML = `<input type="text" placeholder="${gettext("Add keyword...")}">`

        keywordInput = widget.querySelector('input')
        keywordInput.addEventListener('keydown', event => {
            event.stopPropagation()
            if (['Enter', ';', ','].includes(event.key)) {
                event.preventDefault()
                let keyword = keywordInput.value,
                    state = options.editor.view.state, // TODO: This does not look right.
                    {decos} = key.getState(state),
                    deco = decos.find()[0],
                    pos = deco.from,
                    node = state.schema.nodes.keyword.create({keyword})
                keywordInput.value = ''
                options.editor.view.dispatch(
                    options.editor.view.state.tr.insert(pos, node)
                )
            } else if (
                event.key === 'ArrowLeft' &&
                keywordInput.selectionEnd === 0
            ) {
                event.preventDefault()
                let state = options.editor.view.state,
                    {decos} = key.getState(state),
                    deco = decos.find()[0],
                    pos = deco.from,
                    $pos = state.doc.resolve(pos),
                    tr = state.tr.setSelection(new TextSelection($pos, $pos))
                tr.setMeta('exitInput', true)
                options.editor.view.focus()
                options.editor.view.dispatch(tr)
            } else if (
                event.key === 'ArrowRight' &&
                keywordInput.selectionStart === keywordInput.value.length
            ) {
                let state = options.editor.view.state,
                    {decos} = key.getState(state),
                    deco = decos.find()[0],
                    pos = deco.from + 3, // +3 to get into body element
                    $pos = state.doc.resolve(pos),
                    tr = state.tr.setSelection(new TextSelection($pos, $pos))
                tr.setMeta('exitInput', true)
                options.editor.view.focus()
                options.editor.view.dispatch(tr)
            }
        })
        keywordInput.addEventListener('input', event => {
            event.stopPropagation()
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
                options.editor.view.focus()
                let $pos = state.doc.resolve(pos)
                options.editor.view.dispatch(
                    state.tr.setSelection(new TextSelection($pos, $pos))
                )
                keywordInput.select()
            }
        })

        return widget
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

                let widget = createKeywordInputWidget(),
                    deco = Decoration.widget(pos, widget)

                keywordInput = widget.querySelector('input')

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
        },
        filterTransaction(tr, state) {
            let {
                decos
            } = this.getState(state)

            if (tr.selectionSet && !tr.getMeta('exitInput')) {
                let decoPos = decos.find()[0].from
                if (
                    state.selection.from === state.selection.to &&
                    tr.selection.from === tr.selection.to
                ) {
                    if (
                        state.selection.from === decoPos &&
                        tr.selection.from === decoPos + 3
                    ) {
                        keywordInput.select()
                        keywordInput.setSelectionRange(0,0)
                        // Prohibit transaction
                        return false
                    } else if (
                        state.selection.from === decoPos + 3 &&
                        tr.selection.from === decoPos
                    ) {
                        let len = keywordInput.value.length
                        keywordInput.select()
                        keywordInput.setSelectionRange(len, len)
                    }
                }
                console.log([state.selection.from, tr.selection.from, decoPos])
            }

            return true
        }
    })
}

import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ReplaceAroundStep} from "prosemirror-transform"
import {Slice, Fragment} from "prosemirror-model"
import {noSpaceTmp, addAlert} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"
import {AuthorDialog} from "../menus/dialogs"

const key = new PluginKey('authorInput')

export let authorsEndPos = function(state) {
    let {decos} = key.getState(state),
        deco = decos.find()[0],
        pos = deco.from
    return pos
}

export let authorInputPlugin = function(options) {

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

                while(state.doc.firstChild.child(child).type.name !== 'authors') {
                    pos += state.doc.firstChild.child(child).nodeSize
                    child++
                }
                // Put decoration at end within authors element
                pos += state.doc.firstChild.child(child).nodeSize - 1

                let dom = document.createElement('button')
                dom.setAttribute('class','fw-button fw-light')
                dom.innerHTML = gettext('Add author...')

                dom.addEventListener('click', () => {
                    let dialog = new AuthorDialog(options.editor)
                    dialog.init()
                })
                let deco = Decoration.widget(pos, dom, {
                        side: 1,
                        stopEvent: event => true
                    })

                decos = decos.add(state.doc, [deco])

                return {decos}
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
                if (
                    state.selection.jsonID === 'node' &&
                    state.selection.node.type.name === 'author' &&
                    options.editor.docInfo.access_rights === 'write'
                ) {
                    let dropUp = document.createElement('span'),
                        requiredPx = 60

                    dropUp.classList.add('drop-up-outer')

                    dropUp.innerHTML = noSpaceTmp`
                        <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                            <div class="edit">
                                [<a href="#" class="edit-author">${gettext('Edit')}</a>]
                            </div>
                        </div>`

                    dropUp.querySelector('.edit-author').addEventListener('click', () => {
                        let dialog = new AuthorDialog(options.editor, state.selection.node.attrs)
                        dialog.init()
                    })

                    let deco = Decoration.widget(state.selection.from, dropUp, {
                        side: 1,
                        stopEvent: event => true
                    })

                    decos = decos.add(state.doc, [deco])
                }

				return decos
			}
        }
    })
}

import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ReplaceAroundStep} from "prosemirror-transform"
import {Slice, Fragment} from "prosemirror-model"
import {noSpaceTmp, addAlert} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"
import {AuthorDialog} from "../dialogs"

const key = new PluginKey('authorInput')

let findAuthorsEndPos = function(state) {
    let pos = 1, // enter article
        child = 0
    while(state.doc.firstChild.child(child).type.name !== 'authors') {
        pos += state.doc.firstChild.child(child).nodeSize
        child++
    }
    // Put decoration at end within authors element
    pos += state.doc.firstChild.child(child).nodeSize - 1
    return pos
}

export let authorsEndPos = function(state) {
    let {decos} = key.getState(state),
        decoArray = decos.find(),
        pos = decoArray.length ? decoArray[0].from : findAuthorsEndPos(state)
    return pos
}

export let authorInputPlugin = function(options) {

    let createAuthorsEndDeco = function(state) {
        let dom = document.createElement('button')
        dom.setAttribute('class','fw-button fw-light')
        dom.innerHTML = gettext('Add author...')

        dom.addEventListener('click', () => {
            let dialog = new AuthorDialog(options.editor)
            dialog.init()
        })
        let pos = findAuthorsEndPos(state)
        return Decoration.widget(pos, dom, {
            side: 1,
            stopEvent: event => true
        })
    }

    return new Plugin({
        key,
        state: {
            init(config, state) {
                let decos = DecorationSet.empty

                if (options.editor.docInfo.access_rights !== 'write') {
                    return {decos}
                }

                let deco = createAuthorsEndDeco(state)
                decos = decos.add(state.doc, [deco])

                return {decos}
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos
                } = this.getState(oldState)

                let decoDropped = false
                decos = decos.map(tr.mapping, tr.doc, {
                    onRemove: oldDeco => decoDropped = true
                })

                if (decoDropped) {
                    decos = DecorationSet.empty
                    let deco = createAuthorsEndDeco(state)
                    decos = decos.add(state.doc, [deco])
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

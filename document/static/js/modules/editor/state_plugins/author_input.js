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
            stopEvent: event => true,
            id: 'authorsButton'
        })
    }

    let createDropUp = function() {
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
            let dialog = new AuthorDialog(options.editor, options.editor.view.state.selection.node.attrs)
            dialog.init()
        })
        return dropUp
    }

    return new Plugin({
        key,
        state: {
            init(config, state) {
                let decos = DecorationSet.empty, dropUp

                if (options.editor.docInfo.access_rights === 'write') {
                    let authorsButtonDeco = createAuthorsEndDeco(state)
                    decos = decos.add(state.doc, [authorsButtonDeco])
                    dropUp = createDropUp()
                }

                return {
                    decos,
                    dropUp
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos,
                    dropUp
                } = this.getState(oldState)

                if (
                    (options.editor.docInfo.access_rights !== 'write') ||
                    (!tr.steps.length && !tr.selectionSet)
                ) {
                    return {
                        decos,
                        dropUp
                    }
                }

                let decoDropped = false // Check if the deco at the end of the authors field was dropped. If so, we need to readd it.
                decos = decos.map(tr.mapping, tr.doc, {
                    onRemove: spec => decoDropped = spec.id === 'authorsButton' ? true : decoDropped
                })
                if (decoDropped) {
                    let authorsButtonDeco = createAuthorsEndDeco(state)
                    decos = decos.add(state.doc, [authorsButtonDeco])
                }
                if (
                    oldState.selection.jsonID === 'node' &&
                    oldState.selection.node.type.name === 'author' &&
                    state.selection.node !== oldState.selection.node
                ) {
                    let oldDropUpDeco = decos.find(null, null, spec => spec.id === 'authorDropUp')
                    if (oldDropUpDeco && oldDropUpDeco.length) {
                        decos = decos.remove(oldDropUpDeco)
                    }
                }
                if (
                    state.selection.jsonID === 'node' &&
                    state.selection.node.type.name === 'author' &&
                    state.selection.node !== oldState.selection.node
                ) {
                    let dropUpDeco = Decoration.widget(state.selection.from, dropUp, {
                        side: 1,
                        stopEvent: event => true,
                        id: 'authorDropUp'
                    })

                    decos = decos.add(state.doc, [dropUpDeco])
                }

                return {
                    decos,
                    dropUp
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

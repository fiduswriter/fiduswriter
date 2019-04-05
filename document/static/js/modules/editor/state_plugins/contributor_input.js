import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {noSpaceTmp} from "../../common"
import {ContributorDialog} from "../dialogs"
import {addDeletedPartWidget} from "./document_template"

const key = new PluginKey('contributorInput')

export class ContributorsView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.classList.add('article-part')
        this.dom.classList.add(`article-${this.node.type.name}`)
        this.dom.classList.add(`article-${this.node.attrs.id}`)
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }
        this.contentDOM = document.createElement('span')
        this.contentDOM.classList.add('contributors-inner')
        this.dom.appendChild(this.contentDOM)
        const nodeTitle = this.node.attrs.item_title
        this.dom.insertAdjacentHTML(
            'beforeend',
            `<button class="fw-button fw-light">${gettext('Add')} ${nodeTitle.toLowerCase()}...</button>`
        )
        this.dom.lastElementChild.addEventListener('click', event => {
            event.preventDefault()
            const dialog = new ContributorDialog(node, view)
            dialog.init()
        })
        if (node.attrs.deleted) {
            addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    stopEvent(_event) {
        return true
    }

    ignoreMutation(_record) {
        return true
    }
}

export const contributorInputPlugin = function(options) {

    const createDropUp = function() {
        const dropUp = document.createElement('span'),
            requiredPx = 60

        dropUp.classList.add('drop-up-outer')

        dropUp.innerHTML = noSpaceTmp`
            <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                <div class="edit">
                    [<a href="#" class="edit-contributor">${gettext('Edit')}</a>]
                </div>
            </div>`

        dropUp.querySelector('.edit-contributor').addEventListener('click', event => {
            event.preventDefault()
            const dialog = new ContributorDialog(
                options.editor.view.state.selection.$anchor.parent,
                options.editor.view,
                options.editor.view.state.selection.node.attrs
            )
            dialog.init()
        })
        return dropUp
    }

    return new Plugin({
        key,
        state: {
            init(_config, _state) {
                const decos = DecorationSet.empty
                let dropUp

                if (options.editor.docInfo.access_rights === 'write') {
                    dropUp = createDropUp()
                    this.spec.props.nodeViews['contributors_part'] =
                        (node, view, getPos) => new ContributorsView(node, view, getPos)
                }

                return {
                    decos,
                    dropUp
                }
            },
            apply(tr, prev, oldState, state) {
                const pluginState = this.getState(oldState)
                const {
                    dropUp
                } = pluginState
                let {
                    decos
                } = pluginState

                if (
                    (options.editor.docInfo.access_rights !== 'write') ||
                    (!tr.docChanged && !tr.selectionSet)
                ) {
                    return {
                        decos,
                        dropUp
                    }
                }

                decos = decos.map(tr.mapping, tr.doc)
                if (
                    oldState.selection.jsonID === 'node' &&
                    oldState.selection.node.type.name === 'contributor' &&
                    state.selection.node !== oldState.selection.node
                ) {
                    const oldDropUpDeco = decos.find(null, null, spec => spec.id === 'contributorDropUp')
                    if (oldDropUpDeco && oldDropUpDeco.length) {
                        decos = decos.remove(oldDropUpDeco)
                    }
                }
                if (
                    state.selection.jsonID === 'node' &&
                    state.selection.node.type.name === 'contributor' &&
                    state.selection.node !== oldState.selection.node
                ) {
                    const dropUpDeco = Decoration.widget(state.selection.from, dropUp, {
                        side: -1,
                        stopEvent: () => true,
                        id: 'contributorDropUp'
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
				const {
					decos
				} = this.getState(state)

				return decos
			},
            nodeViews: {

            }
        }
    })
}

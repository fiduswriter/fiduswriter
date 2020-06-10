import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {noSpaceTmp, escapeText} from "../../common"
import {ContributorDialog} from "../dialogs"
import {addDeletedPartWidget} from "./document_template"

const key = new PluginKey('contributorInput')


export class ContributorsPartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.classList.add('article-part')
        this.dom.classList.add(`article-${this.node.type.name}`)
        this.dom.classList.add(`article-${this.node.attrs.id}`)
        this.dom.contentEditable = false
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }
        this.contentDOM = document.createElement('span')
        this.contentDOM.classList.add('contributors-inner')
        this.contentDOM.contentEditable = true
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
}

export const contributorInputPlugin = function(options) {

    const createDropUp = function(selection) {
        const dropUp = document.createElement('span'),
            requiredPx = 120,
            parentNode = selection.$anchor.parent

        dropUp.classList.add('drop-up-outer')

        dropUp.innerHTML = noSpaceTmp`
            <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                <div class="drop-up-head">
                    <div>${escapeText(parentNode.attrs.item_title)}</div>
                </div>
                <ul class="drop-up-options">
                    <li class="edit-contributor">${gettext('Edit')}</li>
                </ul>
            </div>`

        dropUp.querySelector('.edit-contributor').addEventListener('click', event => {
            event.preventDefault()
            const dialog = new ContributorDialog(
                parentNode,
                options.editor.view,
                selection.node.attrs
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

                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['contributors_part'] =
                        (node, view, getPos) => new ContributorsPartView(node, view, getPos)
                }

                return {
                    decos
                }
            },
            apply(tr, prev, oldState, state) {
                const pluginState = this.getState(oldState)
                let {
                    decos
                } = pluginState

                if (
                    (options.editor.docInfo.access_rights !== 'write') ||
                    (!tr.docChanged && !tr.selectionSet)
                ) {
                    return {
                        decos
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
                    const dropUpDeco = Decoration.widget(state.selection.from, createDropUp(state.selection), {
                        side: -1,
                        stopEvent: () => true,
                        id: 'contributorDropUp'
                    })

                    decos = decos.add(state.doc, [dropUpDeco])
                }

                return {
                    decos
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

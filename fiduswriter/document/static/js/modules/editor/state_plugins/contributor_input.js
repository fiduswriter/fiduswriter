import {keyName} from "w3c-keyname"

import {GapCursor} from "prosemirror-gapcursor"
import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {escapeText, isActivationEvent, noSpaceTmp} from "../../common"
import {ContributorDialog} from "../dialogs"
import {addDeletedPartWidget} from "./document_template"

const key = new PluginKey("contributorInput")

export class ContributorsPartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${this.node.attrs.id}`)
        this.dom.contentEditable = false
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }
        this.contentDOM = document.createElement("span")
        this.contentDOM.classList.add("contributors-inner")
        this.contentDOM.contentEditable = node.attrs.locking !== "fixed"
        this.dom.appendChild(this.contentDOM)

        if (node.attrs.locking !== "fixed") {
            this.addKeyListener(node, view, getPos)
            this.addNewButton()
        }
        if (node.attrs.deleted) {
            addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    addKeyListener(node, view, getPos) {
        this.contentDOM.addEventListener("keydown", event => {
            const key = keyName(event)
            switch (key) {
                case "Enter":
                    event.preventDefault()
                    this.handleActivation(event)
                    break
                case "ArrowDown":
                case "ArrowUp": {
                    event.preventDefault()
                    let newPos = getPos()
                    const dir = key === "ArrowDown" ? 1 : -1

                    if (key === "ArrowDown") {
                        newPos += node.nodeSize
                    } else {
                        newPos -= 1
                    }
                    let validTextSelection = false,
                        validGapCursor = false,
                        $pos
                    const state = view.state
                    while (!validGapCursor && !validTextSelection) {
                        newPos += dir
                        if (newPos === 0 || newPos === state.doc.nodeSize) {
                            // Could not find any valid position
                            return
                        }
                        $pos = state.doc.resolve(newPos)
                        validTextSelection = $pos.parent.inlineContent
                        validGapCursor = GapCursor.valid($pos)
                    }
                    const selection = validTextSelection
                        ? new TextSelection($pos)
                        : new GapCursor($pos)
                    const tr = state.tr.setSelection(selection)
                    view.dispatch(tr)
                    view.dom.focus()
                    break
                }
            }
        })
    }

    addNewButton() {
        const nodeTitle = this.node.attrs.item_title
        this.dom.insertAdjacentHTML(
            "beforeend",
            `<button class="fw-button fw-light">${gettext("Add")} ${nodeTitle.toLowerCase()}...</button>`
        )
        const button = this.dom.lastElementChild
        button.addEventListener("click", event => this.handleActivation(event))
        button.addEventListener("keydown", event =>
            this.handleActivation(event)
        )
    }

    handleActivation(event) {
        if (isActivationEvent(event)) {
            event.preventDefault()
            const dialog = new ContributorDialog(this.node, this.view)
            dialog.init()
        }
    }
}

export const contributorInputPlugin = options => {
    const createDropUp = selection => {
        const dropUp = document.createElement("span"),
            requiredPx = 120,
            parentNode = selection.$anchor.parent

        dropUp.classList.add("drop-up-outer")

        dropUp.innerHTML = noSpaceTmp`
            <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                <div class="drop-up-head">
                    <div>${escapeText(parentNode.attrs.item_title)}</div>
                </div>
                <ul class="drop-up-options">
                    <li class="edit-contributor">${gettext("Edit")}</li>
                </ul>
            </div>`

        dropUp
            .querySelector(".edit-contributor")
            .addEventListener("click", event => {
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

                if (options.editor.docInfo.access_rights === "write") {
                    this.spec.props.nodeViews["contributors_part"] = (
                        node,
                        view,
                        getPos
                    ) => new ContributorsPartView(node, view, getPos)
                }

                return {
                    decos
                }
            },
            apply(tr, _prev, oldState, state) {
                const pluginState = this.getState(oldState)
                let {decos} = pluginState

                if (
                    options.editor.docInfo.access_rights !== "write" ||
                    (!tr.docChanged && !tr.selectionSet)
                ) {
                    return {
                        decos
                    }
                }

                decos = decos.map(tr.mapping, tr.doc)
                if (
                    oldState.selection.jsonID === "node" &&
                    oldState.selection.node.type.name === "contributor" &&
                    state.selection.node !== oldState.selection.node
                ) {
                    const oldDropUpDeco = decos.find(
                        null,
                        null,
                        spec => spec.id === "contributorDropUp"
                    )
                    if (oldDropUpDeco && oldDropUpDeco.length) {
                        decos = decos.remove(oldDropUpDeco)
                    }
                }
                if (
                    state.selection.jsonID === "node" &&
                    state.selection.node.type.name === "contributor" &&
                    state.selection.node !== oldState.selection.node &&
                    state.selection.$anchor.node(1).attrs.locking !== "fixed"
                ) {
                    const dropUpDeco = Decoration.widget(
                        state.selection.from,
                        createDropUp(state.selection),
                        {
                            side: -1,
                            stopEvent: () => true,
                            id: "contributorDropUp"
                        }
                    )

                    decos = decos.add(state.doc, [dropUpDeco])
                }

                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
                const {decos} = this.getState(state)

                return decos
            },
            nodeViews: {}
        }
    })
}

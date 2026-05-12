import {
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {COMMENT_ONLY_ROLES, READ_ONLY_ROLES} from ".."
import {MathDialog} from "../dialogs"
import {elementDisabled} from "../menus/toolbar/model"

const key = new PluginKey("inlineMath")

/**
 * Check if an inline equation can be activated at the current position.
 * Mirrors the toolbar equation-button disabled check.
 */
function canActivateInlineMath(_state, _$pos, editor) {
    if (editor && elementDisabled(editor, "equation")) {
        return false
    }
    return true
}

/* ────────────────────────────────────────────────────────── */
/*  Helpers shared by the inline-editor widget               */
/* ────────────────────────────────────────────────────────── */

function getInputCursorPos(input) {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) {
        return (input.textContent || "").length
    }
    return sel.getRangeAt(0).startOffset
}

function setInputCursorPos(input, pos) {
    const textNode = input.firstChild
    if (!textNode) {
        return
    }
    const range = document.createRange()
    const safePos = Math.min(pos, (textNode.textContent || "").length)
    range.setStart(textNode, safePos)
    range.collapse(true)
    const sel = window.getSelection()
    if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
    }
}

/**
 * Build the contenteditable widget that lets the user type raw LaTeX.
 * The query includes the leading "$", which is shown in the widget so the
 * user always sees "$…latex…".
 */
function createInlineMathWidget(editor, pluginState, pluginKey) {
    const view = editor.currentView || editor.view
    const container = document.createElement("span")
    container.className = "inline-math-widget"

    const input = document.createElement("span")
    input.contentEditable = "plaintext-only"
    input.spellcheck = false
    input.className = "inline-math-input"
    input.textContent = pluginState.query

    input.addEventListener("input", event => {
        event.stopPropagation()
        const text = input.textContent || ""
        if (!text) {
            // Everything including `$` was deleted — remove the node.
            view.dispatch(
                view.state.tr.setMeta(pluginKey, {action: "cancelDelete"})
            )
            view.focus()
            return
        }
        if (!text.startsWith("$")) {
            // `$` was removed but content remains — restore it.
            const cursorPos = getInputCursorPos(input)
            input.textContent = "$" + text
            setInputCursorPos(input, cursorPos + 1)
        }
        view.dispatch(
            view.state.tr.setMeta(pluginKey, {
                action: "updateQuery",
                query: input.textContent
            })
        )
    })

    input.addEventListener("keypress", event => {
        // Stop keypress from reaching ProseMirror
        event.stopPropagation()
    })

    input.addEventListener("keydown", event => {
        event.stopPropagation()
        const currentState = pluginKey.getState(view.state)
        if (!currentState?.active) {
            return
        }
        switch (event.key) {
            case "ArrowLeft":
                if (getInputCursorPos(input) === 0) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(pluginKey, {action: "cancelLeft"})
                    )
                    view.focus()
                }
                break
            case "ArrowRight":
                if (
                    getInputCursorPos(input) ===
                    (input.textContent || "").length
                ) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(pluginKey, {
                            action: "commitAndRight"
                        })
                    )
                    view.focus()
                }
                break
            case "Enter":
            case "Tab":
                event.preventDefault()
                view.dispatch(
                    view.state.tr.setMeta(pluginKey, {action: "commit"})
                )
                view.focus()
                break
            case "Escape":
                event.preventDefault()
                view.dispatch(
                    view.state.tr.setMeta(pluginKey, {action: "cancel"})
                )
                view.focus()
                break
            case "Backspace":
                // When only `$` remains, delete the whole node.
                if ((input.textContent || "").length <= 1) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(pluginKey, {
                            action: "cancelDelete"
                        })
                    )
                    view.focus()
                }
                break
            case "Delete":
                // Same as Backspace when only `$` is left.
                if ((input.textContent || "").length <= 1) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(pluginKey, {
                            action: "cancelDelete"
                        })
                    )
                    view.focus()
                }
                break
            default:
                break
        }
    })

    input.addEventListener("focusout", event => {
        const related = event.relatedTarget
        if (container.contains(related)) {
            return
        }
        const myWidgetId = pluginState.widgetId
        // Use a tiny timeout so that a click on the container itself
        // (e.g. scrollbar) does not accidentally commit.
        setTimeout(() => {
            const currentState = pluginKey.getState(view.state)
            if (currentState?.active && currentState.widgetId === myWidgetId) {
                view.dispatch(
                    view.state.tr.setMeta(pluginKey, {action: "commit"})
                )
            }
        }, 1)
    })

    container.addEventListener("mousedown", event => {
        event.stopPropagation()
    })

    container.appendChild(input)

    // Focus the input and position the cursor after mounting.
    setTimeout(() => {
        input.focus()
        if (pluginState.cursorAtStart === true) {
            setInputCursorPos(input, 0)
        } else {
            setInputCursorPos(input, (input.textContent || "").length)
        }
    }, 0)

    return container
}

/* ────────────────────────────────────────────────────────── */
/*  Dropup plugin (inline_math preference OFF)               */
/* ────────────────────────────────────────────────────────── */

function dropupPlugin(options) {
    const editor = options.editor
    let currentDropUpActions = []

    const editAccess = ["write", "write-tracked", "review-tracked"].includes(
        editor.docInfo.access_rights
    )

    function getEquationNode(state) {
        return state.selection instanceof NodeSelection &&
            state.selection.node.type.name === "equation"
            ? state.selection.node
            : undefined
    }

    function createEquationDropUp(equationNode, selectedIndex = -1) {
        const dropUp = document.createElement("span")
        dropUp.classList.add("drop-up-outer")

        const latex = equationNode.attrs.equation || ""
        const requiredPx = editAccess ? 92 : 50

        dropUp.innerHTML = `
            <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                <div class="drop-up-head"${editAccess ? "" : ' style="border-radius:6px;"'}>
                    <div class="link-title">${gettext("Equation")}</div>
                    <div class="link-href">
                        <span class="inline-math-dropup-latex">${latex.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>
                    </div>
                </div>
                ${
                    editAccess
                        ? `<ul class="drop-up-options">
                            <li class="edit-equation" title="${gettext("Edit equation")}">
                                ${gettext("Edit")}
                            </li>
                            <li class="remove-equation" title="${gettext("Remove equation")}">
                                ${gettext("Remove")}
                            </li>
                        </ul>`
                        : ""
                }
            </div>`

        currentDropUpActions = []
        const setupAction = (selector, action) => {
            const el = dropUp.querySelector(selector)
            if (!el) {
                return
            }
            currentDropUpActions.push(action)
            el.addEventListener("mousedown", event => {
                event.preventDefault()
                event.stopImmediatePropagation()
                action()
            })
        }

        setupAction(".edit-equation", () => {
            // MathDialog reads the NodeSelection from the view, so we rely on
            // the equation node already being NodeSelected when the button is
            // activated.
            const dialog = new MathDialog(editor)
            dialog.init()
        })

        setupAction(".remove-equation", () => {
            const view = editor.currentView
            const state = view.state
            if (state.selection instanceof NodeSelection) {
                view.dispatch(state.tr.deleteSelection())
            }
        })

        if (selectedIndex >= 0 && selectedIndex < currentDropUpActions.length) {
            const items = Array.from(
                dropUp.querySelectorAll(".drop-up-options li")
            )
            if (items[selectedIndex]) {
                items[selectedIndex].classList.add("focused")
            }
        }

        return dropUp
    }

    function getDecos(state, selectedIndex = -1) {
        const equationNode = getEquationNode(state)
        if (!equationNode) {
            return DecorationSet.empty
        }
        // Place the dropup widget just after the equation node.
        const startPos = state.selection.from + equationNode.nodeSize
        const dom = createEquationDropUp(equationNode, selectedIndex)
        return DecorationSet.create(state.doc, [
            Decoration.widget(startPos, dom)
        ])
    }

    return new Plugin({
        key,
        state: {
            init() {
                return {
                    equationNode: undefined,
                    decos: DecorationSet.empty,
                    selectedIndex: -1
                }
            },
            apply(tr, prev, _oldState, state) {
                const newEquationNode = getEquationNode(state)
                const meta = tr.getMeta(key)
                let {selectedIndex} = prev

                if (meta?.action === "navigate") {
                    selectedIndex = meta.index
                    return {
                        equationNode: newEquationNode,
                        decos: getDecos(state, selectedIndex),
                        selectedIndex
                    }
                }

                if (newEquationNode === prev.equationNode) {
                    return {
                        equationNode: newEquationNode,
                        decos: prev.decos.map(tr.mapping, tr.doc),
                        selectedIndex
                    }
                }

                // Equation node changed (or deselected): reset selection index.
                selectedIndex = -1
                return {
                    equationNode: newEquationNode,
                    decos: getDecos(state, selectedIndex),
                    selectedIndex
                }
            }
        },
        props: {
            handleKeyDown(view, event) {
                const pluginState = key.getState(view.state)
                if (!pluginState?.equationNode) {
                    return false
                }
                const totalItems = currentDropUpActions.length
                if (totalItems === 0) {
                    return false
                }
                const {selectedIndex} = pluginState

                if (event.key === "ArrowDown") {
                    event.preventDefault()
                    const newIndex =
                        selectedIndex < totalItems - 1 ? selectedIndex + 1 : 0
                    view.dispatch(
                        view.state.tr.setMeta(key, {
                            action: "navigate",
                            index: newIndex
                        })
                    )
                    return true
                }
                if (event.key === "ArrowUp") {
                    event.preventDefault()
                    const newIndex =
                        selectedIndex <= 0 ? totalItems - 1 : selectedIndex - 1
                    view.dispatch(
                        view.state.tr.setMeta(key, {
                            action: "navigate",
                            index: newIndex
                        })
                    )
                    return true
                }
                if (
                    event.key === "Enter" &&
                    selectedIndex >= 0 &&
                    selectedIndex < totalItems
                ) {
                    event.preventDefault()
                    currentDropUpActions[selectedIndex]()
                    return true
                }
                return false
            },
            decorations(state) {
                const pluginState = key.getState(state)
                return pluginState?.decos || DecorationSet.empty
            }
        }
    })
}

/* ────────────────────────────────────────────────────────── */
/*  Inline editor plugin (inline_math preference ON)         */
/* ────────────────────────────────────────────────────────── */

function inlineEditorPlugin(options) {
    const editor = options.editor

    return new Plugin({
        key,
        state: {
            init() {
                return {
                    active: false,
                    from: 0,
                    query: "",
                    isEdit: false,
                    mathNodePos: 0,
                    widgetId: undefined,
                    cursorAtStart: undefined,
                    decos: DecorationSet.empty
                }
            },
            apply(tr, prev, _oldState, _newState) {
                let next = {...prev}
                const meta = tr.getMeta(key)

                if (meta?.action === "activate") {
                    next = {
                        active: true,
                        from: meta.from,
                        query: meta.query || "$",
                        isEdit: meta.isEdit || false,
                        mathNodePos: meta.mathNodePos || 0,
                        widgetId: Math.random().toString(36).slice(2),
                        cursorAtStart: meta.cursorAtStart,
                        decos: DecorationSet.empty
                    }
                } else if (meta?.action === "deactivate") {
                    next = {
                        active: false,
                        from: 0,
                        query: "",
                        isEdit: false,
                        mathNodePos: 0,
                        widgetId: undefined,
                        cursorAtStart: undefined,
                        decos: DecorationSet.empty
                    }
                } else if (meta?.action === "updateQuery") {
                    next.query = meta.query
                }

                if (next.active) {
                    if (!prev.active || prev.from !== next.from) {
                        // Position changed or freshly activated: build decorations.
                        const decoList = [
                            Decoration.widget(
                                next.from,
                                () => createInlineMathWidget(editor, next, key),
                                {key: "inline-math-widget", side: -1}
                            )
                        ]
                        if (next.isEdit) {
                            // Hide the equation node while the inline editor is open.
                            decoList.push(
                                Decoration.node(
                                    next.mathNodePos,
                                    next.mathNodePos + 1,
                                    {class: "hide"}
                                )
                            )
                        }
                        next.decos = DecorationSet.create(
                            _newState.doc,
                            decoList
                        )
                    } else if (tr.docChanged) {
                        next.decos = prev.decos.map(tr.mapping, _newState.doc)
                    } else {
                        next.decos = prev.decos
                    }
                } else {
                    next.decos = DecorationSet.empty
                }

                return next
            }
        },

        appendTransaction: (trs, oldState, newState) => {
            const oldPluginState = key.getState(oldState)
            const meta = trs.find(tr => tr.getMeta(key))?.getMeta(key)

            /* ── commit / commitAndRight ── */
            if (
                meta?.action === "commit" ||
                meta?.action === "commitAndRight"
            ) {
                if (!oldPluginState.active) {
                    return null
                }
                const query = oldPluginState.query
                const latex = query.startsWith("$") ? query.slice(1) : query

                if (!latex.trim()) {
                    // Empty LaTeX: delete the node (edit) or just cancel (new).
                    if (oldPluginState.isEdit) {
                        const existingNode = newState.doc.nodeAt(
                            oldPluginState.mathNodePos
                        )
                        const tr = newState.tr.delete(
                            oldPluginState.mathNodePos,
                            oldPluginState.mathNodePos +
                                (existingNode?.nodeSize || 1)
                        )
                        tr.setSelection(
                            TextSelection.create(
                                tr.doc,
                                oldPluginState.mathNodePos
                            )
                        )
                        return tr.setMeta(key, {action: "deactivate"})
                    } else {
                        // Insert the literal "$" and move cursor past it.
                        const tr = newState.tr.insertText(
                            "$",
                            oldPluginState.from
                        )
                        tr.setSelection(
                            TextSelection.create(
                                tr.doc,
                                oldPluginState.from + 1
                            )
                        )
                        return tr.setMeta(key, {action: "deactivate"})
                    }
                }

                const equationNode = newState.schema.nodes.equation.create({
                    equation: latex
                })

                if (oldPluginState.isEdit) {
                    const existingNode = newState.doc.nodeAt(
                        oldPluginState.mathNodePos
                    )
                    const tr = newState.tr.replaceWith(
                        oldPluginState.mathNodePos,
                        oldPluginState.mathNodePos +
                            (existingNode?.nodeSize || 1),
                        equationNode
                    )
                    tr.setSelection(
                        TextSelection.create(
                            tr.doc,
                            oldPluginState.mathNodePos + equationNode.nodeSize
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    const tr = newState.tr.insert(
                        oldPluginState.from,
                        equationNode
                    )
                    tr.setSelection(
                        TextSelection.create(
                            tr.doc,
                            oldPluginState.from + equationNode.nodeSize
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            /* ── cancel ── */
            if (meta?.action === "cancel") {
                if (oldPluginState.isEdit) {
                    // Leave the equation node unchanged; move cursor after it.
                    const node = newState.doc.nodeAt(oldPluginState.mathNodePos)
                    const tr = newState.tr.setSelection(
                        TextSelection.create(
                            newState.doc,
                            oldPluginState.mathNodePos + (node?.nodeSize || 1)
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    // Restore the literal "$" at the original position.
                    const tr = newState.tr.insertText("$", oldPluginState.from)
                    tr.setSelection(
                        TextSelection.create(tr.doc, oldPluginState.from + 1)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            /* ── cancelDelete ── */
            if (meta?.action === "cancelDelete") {
                if (oldPluginState.isEdit) {
                    // Delete the equation node entirely.
                    const existingNode = newState.doc.nodeAt(
                        oldPluginState.mathNodePos
                    )
                    const tr = newState.tr.delete(
                        oldPluginState.mathNodePos,
                        oldPluginState.mathNodePos +
                            (existingNode?.nodeSize || 1)
                    )
                    tr.setSelection(
                        TextSelection.create(tr.doc, oldPluginState.mathNodePos)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    // New node: just deactivate — don't insert anything.
                    return newState.tr.setMeta(key, {action: "deactivate"})
                }
            }

            /* ── cancelLeft ── */
            if (meta?.action === "cancelLeft") {
                if (oldPluginState.isEdit) {
                    const tr = newState.tr.setSelection(
                        TextSelection.create(
                            newState.doc,
                            oldPluginState.mathNodePos
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    const tr = newState.tr.insertText("$", oldPluginState.from)
                    tr.setSelection(
                        TextSelection.create(tr.doc, oldPluginState.from)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            /* ── implicit commit when selection moves away ── */
            if (oldPluginState.active) {
                if (
                    trs.some(tr => tr.selectionSet) &&
                    (newState.selection.from !== oldPluginState.from ||
                        newState.selection.to !== oldPluginState.from)
                ) {
                    const query = oldPluginState.query
                    const latex = query.startsWith("$") ? query.slice(1) : query

                    if (latex.trim()) {
                        const equationNode =
                            newState.schema.nodes.equation.create({
                                equation: latex
                            })
                        if (oldPluginState.isEdit) {
                            const existingNode = newState.doc.nodeAt(
                                oldPluginState.mathNodePos
                            )
                            return newState.tr
                                .replaceWith(
                                    oldPluginState.mathNodePos,
                                    oldPluginState.mathNodePos +
                                        (existingNode?.nodeSize || 1),
                                    equationNode
                                )
                                .setMeta(key, {action: "deactivate"})
                        } else {
                            return newState.tr
                                .insert(oldPluginState.from, equationNode)
                                .setMeta(key, {action: "deactivate"})
                        }
                    } else {
                        return newState.tr.setMeta(key, {action: "deactivate"})
                    }
                }
            } else {
                /* ── equation NodeSelection → open inline editor ── */
                const selection = newState.selection
                if (
                    selection instanceof NodeSelection &&
                    selection.node.type.name === "equation"
                ) {
                    const eqNode = selection.node
                    const from = selection.from
                    return newState.tr.setMeta(key, {
                        action: "activate",
                        from,
                        query: `$${eqNode.attrs.equation}`,
                        isEdit: true,
                        mathNodePos: from
                    })
                }

                /* ── "$" typed via paste/mobile (doc changed) ── */
                const changedTr = trs.find(tr => tr.docChanged)
                if (changedTr) {
                    const $pos = newState.selection.$head
                    if (canActivateInlineMath(newState, $pos, editor)) {
                        const beforeText = newState.doc.textBetween(
                            Math.max(0, $pos.pos - 3),
                            $pos.pos,
                            ""
                        )
                        if (beforeText.endsWith("$")) {
                            return newState.tr
                                .delete($pos.pos - 1, $pos.pos)
                                .setMeta(key, {
                                    action: "activate",
                                    from: $pos.pos - 1,
                                    query: "$",
                                    isEdit: false,
                                    mathNodePos: 0
                                })
                        }
                    }
                }
            }

            return null
        },

        props: {
            decorations(state) {
                const pluginState = key.getState(state)
                return pluginState?.decos || DecorationSet.empty
            },

            handleClickOn(_view, _pos, node, nodePos, _event, _direct) {
                if (node.type.name === "equation") {
                    const tr = _view.state.tr.setSelection(
                        TextSelection.create(
                            _view.state.doc,
                            nodePos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: nodePos,
                        query: `$${node.attrs.equation}`,
                        isEdit: true,
                        mathNodePos: nodePos
                    })
                    _view.dispatch(tr)
                    return true
                }
                return false
            },

            handleDOMEvents: {
                mousedown(view, event) {
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                        return false
                    }
                    if (event.button !== 0) {
                        return false
                    }
                    const target = event.target.closest(".equation")
                    if (!target) {
                        return false
                    }
                    let pos = view.posAtDOM(target, 0)
                    let node = view.state.doc.nodeAt(pos)
                    if (!node || node.type.name !== "equation") {
                        return false
                    }

                    const pluginState = key.getState(view.state)
                    if (pluginState?.active) {
                        // Commit the current widget before opening a new one.
                        const commitTr = view.state.tr.setMeta(key, {
                            action: "commit"
                        })
                        view.dispatch(commitTr)
                        pos = commitTr.mapping.map(pos)
                        node = view.state.doc.nodeAt(pos)
                        if (!node || node.type.name !== "equation") {
                            return false
                        }
                    }

                    const tr = view.state.tr.setSelection(
                        TextSelection.create(
                            view.state.doc,
                            pos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: pos,
                        query: `$${node.attrs.equation}`,
                        isEdit: true,
                        mathNodePos: pos
                    })
                    view.dispatch(tr)
                    event.stopPropagation()
                    event.preventDefault()
                    return true
                },

                click(view, event) {
                    const pluginState = key.getState(view.state)
                    if (pluginState?.active) {
                        if (event.target.closest(".inline-math-widget")) {
                            // Click inside the widget: let the widget handle it.
                            return false
                        }
                        // Widget is active and user clicked elsewhere: the
                        // focusout handler will commit asynchronously; prevent
                        // the click from doing anything unexpected.
                        event.preventDefault()
                        event.stopPropagation()
                        return true
                    }
                    return false
                }
            },

            handleKeyDown(view, event) {
                const pluginState = key.getState(view.state)
                if (!pluginState?.active) {
                    /* ── "$" keypress → activate inline editor ── */
                    if (event.key === "$") {
                        const $pos = view.state.selection.$head
                        if (canActivateInlineMath(view.state, $pos, editor)) {
                            event.preventDefault()
                            view.dispatch(
                                view.state.tr.setMeta(key, {
                                    action: "activate",
                                    from: $pos.pos,
                                    query: "$",
                                    isEdit: false,
                                    mathNodePos: 0
                                })
                            )
                            return true
                        }
                    }

                    /* ── ArrowRight into an equation node ── */
                    if (event.key === "ArrowRight") {
                        const sel = view.state.selection
                        if (sel.empty) {
                            const nodeAfter = sel.$head.nodeAfter
                            if (
                                nodeAfter &&
                                nodeAfter.type.name === "equation"
                            ) {
                                event.preventDefault()
                                const from = sel.$head.pos
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from,
                                        query: `$${nodeAfter.attrs.equation}`,
                                        isEdit: true,
                                        mathNodePos: from,
                                        cursorAtStart: true
                                    })
                                )
                                return true
                            }
                        }
                    }

                    /* ── ArrowLeft into an equation node ── */
                    if (event.key === "ArrowLeft") {
                        const sel = view.state.selection
                        if (sel.empty) {
                            const nodeBefore = sel.$head.nodeBefore
                            if (
                                nodeBefore &&
                                nodeBefore.type.name === "equation"
                            ) {
                                event.preventDefault()
                                const from = sel.$head.pos - nodeBefore.nodeSize
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from,
                                        query: `$${nodeBefore.attrs.equation}`,
                                        isEdit: true,
                                        mathNodePos: from,
                                        cursorAtStart: false
                                    })
                                )
                                return true
                            }
                        }
                    }

                    return false
                }
                // When the widget is active it traps its own events; nothing
                // extra needs to be handled here.
                return false
            }
        }
    })
}

/* ────────────────────────────────────────────────────────── */
/*  Public plugin factory                                    */
/* ────────────────────────────────────────────────────────── */

export const inlineMathPlugin = options => {
    const editor = options.editor

    const enabled =
        editor.app.config.user?.preferences?.inline_math === true &&
        !READ_ONLY_ROLES.includes(editor.docInfo.access_rights) &&
        !COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)

    return enabled ? inlineEditorPlugin(options) : dropupPlugin(options)
}

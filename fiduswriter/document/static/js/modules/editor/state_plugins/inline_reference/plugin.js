import {
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {COMMENT_ONLY_ROLES, READ_ONLY_ROLES} from "../.."
import {elementDisabled} from "../../menus/toolbar/model"
import {
    buildBibliographyList,
    buildCrossRefList,
    createCitationDropUp,
    filterBibliography,
    filterCrossRefs
} from "./dropup"

const key = new PluginKey("inlineReference")

export const getInlineReferenceState = state => key.getState(state)
export const setInlineReferenceState = (tr, state) => tr.setMeta(key, state)

/**
 * Check if citations can be inserted at the given position.
 * Checks both the ProseMirror schema and document-template restrictions
 * (allowed elements per doc part, protected sections) — the same conditions
 * that disable the toolbar citation button.
 */
function canInsertCitation(_state, _$pos, editor) {
    // Mirror the template-based restriction check used by the toolbar button.
    if (editor && elementDisabled(editor, "citation")) {
        return false
    }
    return true
}

/**
 * Parse inline citation text into references array.
 * Format: @key[prefix][locator];key2[prefix2][locator2]
 * Returns {references, format} or null if any key cannot be resolved.
 */
function parseCitationText(text, bibEntries, bibDB) {
    let format = "autocite"
    let body = text
    if (body.startsWith("@@")) {
        format = "textcite"
        body = body.slice(2)
    } else if (body.startsWith("@")) {
        body = body.slice(1)
    }

    if (!body) {
        return null
    }

    const references = []
    const parts = body.split(";")

    for (const part of parts) {
        const match = part.match(/^([^\[]+)(?:\[(.*?)\])?(?:\[(.*?)\])?$/)
        if (!match) {
            return null
        }
        const entryKey = match[1].trim()
        if (!entryKey) {
            continue
        }
        const bibEntry = bibEntries.find(entry => entry.entry_key === entryKey)
        if (!bibEntry) {
            return null
        }
        let id = bibEntry.id
        if (bibEntry.source === "user") {
            const bib = bibDB.db[id]
            id = bibDB.addReference(bib, id)
        }
        const ref = {id}
        if (match[2]) {
            ref.prefix = match[2]
        }
        if (match[3]) {
            ref.locator = match[3]
        }
        references.push(ref)
    }

    if (!references.length) {
        return null
    }

    return {references, format}
}

/**
 * Extract the active reference index based on cursor offset.
 */
function getActiveRefIndex(text, cursorOffset) {
    let pos = 0
    const parts = text.split(";")
    for (let i = 0; i < parts.length; i++) {
        const partLen = parts[i].length
        if (cursorOffset <= pos + partLen) {
            return i
        }
        pos += partLen + 1
    }
    return Math.max(0, parts.length - 1)
}

/**
 * Get the query (key being typed) for the active reference.
 */
function getActiveQuery(text, activeIndex) {
    const parts = text.split(";")
    let part = parts[activeIndex] || ""
    if (part.startsWith("@@")) {
        part = part.slice(2)
    } else if (part.startsWith("@")) {
        part = part.slice(1)
    }
    const match = part.match(/^([^\[]*)/)
    return match ? match[1] : ""
}

/**
 * Replace the key of the active reference while preserving prefix/locator.
 */
function replaceActiveKey(text, activeIndex, newKey) {
    const parts = text.split(";")
    let part = parts[activeIndex] || ""
    let trigger = ""
    if (part.startsWith("@@")) {
        trigger = "@@"
        part = part.slice(2)
    } else if (part.startsWith("@")) {
        trigger = "@"
        part = part.slice(1)
    }
    const suffixMatch = part.match(/^[^\[]*(\[.*)$/)
    const suffix = suffixMatch ? suffixMatch[1] : ""
    parts[activeIndex] = trigger + newKey + suffix
    return parts.join(";")
}

/**
 * Convert a citation node back to its inline text representation.
 */
function citationToText(node, bibEntries) {
    const format = node.attrs.format
    const references = node.attrs.references || []
    const parts = references.map(ref => {
        const entry = bibEntries.find(e => e.id === ref.id)
        const key = entry ? entry.entry_key : ""
        let part = key
        if (ref.prefix) {
            part += `[${ref.prefix}]`
        }
        if (ref.locator) {
            part += `[${ref.locator}]`
        }
        return part
    })
    const body = parts.join(";")
    if (format === "textcite") {
        return "@@" + body
    }
    return "@" + body
}

function getInputCursorPos(el) {
    const sel = window.getSelection()
    if (!sel || !sel.rangeCount) {
        return (el.textContent || "").length
    }
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) {
        return (el.textContent || "").length
    }
    return range.startOffset
}

function setInputCursorPos(el, pos) {
    const textNode = el.firstChild
    if (!textNode) {
        return
    }
    const range = document.createRange()
    const safePos = Math.max(0, Math.min(pos, textNode.length))
    range.setStart(textNode, safePos)
    range.collapse(true)
    const sel = window.getSelection()
    if (sel) {
        sel.removeAllRanges()
        sel.addRange(range)
    }
}

/**
 * Create the inline citation widget DOM element.
 */
function createCitationWidget(editor, pluginState, key) {
    const view = editor.currentView || editor.view
    const container = document.createElement("span")
    container.className = "citation-inline-widget"

    // Build the cross-reference target list once at widget creation time.
    const crossRefList = buildCrossRefList(editor)

    const input = document.createElement("span")
    input.contentEditable = "plaintext-only"
    input.spellcheck = false
    input.className = "citation-inline-input"
    input.textContent = pluginState.query

    const dropUpWrapper = document.createElement("span")
    dropUpWrapper.className = "drop-up-outer citation-drop-up"

    function renderDropUp() {
        const currentState = key.getState(view.state)
        if (!currentState?.active) {
            return
        }
        const cursorPos = getInputCursorPos(input)
        const activeIndex = getActiveRefIndex(input.textContent, cursorPos)
        const query = getActiveQuery(input.textContent, activeIndex)
        const citationMatches = filterBibliography(currentState.bibList, query)
        const xrefMatches = filterCrossRefs(crossRefList, query)
        const totalMatches = citationMatches.length + xrefMatches.length
        const selectedIndex = currentState.listActive
            ? Math.max(
                  0,
                  Math.min(currentState.selectedIndex, totalMatches - 1)
              )
            : -1
        dropUpWrapper.innerHTML = ""
        const dropUp = createCitationDropUp(
            citationMatches,
            selectedIndex,
            idx => {
                if (idx < citationMatches.length) {
                    const entry = citationMatches[idx]
                    if (!entry) {
                        return
                    }
                    const newText = replaceActiveKey(
                        input.textContent,
                        activeIndex,
                        entry.entry_key
                    )
                    input.textContent = newText
                    // Move cursor to end of replaced key
                    const newCursor = newText.indexOf(
                        entry.entry_key,
                        newText.indexOf("@") + 1
                    )
                    setInputCursorPos(input, newCursor + entry.entry_key.length)
                    view.dispatch(
                        view.state.tr.setMeta(key, {
                            action: "updateQuery",
                            query: input.textContent
                        })
                    )
                    renderDropUp()
                } else {
                    const target = xrefMatches[idx - citationMatches.length]
                    if (!target) {
                        return
                    }
                    view.dispatch(
                        view.state.tr.setMeta(key, {
                            action: "insertCrossRef",
                            id: target.id,
                            title: target.text
                        })
                    )
                }
            },
            xrefMatches
        )
        dropUpWrapper.appendChild(dropUp)
        // Scroll selected item into view
        const selectedItem = dropUp.querySelector(
            ".citation-drop-up-item.selected"
        )
        if (selectedItem) {
            selectedItem.scrollIntoView({block: "nearest"})
        }
    }

    input.addEventListener("input", event => {
        event.stopPropagation()
        view.dispatch(
            view.state.tr.setMeta(key, {
                action: "updateQuery",
                query: input.textContent
            })
        )
        renderDropUp()
    })

    input.addEventListener("keypress", event => {
        event.stopPropagation()
    })

    input.addEventListener("keydown", event => {
        event.stopPropagation()
        const currentState = key.getState(view.state)
        if (!currentState?.active) {
            return
        }

        switch (event.key) {
            case "ArrowLeft":
                if (getInputCursorPos(input) === 0) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(key, {action: "cancelLeft"})
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
                        view.state.tr.setMeta(key, {action: "commitAndRight"})
                    )
                    view.focus()
                }
                break
            case "ArrowDown":
                event.preventDefault()
                {
                    const currentState = key.getState(view.state)
                    if (!currentState.listActive) {
                        view.dispatch(
                            view.state.tr.setMeta(key, {
                                action: "select",
                                index: 0,
                                listActive: true
                            })
                        )
                    } else {
                        view.dispatch(
                            view.state.tr.setMeta(key, {
                                action: "select",
                                index: currentState.selectedIndex + 1,
                                listActive: true
                            })
                        )
                    }
                    renderDropUp()
                }
                break
            case "ArrowUp":
                event.preventDefault()
                {
                    const currentState = key.getState(view.state)
                    if (
                        currentState.listActive &&
                        currentState.selectedIndex > 0
                    ) {
                        view.dispatch(
                            view.state.tr.setMeta(key, {
                                action: "select",
                                index: currentState.selectedIndex - 1,
                                listActive: true
                            })
                        )
                    } else {
                        view.dispatch(
                            view.state.tr.setMeta(key, {
                                action: "select",
                                index: -1,
                                listActive: false
                            })
                        )
                    }
                    renderDropUp()
                }
                break
            case "Enter":
                event.preventDefault()
                {
                    const currentState = key.getState(view.state)
                    const cursorPos = getInputCursorPos(input)
                    const activeIndex = getActiveRefIndex(
                        input.textContent,
                        cursorPos
                    )
                    const query = getActiveQuery(input.textContent, activeIndex)
                    const citMatches = filterBibliography(
                        currentState.bibList,
                        query
                    )
                    const xrefMatchesEnter = filterCrossRefs(
                        crossRefList,
                        query
                    )
                    const totalEnter =
                        citMatches.length + xrefMatchesEnter.length
                    const selectedIndex = Math.max(
                        0,
                        Math.min(currentState.selectedIndex, totalEnter - 1)
                    )
                    if (
                        currentState.listActive &&
                        totalEnter > 0 &&
                        currentState.selectedIndex >= 0
                    ) {
                        if (selectedIndex < citMatches.length) {
                            // Insert selected citation key into input
                            const entry = citMatches[selectedIndex]
                            const newText = replaceActiveKey(
                                input.textContent,
                                activeIndex,
                                entry.entry_key
                            )
                            input.textContent = newText
                            const newCursor =
                                newText.indexOf(
                                    entry.entry_key,
                                    newText.indexOf("@") + 1
                                ) + entry.entry_key.length
                            setInputCursorPos(input, newCursor)
                            view.dispatch(
                                view.state.tr.setMeta(key, {
                                    action: "updateQuery",
                                    query: input.textContent
                                })
                            )
                            renderDropUp()
                        } else {
                            // Insert selected cross-reference immediately
                            const target =
                                xrefMatchesEnter[
                                    selectedIndex - citMatches.length
                                ]
                            view.dispatch(
                                view.state.tr.setMeta(key, {
                                    action: "insertCrossRef",
                                    id: target.id,
                                    title: target.text
                                })
                            )
                            view.focus()
                        }
                    } else {
                        // Not in list mode or no matches: commit what we have
                        view.dispatch(
                            view.state.tr.setMeta(key, {action: "commit"})
                        )
                        view.focus()
                    }
                }
                break
            case "Escape":
                event.preventDefault()
                view.dispatch(view.state.tr.setMeta(key, {action: "cancel"}))
                view.focus()
                break
            case "Home":
                event.preventDefault()
                setInputCursorPos(input, 0)
                break
            case "End":
                event.preventDefault()
                setInputCursorPos(input, (input.textContent || "").length)
                break
            case "Backspace":
                if ((input.textContent || "").length <= 1) {
                    event.preventDefault()
                    view.dispatch(
                        view.state.tr.setMeta(key, {action: "cancel"})
                    )
                }
                break
            case "Tab":
                event.preventDefault()
                view.dispatch(view.state.tr.setMeta(key, {action: "commit"}))
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
        setTimeout(() => {
            const currentState = key.getState(view.state)
            if (currentState?.active && currentState.widgetId === myWidgetId) {
                view.dispatch(view.state.tr.setMeta(key, {action: "commit"}))
            }
        }, 1)
    })

    container.addEventListener("mousedown", event => {
        event.stopPropagation()
    })

    container.appendChild(input)
    container.appendChild(dropUpWrapper)

    // Focus after mounting
    setTimeout(() => {
        input.focus()
        // Place cursor based on entry direction
        if (pluginState.cursorAtStart === true) {
            setInputCursorPos(input, 0)
        } else {
            setInputCursorPos(input, (input.textContent || "").length)
        }
        renderDropUp()
    }, 0)

    return container
}

export const inlineReferencePlugin = options => {
    const editor = options.editor
    const bibDB = editor.mod.db.bibDB
    console.log({bibDB: bibDB})

    const enabled =
        editor.app.config.user?.preferences?.inline_citations === true &&
        !READ_ONLY_ROLES.includes(editor.docInfo.access_rights) &&
        !COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)

    if (!enabled) {
        return new Plugin({
            key,
            state: {
                init() {
                    return {active: false}
                },
                apply() {
                    return {active: false}
                }
            }
        })
    }

    return new Plugin({
        key,
        state: {
            init() {
                return {
                    active: false,
                    from: 0,
                    query: "",
                    selectedIndex: -1,
                    listActive: false,
                    isEdit: false,
                    citationPos: 0,
                    bibList: [],
                    widgetId: undefined,
                    cursorAtStart: undefined,
                    decos: DecorationSet.empty
                }
            },
            apply(tr, prev, _oldState, _state) {
                let next = {...prev}
                const meta = tr.getMeta(key)

                if (meta?.action === "activate") {
                    next = {
                        active: true,
                        from: meta.from,
                        query: meta.query || "",
                        selectedIndex: -1,
                        listActive: false,
                        isEdit: meta.isEdit || false,
                        citationPos: meta.citationPos || 0,
                        bibList: meta.bibList || [],
                        widgetId: Math.random().toString(36).slice(2),
                        cursorAtStart: meta.cursorAtStart,
                        decos: DecorationSet.empty
                    }
                } else if (meta?.action === "deactivate") {
                    next = {
                        active: false,
                        from: 0,
                        query: "",
                        selectedIndex: -1,
                        listActive: false,
                        isEdit: false,
                        citationPos: 0,
                        bibList: [],
                        widgetId: undefined,
                        cursorAtStart: undefined,
                        decos: DecorationSet.empty
                    }
                } else if (meta?.action === "select") {
                    next.selectedIndex = meta.index
                    if (meta.listActive !== undefined) {
                        next.listActive = meta.listActive
                    }
                } else if (meta?.action === "updateQuery") {
                    next.query = meta.query
                    next.selectedIndex = -1
                    next.listActive = false
                }

                if (next.active) {
                    if (!prev.active || prev.from !== next.from) {
                        // Position changed or just activated: create new widget
                        const deco = Decoration.widget(
                            next.from,
                            () => {
                                return createCitationWidget(editor, next, key)
                            },
                            {
                                key: "inline-citation-widget",
                                side: -1
                            }
                        )
                        const citationNodeDeco = Decoration.node(
                            next.from,
                            next.from + 1,
                            {
                                class: "hide"
                            }
                        )
                        next.decos = DecorationSet.create(_state.doc, [
                            deco,
                            citationNodeDeco
                        ])
                    } else if (tr.docChanged) {
                        // Document changed while active: map old decorations
                        next.decos = prev.decos.map(tr.mapping, _state.doc)
                    } else {
                        // Same position, doc unchanged: keep existing widget
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

            if (
                meta?.action === "commit" ||
                meta?.action === "commitAndRight"
            ) {
                if (!oldPluginState.active) {
                    return null
                }
                const parsed = parseCitationText(
                    oldPluginState.query,
                    oldPluginState.bibList,
                    bibDB
                )
                if (!parsed) {
                    if (oldPluginState.isEdit) {
                        const node = newState.doc.nodeAt(
                            oldPluginState.citationPos
                        )
                        const newPos =
                            oldPluginState.citationPos + (node?.nodeSize || 1)
                        const tr = newState.tr.setSelection(
                            TextSelection.create(newState.doc, newPos)
                        )
                        return tr.setMeta(key, {action: "deactivate"})
                    }
                    // Invalid new citation: insert as plain text with caret after
                    const tr = newState.tr.insertText(
                        oldPluginState.query,
                        oldPluginState.from
                    )
                    const newPos =
                        oldPluginState.from + oldPluginState.query.length
                    tr.setSelection(TextSelection.create(tr.doc, newPos))
                    return tr.setMeta(key, {action: "deactivate"})
                }
                const citationNode = newState.schema.nodes.citation.create({
                    format: parsed.format,
                    references: parsed.references
                })
                if (oldPluginState.isEdit) {
                    const tr = newState.tr.setNodeMarkup(
                        oldPluginState.citationPos,
                        null,
                        {
                            format: parsed.format,
                            references: parsed.references
                        }
                    )
                    const node = tr.doc.nodeAt(oldPluginState.citationPos)
                    const newPos =
                        oldPluginState.citationPos + (node?.nodeSize || 1)
                    tr.setSelection(TextSelection.create(tr.doc, newPos))
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    const tr = newState.tr.insert(
                        oldPluginState.from,
                        citationNode
                    )
                    const newPos = oldPluginState.from + citationNode.nodeSize
                    tr.setSelection(TextSelection.create(tr.doc, newPos))
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            if (meta?.action === "cancel") {
                if (oldPluginState.isEdit) {
                    // Editing: just deactivate, leave citation unchanged
                    const node = newState.doc.nodeAt(oldPluginState.citationPos)
                    const newPos =
                        oldPluginState.citationPos + (node?.nodeSize || 1)
                    const tr = newState.tr.setSelection(
                        TextSelection.create(newState.doc, newPos)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    // New citation: insert query as plain text with caret after
                    const tr = newState.tr.insertText(
                        oldPluginState.query,
                        oldPluginState.from
                    )
                    const newPos =
                        oldPluginState.from + oldPluginState.query.length
                    tr.setSelection(TextSelection.create(tr.doc, newPos))
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            if (meta?.action === "cancelLeft") {
                if (oldPluginState.isEdit) {
                    const tr = newState.tr.setSelection(
                        TextSelection.create(
                            newState.doc,
                            oldPluginState.citationPos
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    const tr = newState.tr.insertText(
                        oldPluginState.query,
                        oldPluginState.from
                    )
                    tr.setSelection(
                        TextSelection.create(tr.doc, oldPluginState.from)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            if (meta?.action === "openDialog") {
                if (oldPluginState.active && oldPluginState.isEdit) {
                    // Deactivate the inline editor and leave a NodeSelection on
                    // the citation so CitationDialog opens with its content.
                    const node = newState.doc.nodeAt(oldPluginState.citationPos)
                    if (node?.type.name === "citation") {
                        return newState.tr
                            .setSelection(
                                NodeSelection.create(
                                    newState.doc,
                                    oldPluginState.citationPos
                                )
                            )
                            .setMeta(key, {action: "deactivate"})
                    }
                }
                return null
            }

            if (meta?.action === "insertCrossRef") {
                if (!oldPluginState.active) {
                    return null
                }
                const crossRefNode =
                    newState.schema.nodes.cross_reference.create({
                        id: meta.id,
                        title: meta.title
                    })
                if (oldPluginState.isEdit) {
                    // Replace the existing citation node with a cross_reference.
                    const existingNode = newState.doc.nodeAt(
                        oldPluginState.citationPos
                    )
                    const tr = newState.tr.replaceWith(
                        oldPluginState.citationPos,
                        oldPluginState.citationPos +
                            (existingNode?.nodeSize || 1),
                        crossRefNode
                    )
                    tr.setSelection(
                        TextSelection.create(
                            tr.doc,
                            oldPluginState.citationPos + crossRefNode.nodeSize
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    const tr = newState.tr.insert(
                        oldPluginState.from,
                        crossRefNode
                    )
                    tr.setSelection(
                        TextSelection.create(
                            tr.doc,
                            oldPluginState.from + crossRefNode.nodeSize
                        )
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                }
            }

            if (oldPluginState.active) {
                // If selection moved away from the widget, commit
                if (
                    trs.some(tr => tr.selectionSet) &&
                    (newState.selection.from !== oldPluginState.from ||
                        newState.selection.to !== oldPluginState.from)
                ) {
                    const parsed = parseCitationText(
                        oldPluginState.query,
                        oldPluginState.bibList,
                        bibDB
                    )
                    if (parsed) {
                        const citationNode =
                            newState.schema.nodes.citation.create({
                                format: parsed.format,
                                references: parsed.references
                            })
                        if (oldPluginState.isEdit) {
                            return newState.tr
                                .setNodeMarkup(
                                    oldPluginState.citationPos,
                                    null,
                                    {
                                        format: parsed.format,
                                        references: parsed.references
                                    }
                                )
                                .setMeta(key, {action: "deactivate"})
                        } else {
                            return newState.tr
                                .insert(oldPluginState.from, citationNode)
                                .setMeta(key, {action: "deactivate"})
                        }
                    } else if (!oldPluginState.isEdit) {
                        // Invalid citation on blur/selection-move: insert as plain text
                        const tr = newState.tr.insertText(
                            oldPluginState.query,
                            oldPluginState.from
                        )
                        const newPos =
                            oldPluginState.from + oldPluginState.query.length
                        tr.setSelection(TextSelection.create(tr.doc, newPos))
                        return tr.setMeta(key, {action: "deactivate"})
                    } else {
                        return newState.tr.setMeta(key, {
                            action: "deactivate"
                        })
                    }
                }
            } else {
                // Check if a citation node is selected for re-editing (keyboard)
                const selection = newState.selection
                if (
                    selection instanceof NodeSelection &&
                    selection.node.type.name === "citation"
                ) {
                    const citationNode = selection.node
                    const from = selection.from
                    const bibList = buildBibliographyList(editor)
                    const text = citationToText(citationNode, bibList)
                    return newState.tr.setMeta(key, {
                        action: "activate",
                        from: from,
                        query: text,
                        isEdit: true,
                        citationPos: from,
                        bibList: bibList
                    })
                }

                // Check for @ keypress activation via doc change
                // (handles paste/mobile where handleKeyDown may not fire)
                const tr = trs.find(tr => tr.docChanged)
                if (tr) {
                    const $pos = newState.selection.$head
                    if (canInsertCitation(newState, $pos, editor)) {
                        const beforeText = newState.doc.textBetween(
                            Math.max(0, $pos.pos - 3),
                            $pos.pos,
                            ""
                        )
                        if (beforeText.endsWith("@")) {
                            const lastChar = beforeText.slice(-2, -1)
                            if (!lastChar || !/[a-zA-Z0-9]/.test(lastChar)) {
                                const tr = newState.tr
                                    .delete($pos.pos - 1, $pos.pos)
                                    .setMeta(key, {
                                        action: "activate",
                                        from: $pos.pos - 1,
                                        query: "@",
                                        isEdit: false,
                                        bibList: buildBibliographyList(editor)
                                    })
                                return tr
                            }
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
                if (node.type.name === "citation") {
                    const bibList = buildBibliographyList(editor)
                    const text = citationToText(node, bibList)
                    const tr = _view.state.tr.setSelection(
                        TextSelection.create(
                            _view.state.doc,
                            nodePos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: nodePos,
                        query: text,
                        isEdit: true,
                        citationPos: nodePos,
                        bibList: bibList
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
                    const target = event.target.closest(".citation")
                    if (!target) {
                        return false
                    }
                    let pos = view.posAtDOM(target, 0)
                    let node = view.state.doc.nodeAt(pos)
                    if (!node || node.type.name !== "citation") {
                        return false
                    }
                    const pluginState = key.getState(view.state)
                    if (pluginState?.active) {
                        // Commit current widget first, then activate new citation
                        const commitTr = view.state.tr.setMeta(key, {
                            action: "commit"
                        })
                        view.dispatch(commitTr)
                        pos = commitTr.mapping.map(pos)
                        node = view.state.doc.nodeAt(pos)
                        if (!node || node.type.name !== "citation") {
                            return false
                        }
                    }
                    const bibList = buildBibliographyList(editor)
                    const text = citationToText(node, bibList)
                    const tr = view.state.tr.setSelection(
                        TextSelection.create(
                            view.state.doc,
                            pos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: pos,
                        query: text,
                        isEdit: true,
                        citationPos: pos,
                        bibList: bibList
                    })
                    view.dispatch(tr)
                    event.stopPropagation()
                    event.preventDefault()
                    return true
                },
                click(view, event) {
                    // Fallback click handler for touch devices and cases where
                    // mousedown/handleClickOn did not fire.
                    const pluginState = key.getState(view.state)
                    if (pluginState?.active) {
                        const target = event.target.closest(
                            ".citation-inline-widget"
                        )
                        if (target) {
                            // Click inside widget: let widget handle it
                            return false
                        }
                        // When widget is active, ignore all other clicks.
                        // mousedown already handled citation clicks.
                        // focusout handles clicks outside the editor.
                        // We must prevent default because the browser may
                        // retarget click to a parent element after mousedown
                        // prevented the default.
                        event.preventDefault()
                        event.stopPropagation()
                        return true
                    }
                    // Widget inactive: try to activate a clicked citation
                    if (event.ctrlKey || event.metaKey || event.shiftKey) {
                        return false
                    }
                    const target = event.target.closest(".citation")
                    if (!target) {
                        return false
                    }
                    const pos = view.posAtDOM(target, 0)
                    const node = view.state.doc.nodeAt(pos)
                    if (!node || node.type.name !== "citation") {
                        return false
                    }
                    const bibList = buildBibliographyList(editor)
                    const text = citationToText(node, bibList)
                    const tr = view.state.tr.setSelection(
                        TextSelection.create(
                            view.state.doc,
                            pos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: pos,
                        query: text,
                        isEdit: true,
                        citationPos: pos,
                        bibList: bibList
                    })
                    view.dispatch(tr)
                    return true
                }
            },
            handleKeyDown(view, event) {
                const pluginState = key.getState(view.state)
                if (!pluginState?.active) {
                    if (event.key === "@") {
                        const $pos = view.state.selection.$head
                        if (canInsertCitation(view.state, $pos, editor)) {
                            const beforeText = view.state.doc.textBetween(
                                Math.max(0, $pos.pos - 1),
                                $pos.pos,
                                ""
                            )
                            const lastChar = beforeText.slice(-1)
                            if (!lastChar || !/[a-zA-Z0-9]/.test(lastChar)) {
                                event.preventDefault()
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from: $pos.pos,
                                        query: "@",
                                        isEdit: false,
                                        bibList: buildBibliographyList(editor)
                                    })
                                )
                                return true
                            }
                        }
                    }
                    // ArrowRight into citation from the left
                    if (event.key === "ArrowRight") {
                        const sel = view.state.selection
                        if (sel.empty) {
                            const $pos = sel.$head
                            const nodeAfter = $pos.nodeAfter
                            if (
                                nodeAfter &&
                                nodeAfter.type.name === "citation"
                            ) {
                                event.preventDefault()
                                const from = $pos.pos
                                const bibList = buildBibliographyList(editor)
                                const text = citationToText(nodeAfter, bibList)
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from: from,
                                        query: text,
                                        isEdit: true,
                                        citationPos: from,
                                        bibList: bibList,
                                        cursorAtStart: true
                                    })
                                )
                                return true
                            }
                        }
                    }
                    // ArrowLeft into citation from the right
                    if (event.key === "ArrowLeft") {
                        const sel = view.state.selection
                        if (sel.empty) {
                            const $pos = sel.$head
                            const nodeBefore = $pos.nodeBefore
                            if (
                                nodeBefore &&
                                nodeBefore.type.name === "citation"
                            ) {
                                event.preventDefault()
                                const from = $pos.pos - nodeBefore.nodeSize
                                const bibList = buildBibliographyList(editor)
                                const text = citationToText(nodeBefore, bibList)
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from: from,
                                        query: text,
                                        isEdit: true,
                                        citationPos: from,
                                        bibList: bibList,
                                        cursorAtStart: false
                                    })
                                )
                                return true
                            }
                        }
                    }
                    return false
                }
                // When active, the widget traps its own key events.
                // Only handle navigation keys that should move the main cursor.
                return false
            }
        }
    })
}

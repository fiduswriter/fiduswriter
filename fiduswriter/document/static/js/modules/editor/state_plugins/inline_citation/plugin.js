import {
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {
    buildBibliographyList,
    createCitationDropUp,
    filterBibliography
} from "./dropup"

const key = new PluginKey("inlineCitation")

/**
 * Check if citations can be inserted at the given position.
 */
function canInsertCitation(state, $pos) {
    const node = $pos.parent
    const schema = state.schema
    try {
        const citationNode = schema.nodes.citation.create({
            format: "autocite",
            references: []
        })
        // Check at child boundary
        if (node.canReplace($pos.index(), $pos.index(), citationNode)) {
            return true
        }
        // Fallback: if inside a text node, check after it
        if (
            $pos.textOffset > 0 &&
            node.canReplace($pos.index() + 1, $pos.index() + 1, citationNode)
        ) {
            return true
        }
        return false
    } catch (_e) {
        return false
    }
}

/**
 * Parse inline citation text into references array.
 * Format: @key[prefix][locator];key2[prefix2][locator2]
 * Returns {references, format} or null if any key cannot be resolved.
 */
function parseCitationText(text, bibEntries, editor) {
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
            const bib = editor.app.bibDB.db[id]
            id = editor.mod.db.bibDB.addReference(bib, id)
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

/**
 * Create the inline citation widget DOM element.
 */
function createCitationWidget(view, pluginState, key) {
    const container = document.createElement("span")
    container.className = "citation-inline-widget"

    const input = document.createElement("input")
    input.type = "text"
    input.className = "citation-inline-input"
    input.value = pluginState.query

    const dropUpWrapper = document.createElement("span")
    dropUpWrapper.className = "drop-up-outer citation-drop-up"

    function renderDropUp() {
        const currentState = key.getState(view.state)
        if (!currentState?.active) {
            return
        }
        const cursorPos = input.selectionStart || 0
        const activeIndex = getActiveRefIndex(input.value, cursorPos)
        const query = getActiveQuery(input.value, activeIndex)
        const matches = filterBibliography(currentState.bibList, query)
        const selectedIndex = currentState.listActive
            ? Math.max(
                  0,
                  Math.min(currentState.selectedIndex, matches.length - 1)
              )
            : -1
        dropUpWrapper.innerHTML = ""
        const dropUp = createCitationDropUp(matches, selectedIndex, idx => {
            const entry = matches[idx]
            if (!entry) {
                return
            }
            const newText = replaceActiveKey(
                input.value,
                activeIndex,
                entry.entry_key
            )
            input.value = newText
            // Move cursor to end of replaced key
            const newCursor = newText.indexOf(
                entry.entry_key,
                input.value.indexOf("@") + 1
            )
            input.selectionStart = input.selectionEnd =
                newCursor + entry.entry_key.length
            view.dispatch(
                view.state.tr.setMeta(key, {
                    action: "updateQuery",
                    query: input.value
                })
            )
            renderDropUp()
        })
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
                query: input.value
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
                    const cursorPos = input.selectionStart || 0
                    const activeIndex = getActiveRefIndex(
                        input.value,
                        cursorPos
                    )
                    const query = getActiveQuery(input.value, activeIndex)
                    const matches = filterBibliography(
                        currentState.bibList,
                        query
                    )
                    const selectedIndex = Math.max(
                        0,
                        Math.min(currentState.selectedIndex, matches.length - 1)
                    )
                    if (
                        currentState.listActive &&
                        matches.length > 0 &&
                        currentState.selectedIndex >= 0
                    ) {
                        // Insert selected key into input
                        const entry = matches[selectedIndex]
                        const newText = replaceActiveKey(
                            input.value,
                            activeIndex,
                            entry.entry_key
                        )
                        input.value = newText
                        const newCursor =
                            newText.indexOf(
                                entry.entry_key,
                                input.value.indexOf("@") + 1
                            ) + entry.entry_key.length
                        input.selectionStart = input.selectionEnd = newCursor
                        view.dispatch(
                            view.state.tr.setMeta(key, {
                                action: "updateQuery",
                                query: input.value
                            })
                        )
                        renderDropUp()
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
            case "Backspace":
                if (input.value.length <= 1) {
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
        if (!container.contains(related)) {
            view.dispatch(view.state.tr.setMeta(key, {action: "commit"}))
        }
    })

    container.addEventListener("mousedown", event => {
        event.stopPropagation()
    })

    container.appendChild(input)
    container.appendChild(dropUpWrapper)

    // Focus after mounting
    setTimeout(() => {
        input.focus()
        // Place cursor at end
        input.selectionStart = input.selectionEnd = input.value.length
        renderDropUp()
    }, 0)

    return container
}

export const inlineCitationPlugin = options => {
    const editor = options.editor

    const enabled =
        editor.app.config.user?.preferences?.inline_citations === true

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
                                return createCitationWidget(
                                    editor.currentView || editor.view,
                                    next,
                                    key
                                )
                            },
                            {
                                key: "inline-citation-widget",
                                side: -1
                            }
                        )
                        next.decos = DecorationSet.create(_state.doc, [deco])
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

            if (meta?.action === "commit") {
                if (!oldPluginState.active) {
                    return null
                }
                const parsed = parseCitationText(
                    oldPluginState.query,
                    oldPluginState.bibList,
                    editor
                )
                if (!parsed) {
                    if (oldPluginState.isEdit) {
                        return newState.tr.setMeta(key, {action: "deactivate"})
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
                        editor
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
                // Check if a citation node is selected for re-editing
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
                    if (canInsertCitation(newState, $pos)) {
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
            handleKeyDown(view, event) {
                const pluginState = key.getState(view.state)
                if (!pluginState?.active) {
                    if (event.key === "@") {
                        const $pos = view.state.selection.$head
                        if (canInsertCitation(view.state, $pos)) {
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
                    return false
                }
                // When active, the widget traps its own key events.
                // Only handle navigation keys that should move the main cursor.
                return false
            }
        }
    })
}

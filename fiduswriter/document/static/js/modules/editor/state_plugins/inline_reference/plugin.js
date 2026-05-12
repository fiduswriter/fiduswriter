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
    createInlineReferenceDropUp,
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
function canActivateInlineReference(_state, _$pos, editor) {
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
function createInlineReferenceWidget(editor, pluginState, key) {
    const view = editor.currentView || editor.view
    const container = document.createElement("span")
    container.className = "inline-reference-widget"

    // Build the cross-reference target list once at widget creation time.
    const crossRefList = buildCrossRefList(editor)

    const input = document.createElement("span")
    input.contentEditable = "plaintext-only"
    input.spellcheck = false
    input.className = "inline-reference-input"
    input.textContent = pluginState.query

    const dropUpWrapper = document.createElement("span")
    dropUpWrapper.className = "drop-up-outer inline-reference-drop-up"

    function renderDropUp() {
        const currentState = key.getState(view.state)
        if (!currentState?.active) {
            return
        }
        const rawText = input.textContent || ""
        const isXrefMode = rawText.startsWith("@#")
        let citationMatches, xrefMatches, activeCitIndex
        if (isXrefMode) {
            // Cross-reference mode: only show cross-refs, filter by id/text
            citationMatches = []
            xrefMatches = filterCrossRefs(crossRefList, rawText.slice(2))
            activeCitIndex = -1
        } else {
            const cursorPos = getInputCursorPos(input)
            activeCitIndex = getActiveRefIndex(rawText, cursorPos)
            const query = getActiveQuery(rawText, activeCitIndex)
            citationMatches = filterBibliography(currentState.bibList, query)
            xrefMatches = filterCrossRefs(crossRefList, query)
        }
        const totalMatches = citationMatches.length + xrefMatches.length
        const selectedIndex = currentState.listActive
            ? Math.max(
                  0,
                  Math.min(currentState.selectedIndex, totalMatches - 1)
              )
            : -1
        dropUpWrapper.innerHTML = ""
        const dropUp = createInlineReferenceDropUp(
            citationMatches,
            selectedIndex,
            idx => {
                if (idx < citationMatches.length) {
                    const entry = citationMatches[idx]
                    if (!entry) {
                        return
                    }
                    const newText = replaceActiveKey(
                        rawText,
                        activeCitIndex,
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
                    // Cross-reference selected: fill input with @#id, stay open
                    const target = xrefMatches[idx - citationMatches.length]
                    if (!target) {
                        return
                    }
                    input.textContent = `@#${target.id}`
                    setInputCursorPos(input, input.textContent.length)
                    view.dispatch(
                        view.state.tr.setMeta(key, {
                            action: "updateQuery",
                            query: input.textContent
                        })
                    )
                    renderDropUp()
                }
            },
            xrefMatches
        )
        dropUpWrapper.appendChild(dropUp)
        // Scroll selected item into view
        const selectedItem = dropUp.querySelector(
            ".inline-reference-drop-up-item.selected"
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
                    const rawText = input.textContent || ""
                    const isXrefMode = rawText.startsWith("@#")
                    let citMatches, xrefMatchesEnter, activeIndexEnter
                    if (isXrefMode) {
                        citMatches = []
                        xrefMatchesEnter = filterCrossRefs(
                            crossRefList,
                            rawText.slice(2)
                        )
                        activeIndexEnter = -1
                    } else {
                        const cursorPos = getInputCursorPos(input)
                        activeIndexEnter = getActiveRefIndex(rawText, cursorPos)
                        const query = getActiveQuery(rawText, activeIndexEnter)
                        citMatches = filterBibliography(
                            currentState.bibList,
                            query
                        )
                        xrefMatchesEnter = filterCrossRefs(crossRefList, query)
                    }
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
                                rawText,
                                activeIndexEnter,
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
                            // Cross-reference selected: fill input with @#id, stay open
                            const target =
                                xrefMatchesEnter[
                                    selectedIndex - citMatches.length
                                ]
                            input.textContent = `@#${target.id}`
                            setInputCursorPos(input, input.textContent.length)
                            view.dispatch(
                                view.state.tr.setMeta(key, {
                                    action: "updateQuery",
                                    query: input.textContent
                                })
                            )
                            renderDropUp()
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

    const enabled =
        editor.app.config.user?.preferences?.inline_references === true &&
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
                    referenceNodePos: 0,
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
                        referenceNodePos: meta.referenceNodePos || 0,
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
                        referenceNodePos: 0,
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
                                return createInlineReferenceWidget(
                                    editor,
                                    next,
                                    key
                                )
                            },
                            {
                                key: "inline-reference-widget",
                                side: -1
                            }
                        )
                        const referenceNodeDeco = Decoration.node(
                            next.from,
                            next.from + 1,
                            {
                                class: "hide"
                            }
                        )
                        next.decos = DecorationSet.create(_state.doc, [
                            deco,
                            referenceNodeDeco
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
                const query = oldPluginState.query
                // Cross-reference mode: query starts with '@#'
                if (query.startsWith("@#")) {
                    const xrefId = query.slice(2)
                    const crossRefList = buildCrossRefList(editor)
                    const target = crossRefList.find(t => t.id === xrefId)
                    const crossRefNode =
                        newState.schema.nodes.cross_reference.create({
                            id: xrefId || false,
                            title: target ? target.text : null
                        })
                    if (oldPluginState.isEdit) {
                        const existingNode = newState.doc.nodeAt(
                            oldPluginState.referenceNodePos
                        )
                        const tr = newState.tr.replaceWith(
                            oldPluginState.referenceNodePos,
                            oldPluginState.referenceNodePos +
                                (existingNode?.nodeSize || 1),
                            crossRefNode
                        )
                        tr.setSelection(
                            TextSelection.create(
                                tr.doc,
                                oldPluginState.referenceNodePos +
                                    crossRefNode.nodeSize
                            )
                        )
                        return tr.setMeta(key, {action: "deactivate"})
                    } else {
                        const tr = newState.tr.insert(
                            oldPluginState.from,
                            crossRefNode
                        )
                        const newPos =
                            oldPluginState.from + crossRefNode.nodeSize
                        tr.setSelection(TextSelection.create(tr.doc, newPos))
                        return tr.setMeta(key, {action: "deactivate"})
                    }
                }
                const parsed = parseCitationText(
                    query,
                    oldPluginState.bibList,
                    bibDB
                )
                if (!parsed) {
                    if (oldPluginState.isEdit) {
                        const node = newState.doc.nodeAt(
                            oldPluginState.referenceNodePos
                        )
                        const newPos =
                            oldPluginState.referenceNodePos +
                            (node?.nodeSize || 1)
                        const tr = newState.tr.setSelection(
                            TextSelection.create(newState.doc, newPos)
                        )
                        return tr.setMeta(key, {action: "deactivate"})
                    }
                    // Invalid reference text: insert as plain text with caret after
                    const tr = newState.tr.insertText(
                        query,
                        oldPluginState.from
                    )
                    const newPos = oldPluginState.from + query.length
                    tr.setSelection(TextSelection.create(tr.doc, newPos))
                    return tr.setMeta(key, {action: "deactivate"})
                }
                const citationNode = newState.schema.nodes.citation.create({
                    format: parsed.format,
                    references: parsed.references
                })
                if (oldPluginState.isEdit) {
                    const existingNode = newState.doc.nodeAt(
                        oldPluginState.referenceNodePos
                    )
                    const tr = newState.tr.replaceWith(
                        oldPluginState.referenceNodePos,
                        oldPluginState.referenceNodePos +
                            (existingNode?.nodeSize || 1),
                        citationNode
                    )
                    const newPos =
                        oldPluginState.referenceNodePos + citationNode.nodeSize
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
                    // Editing: just deactivate, leave reference unchanged
                    const node = newState.doc.nodeAt(
                        oldPluginState.referenceNodePos
                    )
                    const newPos =
                        oldPluginState.referenceNodePos + (node?.nodeSize || 1)
                    const tr = newState.tr.setSelection(
                        TextSelection.create(newState.doc, newPos)
                    )
                    return tr.setMeta(key, {action: "deactivate"})
                } else {
                    // New reference: insert query as plain text with caret after
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
                            oldPluginState.referenceNodePos
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
                    const node = newState.doc.nodeAt(
                        oldPluginState.referenceNodePos
                    )
                    if (node?.type.name === "citation") {
                        return newState.tr
                            .setSelection(
                                NodeSelection.create(
                                    newState.doc,
                                    oldPluginState.referenceNodePos
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
                        oldPluginState.referenceNodePos
                    )
                    const tr = newState.tr.replaceWith(
                        oldPluginState.referenceNodePos,
                        oldPluginState.referenceNodePos +
                            (existingNode?.nodeSize || 1),
                        crossRefNode
                    )
                    tr.setSelection(
                        TextSelection.create(
                            tr.doc,
                            oldPluginState.referenceNodePos +
                                crossRefNode.nodeSize
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
                    const query = oldPluginState.query
                    // Cross-reference mode
                    if (query.startsWith("@#")) {
                        const xrefId = query.slice(2)
                        if (xrefId && oldPluginState.isEdit) {
                            const crossRefList = buildCrossRefList(editor)
                            const target = crossRefList.find(
                                t => t.id === xrefId
                            )
                            const crossRefNode =
                                newState.schema.nodes.cross_reference.create({
                                    id: xrefId,
                                    title: target ? target.text : null
                                })
                            const existingNode = newState.doc.nodeAt(
                                oldPluginState.referenceNodePos
                            )
                            return newState.tr
                                .replaceWith(
                                    oldPluginState.referenceNodePos,
                                    oldPluginState.referenceNodePos +
                                        (existingNode?.nodeSize || 1),
                                    crossRefNode
                                )
                                .setMeta(key, {action: "deactivate"})
                        } else if (xrefId && !oldPluginState.isEdit) {
                            const crossRefList = buildCrossRefList(editor)
                            const target = crossRefList.find(
                                t => t.id === xrefId
                            )
                            const crossRefNode =
                                newState.schema.nodes.cross_reference.create({
                                    id: xrefId,
                                    title: target ? target.text : null
                                })
                            return newState.tr
                                .insert(oldPluginState.from, crossRefNode)
                                .setMeta(key, {action: "deactivate"})
                        } else {
                            return newState.tr.setMeta(key, {
                                action: "deactivate"
                            })
                        }
                    }
                    const parsed = parseCitationText(
                        query,
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
                            const existingNode = newState.doc.nodeAt(
                                oldPluginState.referenceNodePos
                            )
                            return newState.tr
                                .replaceWith(
                                    oldPluginState.referenceNodePos,
                                    oldPluginState.referenceNodePos +
                                        (existingNode?.nodeSize || 1),
                                    citationNode
                                )
                                .setMeta(key, {action: "deactivate"})
                        } else {
                            return newState.tr
                                .insert(oldPluginState.from, citationNode)
                                .setMeta(key, {action: "deactivate"})
                        }
                    } else if (!oldPluginState.isEdit) {
                        // Invalid reference text on blur/selection-move: insert as plain text
                        const tr = newState.tr.insertText(
                            query,
                            oldPluginState.from
                        )
                        const newPos = oldPluginState.from + query.length
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
                        referenceNodePos: from,
                        bibList: bibList
                    })
                }

                // Check if a cross_reference node is selected for re-editing (keyboard)
                if (
                    selection instanceof NodeSelection &&
                    selection.node.type.name === "cross_reference"
                ) {
                    const crossNode = selection.node
                    const from = selection.from
                    return newState.tr.setMeta(key, {
                        action: "activate",
                        from: from,
                        query: `@#${crossNode.attrs.id || ""}`,
                        isEdit: true,
                        referenceNodePos: from,
                        bibList: buildBibliographyList(editor)
                    })
                }

                // Check for @ keypress activation via doc change
                // (handles paste/mobile where handleKeyDown may not fire)
                const tr = trs.find(tr => tr.docChanged)
                if (tr) {
                    const $pos = newState.selection.$head
                    if (canActivateInlineReference(newState, $pos, editor)) {
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
                        referenceNodePos: nodePos,
                        bibList: bibList
                    })
                    _view.dispatch(tr)
                    return true
                }
                if (node.type.name === "cross_reference") {
                    const tr = _view.state.tr.setSelection(
                        TextSelection.create(
                            _view.state.doc,
                            nodePos + node.nodeSize
                        )
                    )
                    tr.setMeta(key, {
                        action: "activate",
                        from: nodePos,
                        query: `@#${node.attrs.id || ""}`,
                        isEdit: true,
                        referenceNodePos: nodePos,
                        bibList: buildBibliographyList(editor)
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
                    const citTarget = event.target.closest(".citation")
                    const xrefTarget =
                        !citTarget && event.target.closest(".cross-reference")
                    const target = citTarget || xrefTarget
                    if (!target) {
                        return false
                    }
                    let pos = view.posAtDOM(target, 0)
                    let node = view.state.doc.nodeAt(pos)
                    if (
                        !node ||
                        (node.type.name !== "citation" &&
                            node.type.name !== "cross_reference")
                    ) {
                        return false
                    }
                    const pluginState = key.getState(view.state)
                    if (pluginState?.active) {
                        // Commit current widget first
                        const commitTr = view.state.tr.setMeta(key, {
                            action: "commit"
                        })
                        view.dispatch(commitTr)
                        pos = commitTr.mapping.map(pos)
                        node = view.state.doc.nodeAt(pos)
                        if (
                            !node ||
                            (node.type.name !== "citation" &&
                                node.type.name !== "cross_reference")
                        ) {
                            return false
                        }
                    }
                    let query, bibList
                    if (node.type.name === "citation") {
                        bibList = buildBibliographyList(editor)
                        query = citationToText(node, bibList)
                    } else {
                        bibList = buildBibliographyList(editor)
                        query = `@#${node.attrs.id || ""}`
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
                        query,
                        isEdit: true,
                        referenceNodePos: pos,
                        bibList
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
                            ".inline-reference-widget"
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
                        referenceNodePos: pos,
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
                        if (
                            canActivateInlineReference(view.state, $pos, editor)
                        ) {
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
                    // ArrowRight into citation or cross_reference from the left
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
                                        referenceNodePos: from,
                                        bibList: bibList,
                                        cursorAtStart: true
                                    })
                                )
                                return true
                            }
                            if (
                                nodeAfter &&
                                nodeAfter.type.name === "cross_reference"
                            ) {
                                event.preventDefault()
                                const from = $pos.pos
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from: from,
                                        query: `@#${nodeAfter.attrs.id || ""}`,
                                        isEdit: true,
                                        referenceNodePos: from,
                                        bibList: buildBibliographyList(editor),
                                        cursorAtStart: true
                                    })
                                )
                                return true
                            }
                        }
                    }
                    // ArrowLeft into citation or cross_reference from the right
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
                                        referenceNodePos: from,
                                        bibList: bibList,
                                        cursorAtStart: false
                                    })
                                )
                                return true
                            }
                            if (
                                nodeBefore &&
                                nodeBefore.type.name === "cross_reference"
                            ) {
                                event.preventDefault()
                                const from = $pos.pos - nodeBefore.nodeSize
                                view.dispatch(
                                    view.state.tr.setMeta(key, {
                                        action: "activate",
                                        from: from,
                                        query: `@#${nodeBefore.attrs.id || ""}`,
                                        isEdit: true,
                                        referenceNodePos: from,
                                        bibList: buildBibliographyList(editor),
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

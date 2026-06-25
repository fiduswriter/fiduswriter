import {escapeText} from "fwtoolkit"
import {dateToYear, litToText, nameToText} from "../../../bibliography/tools"
import {getInternalTargets} from "../links"

/**
 * Create a drop-up widget for the inline reference editor.
 * @param {Array} citationMatches - Array of {id, entry_key, author, title, year} objects
 * @param {number} selectedIndex - Currently selected index
 * @param {Function} onSelect - Callback when an item is selected
 * @param {Array} crossRefMatches - Array of {id, text} cross-reference objects
 * @returns {HTMLElement} The drop-up DOM element
 */
export function createInlineReferenceDropUp(
    citationMatches,
    selectedIndex,
    onSelect,
    crossRefMatches = []
) {
    const container = document.createElement("span")
    container.classList.add("drop-up-outer", "inline-reference-drop-up")

    const inner = document.createElement("div")
    inner.classList.add("drop-up-inner")

    const hasAnything = citationMatches.length > 0 || crossRefMatches.length > 0

    if (!hasAnything) {
        inner.innerHTML = `<div class="inline-reference-drop-up-empty">${gettext("No matching sources")}</div>`
    } else {
        if (citationMatches.length > 0) {
            const citList = document.createElement("ul")
            citList.classList.add("inline-reference-drop-up-list")
            citationMatches.forEach((match, index) => {
                const li = document.createElement("li")
                li.classList.add("inline-reference-drop-up-item")
                if (index === selectedIndex) {
                    li.classList.add("fw-selected")
                }
                const authorText = match.author ? escapeText(match.author) : ""
                const titleText = match.title
                    ? escapeText(match.title)
                    : gettext("Untitled")
                li.innerHTML = `
                    <span class="citation-drop-up-key">${escapeText(match.entry_key)}</span>
                    <span class="citation-drop-up-meta">${authorText}${match.year ? ` (${escapeText(match.year)})` : ""} — ${titleText}</span>
                `
                li.addEventListener("mousedown", event => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelect(index)
                })
                citList.appendChild(li)
            })
            inner.appendChild(citList)
        }

        if (crossRefMatches.length > 0) {
            const sep = document.createElement("div")
            sep.classList.add("inline-reference-drop-up-section-header")
            sep.textContent = gettext("Cross-references")
            inner.appendChild(sep)

            const xrefList = document.createElement("ul")
            xrefList.classList.add("inline-reference-drop-up-list")
            crossRefMatches.forEach((target, index) => {
                const combinedIndex = citationMatches.length + index
                const li = document.createElement("li")
                li.classList.add("inline-reference-drop-up-item")
                if (combinedIndex === selectedIndex) {
                    li.classList.add("fw-selected")
                }
                li.innerHTML = `
                    <span class="citation-drop-up-key">#${escapeText(target.id)}</span>
                    <span class="citation-drop-up-meta">${escapeText(target.text)}</span>
                `
                li.addEventListener("mousedown", event => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelect(combinedIndex)
                })
                xrefList.appendChild(li)
            })
            inner.appendChild(xrefList)
        }
    }

    container.appendChild(inner)
    return container
}

/**
 * Build a flat list of bibliography entries for matching.
 * Searches both document bibDB and user bibDB.
 * @param {Object} editor - The Editor instance
 * @returns {Array} Array of {id, entry_key, author, title, year, source, entry}
 *   where `entry` is the raw DB object (needed when importing a user entry
 *   into the document bibDB via addReference).
 */
export function buildBibliographyList(editor) {
    const entries = []
    const seenKeys = new Set()

    const addEntries = (db, source) => {
        if (!db) {
            return
        }
        Object.entries(db).forEach(([id, entry]) => {
            if (!entry) {
                return
            }
            const key = entry.entry_key || ""
            if (seenKeys.has(key)) {
                return
            }
            seenKeys.add(key)
            const fields = entry.fields || {}
            const authors = fields.author || fields.editor
            entries.push({
                id: Number.parseInt(id),
                entry_key: key,
                author: authors ? nameToText(authors) : "",
                title: fields.title?.length ? litToText(fields.title) : "",
                year: fields.date ? dateToYear(fields.date) : "",
                source,
                entry
            })
        })
    }

    if (editor.mod?.db?.bibDB?.db) {
        addEntries(editor.mod.db.bibDB.db, "doc")
    }
    if (editor.app?.bibDB?.db) {
        addEntries(editor.app.bibDB.db, "user")
    }

    return entries
}

/**
 * Filter bibliography entries by query string (prefix match on entry_key).
 * @param {Array} entries - Full bibliography list
 * @param {string} query - Search query
 * @returns {Array} Filtered entries
 */
export function filterBibliography(entries, query) {
    if (!query) {
        return entries.slice(0, 50)
    }
    const lowerQuery = query.toLowerCase()
    return entries
        .filter(entry => {
            const key = entry.entry_key.toLowerCase()
            if (key.startsWith(lowerQuery)) {
                return true
            }
            // Fallback: also match against author or title if no key match
            if (!entry.entry_key) {
                const author = (entry.author || "").toLowerCase()
                const title = (entry.title || "").toLowerCase()
                return author.includes(lowerQuery) || title.includes(lowerQuery)
            }
            return false
        })
        .slice(0, 50)
}

/**
 * Build a list of cross-reference targets (headings, figures, tables,
 * code blocks, anchors) from the main document and footnotes.
 * @param {Object} editor - The Editor instance
 * @returns {Array} Array of {id, text} objects
 */
export function buildCrossRefList(editor) {
    const mainState = editor.view.state
    const language = mainState.doc.attrs.language
    const targets = getInternalTargets(mainState, language, "main")
    if (editor.mod?.footnotes?.fnEditor?.view?.state) {
        targets.push(
            ...getInternalTargets(
                editor.mod.footnotes.fnEditor.view.state,
                language,
                "foot"
            )
        )
    }
    return targets
}

/**
 * Filter cross-reference targets by query string (substring match on text).
 * @param {Array} targets - Full cross-reference list
 * @param {string} query - Search query (without leading @)
 * @returns {Array} Filtered targets (max 50)
 */
export function filterCrossRefs(targets, query) {
    if (!query) {
        return targets.slice(0, 50)
    }
    const lq = query.toLowerCase()
    return targets
        .filter(
            t =>
                t.text.toLowerCase().includes(lq) ||
                t.id.toLowerCase().includes(lq)
        )
        .slice(0, 50)
}

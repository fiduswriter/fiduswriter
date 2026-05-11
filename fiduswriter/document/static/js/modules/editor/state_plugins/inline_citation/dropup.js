import {dateToYear, litToText, nameToText} from "../../../bibliography/tools"
import {escapeText} from "../../../common"

/**
 * Create a drop-up widget for inline citation autocomplete.
 * @param {Array} matches - Array of {id, entry_key, author, title, year} objects
 * @param {number} selectedIndex - Currently selected index
 * @param {Function} onSelect - Callback when an item is selected
 * @returns {HTMLElement} The drop-up DOM element
 */
export function createCitationDropUp(matches, selectedIndex, onSelect) {
    const container = document.createElement("span")
    container.classList.add("drop-up-outer", "citation-drop-up")

    const inner = document.createElement("div")
    inner.classList.add("drop-up-inner")

    if (!matches.length) {
        inner.innerHTML = `<div class="citation-drop-up-empty">${gettext("No matching sources")}</div>`
    } else {
        const list = document.createElement("ul")
        list.classList.add("citation-drop-up-list")
        matches.forEach((match, index) => {
            const li = document.createElement("li")
            li.classList.add("citation-drop-up-item")
            if (index === selectedIndex) {
                li.classList.add("selected")
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
            list.appendChild(li)
        })
        inner.appendChild(list)
    }

    container.appendChild(inner)
    return container
}

/**
 * Build a flat list of bibliography entries for matching.
 * Searches both document bibDB and user bibDB.
 * @param {Object} editor - The Editor instance
 * @returns {Array} Array of {id, entry_key, author, title, year, source}
 */
export function buildBibliographyList(editor) {
    const entries = []
    const seenKeys = new Set()

    const addEntries = (db, source) => {
        if (!db) {
            return
        }
        Object.entries(db).forEach(([id, entry]) => {
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
                source
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

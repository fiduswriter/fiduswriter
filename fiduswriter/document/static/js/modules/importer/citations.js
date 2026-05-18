/**
 * Shared citation utilities for DOCX and ODT importers.
 *
 * Converts a CitationResult (from DocxCitationsParser or OdtCitationsParser
 * static methods) plus a BibDB (entries) into a Fidus Writer citation node,
 * and merges the new BibDB entries into the document bibliography.
 *
 * The `bibliography` object passed in is mutated in place: new entries are
 * appended with sequential numeric string keys ("1", "2", …).
 */

/**
 * Given a BibDB returned by a static Citations parser call and the current
 * document bibliography, add every entry that is not yet present (matched by
 * entry_key) and return a mapping from entry_key → bibliography key string.
 *
 * @param {Object} entries  BibDB (Record<number, EntryObject>) from parser
 * @param {Object} bibliography  Fidus Writer bibliography (mutated in place)
 * @returns {Object}  Map of entry_key → bibKey string
 */
function mergeBibEntries(entries, bibliography, bibDB) {
    const keyMap = {}

    for (const entry of Object.values(entries)) {
        if (!entry || !entry.entry_key) {
            continue
        }
        const entryKey = entry.entry_key

        // Check whether this entry_key is already in the bibliography.
        const existing = Object.entries(bibliography).find(
            ([, bibEntry]) => bibEntry && bibEntry.entry_key === entryKey
        )

        if (existing) {
            keyMap[entryKey] = existing[0]
        } else {
            if (bibDB && Object.keys(entry.fields).length === 0) {
                // Jabref citations don't contain any fields. Look up values in bibDB instead
                const bibEntry = Object.values(bibDB.db).find(
                    bibEntry => bibEntry && bibEntry.entry_key === entryKey
                )
                if (bibEntry) {
                    entry.fields = JSON.parse(JSON.stringify(bibEntry.fields))
                    entry.bib_type = bibEntry.bib_type
                }
            }
            // TODO: add for jabref citations - according to entry_key import from user
            // library if useExternalDB is true
            const bibKey = String(Object.keys(bibliography).length + 1)
            bibliography[bibKey] = entry
            keyMap[entryKey] = bibKey
        }
    }

    return keyMap
}

/**
 * Convert a CitationResult from a static DocxCitationsParser or
 * OdtCitationsParser call into a Fidus Writer citation node.
 *
 * The `bibliography` object is mutated in place to include any new entries.
 *
 * Each item in `metadata` (when `retrieveMetadata` was true) may carry:
 *   - id         : entry_key string identifying which entry this item refers to
 *   - prefix     : citation prefix text
 *   - suffix     : citation suffix / locator text (used as `locator`)
 *   - locator    : explicit locator string (preferred over suffix when present)
 *   - authorOnly : boolean – render author name only (maps to "textcite")
 *   - suppressAuthor : boolean – suppress author name (ignored, maps to default)
 *   - authorYear : boolean – render author name and year (maps to "textcite")
 *
 * `format` on the returned citation node matches the Fidus Writer citation schema:
 *   - "textcite"  when authorOnly or authorYear is set on the (single) item (biblatex \textcite)
 *   - "autocite"  otherwise, including when suppressAuthor is set (biblatex \autocite)
 *
 * @param {Object} result       CitationResult from a static parser method
 * @param {Object} bibliography Fidus Writer bibliography (mutated in place)
 * @returns {Object|null}  ProseMirror citation node or null
 */
export function citationResultToNode(result, bibliography, bibDB = false) {
    if (!result || !result.isCitation || !result.entries) {
        return null
    }
    const entries = result.entries
    const metadata = result.metadata || []

    if (Object.keys(entries).length === 0) {
        return null
    }
    const keyMap = mergeBibEntries(entries, bibliography, bibDB)
    // Build the references array from entries.
    //
    const references = Object.entries(entries).map(([_entryId, entry]) => {
        const entryKey = entry.entry_key
        const entryMetadata = metadata.find(meta => meta.entry_key === entryKey)
        return {
            id: keyMap[entryKey],
            prefix: entryMetadata?.prefix || "",
            locator: entryMetadata?.locator || entryMetadata?.suffix || ""
        }
    })

    if (references.length === 0) {
        return null
    }

    // Determine citation format from the first item's metadata flags.
    // "textcite" corresponds to biblatex's \textcite (author-in-text / authorYear).
    // Even authorOnly comes through as "textcite" since it's a similar concept.
    // Everything else, including suppressAuthor, falls back to "autocite".
    // TODO: When an authorOnly citation is followed directly by a suppressAuthor
    // citation, this would display the same as a single authorYear citation and
    // should be treated as such.
    const format =
        metadata.length === 1 &&
        (metadata[0].authorOnly || metadata[0].authorYear)
            ? "textcite"
            : "autocite"

    return {
        type: "citation",
        attrs: {
            format,
            references
        }
    }
}

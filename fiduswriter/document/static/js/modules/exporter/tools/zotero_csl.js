/**
 * Helper functions for creating Zotero-compatible citation data.
 * Uses CSLExporter from biblatex-csl-converter to convert Fidus Writer's
 * internal BibLaTeX format to CSL-JSON.
 */

import {CSLExporter} from "biblatex-csl-converter"

/**
 * Generate a random citation ID similar to Zotero's format.
 * Zotero uses 8-10 character alphanumeric IDs.
 */
function generateCitationId() {
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    let id = ""
    for (let i = 0; i < 8; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return id
}

/**
 * Convert bibliography entries to CSL-JSON format.
 * @param {Object} bibDB - The bibliography database
 * @param {Array} ids - Array of entry IDs to convert
 * @returns {Object} Object mapping IDs to CSL-JSON entries
 */
function convertToCSL(bibDB, ids) {
    const exporter = new CSLExporter(bibDB.db, ids)
    return exporter.parse()
}

/**
 * Create a Zotero citation JSON object.
 * @param {Array} references - Array of {id, prefix?, locator?} from citation node
 * @param {Object} bibDB - Bibliography database
 * @param {string} formattedCitation - Pre-formatted citation text from citeproc
 * @param {string} citationId - Optional citation ID (generated if not provided)
 * @returns {Object} Zotero citation JSON object
 */
export function createZoteroCitation(
    references,
    bibDB,
    formattedCitation,
    citationId = null
) {
    const citationID = citationId || generateCitationId()

    // Get the IDs of all referenced items
    const ids = references.map(ref => ref.id)

    // Convert to CSL-JSON
    const _cslData = convertToCSL(bibDB, ids)
    const citationItems = references
        .map(ref => {
            const entry = bibDB.db[ref.id]

            if (!entry) {
                return null
            }

            const citationKey = entry.entry_key || String(ref.id)
            const item = {
                id: citationKey,
                itemData: {
                    ...ref.item,
                    id: citationKey
                }
            }

            if (ref.locator) {
                item.locator = ref.locator
            }

            if (ref.prefix) {
                item.prefix = ref.prefix
            }

            return item
        })
        .filter(item => item !== null)

    return {
        citationID,
        schema: "https://raw.githubusercontent.com/citation-style-language/schema/master/schemas/input/csl-citation.json",
        properties: {
            formattedCitation,
            plainCitation: formattedCitation,
            noteIndex: 0
        },
        citationItems
    }
}

import {OdtCitationsParser} from "biblatex-csl-converter"
import {citationResultToNode} from "../citations"

/**
 * Check whether an ODT reference mark name belongs to a bibliography region
 * (Zotero ZOTERO_BIBL, Mendeley CSL_BIBLIOGRAPHY).
 * Uses OdtCitationsParser.referenceMarkBibliography().
 *
 * @param {string} markName - text:name attribute value
 * @returns {boolean}
 */
export function isOdtBibliographyReferenceMark(markName) {
    if (!markName) {
        return false
    }
    return OdtCitationsParser.referenceMarkBibliography(markName).isBibliography
}

/**
 * Check whether a text:section name belongs to a bibliography region
 * (Zotero, JabRef).
 * Uses OdtCitationsParser.sectionBibliography().
 *
 * @param {string} sectionName - text:name attribute value
 * @returns {boolean}
 */
export function isOdtBibliographySection(sectionName) {
    if (!sectionName) {
        return false
    }
    return OdtCitationsParser.sectionBibliography(sectionName).isBibliography
}

/**
 * Check whether an ODT reference mark name belongs to a citation.
 * Uses OdtCitationsParser.referenceMarkCitation() with retrieve=false.
 *
 * @param {string} markName - text:name attribute value
 * @returns {boolean}
 */
export function isOdtCitationMark(markName) {
    if (!markName) {
        return false
    }
    return OdtCitationsParser.referenceMarkCitation(markName, false).isCitation
}

/**
 * Parse a citation from an ODT reference mark name and add any new
 * bibliography entries into `bibliography`.
 *
 * Handles Zotero, Mendeley Desktop (legacy), and JabRef reference marks.
 *
 * @param {string} markName     - text:name attribute of the reference-mark-start
 * @param {Object} bibliography - Fidus Writer bibliography (mutated in place)
 * @returns {Object|null}  ProseMirror citation node or null
 */
export function parseOdtReferenceMark(markName, bibliography, bibDB) {
    if (!markName) {
        return null
    }
    const result = OdtCitationsParser.referenceMarkCitation(
        markName,
        true, // retrieve
        true // retrieveMetadata
    )
    return citationResultToNode(result, bibliography, bibDB)
}

/**
 * Parse a citation from a LibreOffice native <text:bibliography-mark> element
 * and add any new bibliography entries into `bibliography`.
 *
 * @param {Object} bibMarkNode  - The parsed text:bibliography-mark XMLElement
 * @param {Object} bibliography - Fidus Writer bibliography (mutated in place)
 * @returns {Object|null}  ProseMirror citation node or null
 */
export function parseOdtBibliographyMark(bibMarkNode, bibliography) {
    if (!bibMarkNode) {
        return null
    }
    const result = OdtCitationsParser.bibliographyMarkCitation(
        bibMarkNode.outerXML,
        true // retrieve
    )
    return citationResultToNode(result, bibliography)
}

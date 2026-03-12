import {DocxCitationsParser} from "biblatex-csl-converter"
import {citationResultToNode} from "../citations"

/**
 * Check whether a field instruction string belongs to a citation.
 * Uses DocxCitationsParser.fieldCitation() with retrieve=false so no BibDB
 * is allocated for the check.
 *
 * @param {string} instrText - Concatenated w:instrText content
 * @returns {boolean}
 */
export function isDocxCitationField(instrText) {
    if (!instrText) {
        return false
    }
    return DocxCitationsParser.fieldCitation(instrText, false).isCitation
}

/**
 * Check whether a field instruction string belongs to a bibliography region
 * (Zotero ZOTERO_BIBL, Word native BIBLIOGRAPHY, EN.REFLIST, etc.).
 * Uses DocxCitationsParser.fieldBibliography() with the accumulated
 * instruction text between begin and separate markers.
 *
 * @param {string} instrText - Concatenated w:instrText content
 * @returns {boolean}
 */
export function isDocxBibliographyField(instrText) {
    if (!instrText) {
        return false
    }

    return DocxCitationsParser.fieldBibliography(instrText).isBibliography
}

/**
 * Check whether a w:sdt node contains a citation (Mendeley v3, Citavi).
 * Uses DocxCitationsParser.sdtCitation() with retrieve=false.
 *
 * @param {Object} sdtNode - The parsed w:sdt XMLElement node
 * @returns {boolean}
 */
export function isDocxSdtCitation(sdtNode) {
    if (!sdtNode) {
        return false
    }
    return DocxCitationsParser.sdtCitation(sdtNode.outerXML, false).isCitation
}

/**
 * Check whether a w:sdt node is a bibliography rendering region
 * (Mendeley v3 bibliography, Citavi bibliography).
 * Uses DocxCitationsParser.sdtBibliography().
 *
 * @param {Object} sdtNode - The parsed w:sdt XMLElement node
 * @returns {boolean}
 */
export function isDocxSdtBibliography(sdtNode) {
    if (!sdtNode) {
        return false
    }
    return DocxCitationsParser.sdtBibliography(sdtNode.outerXML).isBibliography
}

/**
 * Parse a citation from a DOCX field instruction and add any new bibliography
 * entries into `bibliography`.
 *
 * Handles all field-based citation managers: Zotero, Mendeley Desktop
 * (legacy), EndNote (both inline and fldData forms), Citavi (older ADDIN
 * form), and Word native (requires sourcesXml).
 *
 * @param {string}      instrText    - Concatenated w:instrText for this field
 * @param {string|null} fldData      - Base64 content of w:fldData (EndNote),
 *                                     or null/undefined if absent
 * @param {string|null} sourcesXml   - Content of customXml/item1.xml (required
 *                                     only for Word-native citations)
 * @param {Object}      bibliography - Fidus Writer bibliography (mutated)
 * @returns {Object|null}  ProseMirror citation node or null
 */
export function parseDocxFieldCitation(
    instrText,
    fldData,
    sourcesXml,
    bibliography
) {
    if (!instrText) {
        return null
    }
    const options = sourcesXml ? {sourcesXml} : {}
    const result = DocxCitationsParser.fieldCitation(
        instrText,
        true, // retrieve
        true, // retrieveMetadata
        true, // extractWordNative
        fldData || undefined,
        options
    )
    const node = citationResultToNode(result, bibliography)
    return node
}

/**
 * Parse a citation from a DOCX structured document tag (w:sdt) and add any
 * new bibliography entries into `bibliography`.
 *
 * Handles Mendeley Cite v3 and Citavi (modern SDT form).
 *
 * @param {Object} sdtNode      - The parsed w:sdt XMLElement node
 * @param {Object} bibliography - Fidus Writer bibliography (mutated)
 * @returns {Object|null}  ProseMirror citation node or null
 */
export function parseDocxSdtCitation(sdtNode, bibliography) {
    if (!sdtNode) {
        return null
    }
    const result = DocxCitationsParser.sdtCitation(
        sdtNode.outerXML,
        true, // retrieve
        true // retrieveMetadata
    )
    return citationResultToNode(result, bibliography)
}

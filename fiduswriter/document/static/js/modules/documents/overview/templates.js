import {escapeText, localizeDate} from "../../common"

/**
 * Template for the unified document import dialog.
 *
 * @param {Object} params
 * @param {string} params.templateSelector - HTML for template selector (or empty)
 * @param {string} params.e2eeHtml - HTML for E2EE encryption options (or empty)
 * @param {string} params.supportedFormatsText - HTML describing supported formats
 * @returns {string} Dialog body HTML
 */
export const importDocumentTemplate = ({
    templateSelector = "",
    e2eeHtml = "",
    supportedFormatsText = ""
}) =>
    `<form>
        ${templateSelector}
        <div class="fw-select-container">
            <div class="fw-select-head">
                <button type="button" class="fw-button fw-light fw-large" id="import-doc-btn">
                    ${gettext("Select a file")}
                </button>
                <label id="import-doc-name" class="ajax-upload-label"></label>
            </div>
            <input id="doc-uploader" type="file" accept=".fidus,.docx,.odt,.json,.zip" style="display: none;">
        </div>
        ${e2eeHtml}
    </form>
    <div class="noteEl">${supportedFormatsText}</div>`

export const deleteFolderCell = ({subdir, ids}) =>
    `<span class="delete-folder fw-link-text" data-ids="${ids.join(",")}"
        data-title="${escapeText(subdir)}">
        '<i class="fa-solid fa-trash-alt"></i>
</span>`

export const dateCell = ({date}) => ({
    data: localizeDate(date * 1000, "sortable-date"),
    text: localizeDate(date * 1000, "minutes")
})

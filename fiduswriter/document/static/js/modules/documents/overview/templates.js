/** A template for the Fidus Writer document import dialog */
export const importFidusTemplate = () =>
    `<form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">
            <input type="file" id="fidus-uploader" name="fidus" accept=".fidus" required />
            <button id="import-fidus-btn" class="fw-button fw-light fw-large">
                ${gettext('Select a file')}
            </button>
            <label id="import-fidus-name" class="ajax-upload-label"></label>
        </form>`

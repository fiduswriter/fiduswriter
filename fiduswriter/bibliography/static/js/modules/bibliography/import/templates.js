/** a template for the bibliography file import dialog */
export const importBibFileTemplate = () =>
    `<form id="import-bib-form" method="post" enctype="multipart/form-data" class="ajax-upload">
        <input type="file" id="bib-uploader" name="bib" required />
        <span id="import-bib-btn" class="fw-button fw-light fw-large">
            ${gettext("Select a file")}
        </span>
        <label id="import-bib-name" class="ajax-upload-label"></label>
        <div class="import-format-info" style="margin-top: 10px; font-size: 0.9em; color: #666;">
            ${gettext("Supported formats: BibTeX/BibLaTeX, CSL-JSON, RIS, EndNote XML, EndNote Tagged, Citavi XML, Citavi JSON, NBIB/PubMed, ODT citations, DOCX citations")}
        </div>
    </form>`

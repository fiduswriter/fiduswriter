export const wordCounterDialogTemplate = ({words, chars_no_space, chars}) =>
    `<table class="fw-data-table">
        <thead class="fw-data-table-header"><tr>
            <th>${gettext("Number of")}</th>
            <th>${gettext("Document")}</th>
        </tr></thead>
        <tbody class="fw-word-counter-tbody">
            <tr>
                <td>${gettext('Words')}</td>
                <td>${words}</td>
            </tr>
            <tr>
                <td>${gettext('Characters without blanks')}</td>
                <td>${chars_no_space}</td>
            </tr>
            <tr>
                <td>${gettext('Characters with blanks')}</td>
                <td>${chars}</td>
            </tr>
        </tbody>
    </table>`

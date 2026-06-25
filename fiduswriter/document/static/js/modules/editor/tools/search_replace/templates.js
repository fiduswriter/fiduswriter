export const searchDialogTemplate = ({canWrite}) => `<table class="fw-dialog-table">
    <tbody>
        <tr>
            <th><h4 class="fw-tablerow-title">${gettext("Find")}</h4></th>
            <td class="fw-entry-field">
                <input type="text" class="fw-search">
                <div class="search-result-count"></div>
            </td>
        </tr>
        ${
            canWrite
                ? `<tr>
                <th><h4 class="fw-tablerow-title">${gettext("Replace with")}</h4></th>
                <td class="fw-entry-field"><input type="text" class="replace"></td>
            </tr>`
                : ""
        }
    </tbody>
</table>`

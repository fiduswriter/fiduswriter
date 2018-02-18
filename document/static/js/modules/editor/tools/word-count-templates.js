export let wordCounterDialogTemplate = ({dialogHeader, words, chars_no_space, chars}) =>
    `<div id="word-counter-dialog" title="${dialogHeader}">
        <table class="fw-document-table no-fix-layout">
            <thead class="fw-document-table-header"><tr>
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
        </table>
    </div>`

import {escapeText} from "../common"

//template for the list of teammembers
export let teammemberTemplate = ({members}) =>
    members.map(member =>
        `<tr id="user-${member.id}">
            <td width="30">
                <span class="fw-inline">
                    <input type="checkbox" class="entry-select" data-id="${member.id}"/>
                </span>
            </td>
            <td width="350">
                <span><img class="fw-avatar" src="${member.avatar}" /></span>
                <span class="fw-inline">${escapeText(member.name)}</span>
            </td>
            <td width="350">
                <span class="fw-inline">${escapeText(member.email)}</span>
            </td>
            <td width="50" align="center">
                <span class="fw-link-text delete-single-member fw-inline"
                        data-id="${member.id}">
                    <i class="icon-trash"></i>
                </span>
            </td>
        </tr>`
    ).join('')

//template for member adding dialog
export let addTeammemberTemplate = ({dialogHeader}) =>
    `<div id="add-new-member" title="${dialogHeader}">
        <table class="ui-dialog-content-table"><tbody><tr><td>
            <input type="text" name="user_string" id="new-member-user-string"
                    placeholder="${gettext('E-mail address or username')}" />
        </td></tr></tbody></table>
    </div>`

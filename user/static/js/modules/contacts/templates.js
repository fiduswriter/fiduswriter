import {escapeText} from "../common"

//template for the list of teammembers
export const teammemberTemplate = ({members}) =>
    members.map(member =>
        `<tr id="user-${member.id}">
            <td width="30">
                <span class="fw-inline">
                    <input type="checkbox" class="entry-select" data-id="${member.id}"/>
                </span>
            </td>
            <td width="350">
                <span>${member.avatar.html}</span>
                <span class="fw-inline">${escapeText(member.name)}</span>
            </td>
            <td width="350">
                <span class="fw-inline">${escapeText(member.email)}</span>
            </td>
            <td width="50" align="center">
                <span class="fw-link-text delete-single-member fw-inline"
                        data-id="${member.id}">
                    <i class="fa fa-trash-alt"></i>
                </span>
            </td>
        </tr>`
    ).join('')

//template for member adding dialog
export const addTeammemberTemplate = () =>
    `<table class="ui-dialog-content-table"><tbody><tr><td>
        <input type="text" name="user_string" id="new-member-user-string"
                placeholder="${gettext('E-mail address or username')}" />
    </td></tr></tbody></table>`

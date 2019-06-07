import {escapeText} from "../common"

//template for the list of teammembers
export const teammemberTemplate = ({members}) =>
    members.map(member =>
        `<tr id="user-${member.id}">
            <td width="30">
                <input type="checkbox" class="entry-select fw-check" id="member-${member.id}" data-id="${member.id}"/><label for="member-${member.id}"></label>
            </td>
            <td width="350">
                <span>${member.avatar.html}</span>
                ${escapeText(member.name)}
            </td>
            <td width="350">
                ${escapeText(member.email)}
            </td>
            <td width="50" align="center">
                <span class="fw-link-text delete-single-member"
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

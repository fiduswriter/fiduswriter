import {escapeText} from "../common"

//template for the list of contacts
export const contactTemplate = ({contacts}) =>
    contacts.map(contact =>
        `<tr id="user-${contact.id}">
            <td width="30">
                <input type="checkbox" class="entry-select fw-check" id="contact-${contact.type}-${contact.id}" data-type="${contact.type}" data-id="${contact.id}"/><label for="contact-${contact.type}-${contact.id}"></label>
            </td>
            <td width="350">
                <span>${contact.avatar.html}</span>
                ${
    contact.type === 'userinvite' ?
        `${gettext('Invite')}:&nbsp;` :
        ''
}
                ${escapeText(contact.name)}
            </td>
            <td width="350">
                ${escapeText(contact.email)}
            </td>
            <td width="50" align="center">
                <span class="fw-link-text delete-single-contact"
                        data-id="${contact.id}">
                    <i class="fa fa-trash-alt"></i>
                </span>
            </td>
        </tr>`
    ).join('')

//template for contact adding dialog
export const addContactTemplate = () =>
    `<table class="ui-dialog-content-table"><tbody><tr><td>
        <input type="text" name="user_string" id="new-contact-user-string"
                placeholder="${gettext('E-mail address or username')}" />
    </td></tr></tbody></table>`

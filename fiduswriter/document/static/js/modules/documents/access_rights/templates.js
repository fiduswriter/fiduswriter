import {escapeText} from "../../common"

/** The access rights dialogue template */
export const accessRightOverviewTemplate = ({contacts, collaborators, invites}) =>
    `<div id="my-contacts" class="fw-ar-container">
        <h3 class="fw-green-title">${gettext("My contacts")}</h3>
        <table class="fw-data-table">
            <thead class="fw-data-table-header"><tr><th width="337">${gettext("Contacts")}</th></tr></thead>
            <tbody class="fw-data-table-body fw-small">
                ${contactsTemplate({contacts})}
            </tbody>
        </table>
    </div>
    <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button">
        <i class="fa fa-caret-right"></i>
    </span>
    <div id="share-member" class="fw-ar-container">
        <h3 class="fw-green-title">${gettext("My collaborators")}</h3>
        <table class="fw-data-table tablesorter">
            <thead class="fw-data-table-header"><tr>
                    <th width="217">${gettext("Collaborators")}</th>
                    <th width="50" align="center">${gettext("Rights")}</th>
                    <th width="50" align="center">${gettext("Delete")}</th>
            </tr></thead>
            <tbody class="fw-data-table-body fw-small">
                ${collaboratorsTemplate({collaborators})}
                ${invitesTemplate({invites})}
            </tbody>
        </table>
    </div>`

/** The template for an individual row in the left hand side list of users (all contacts) of the access rights dialogue. */
export const contactsTemplate = ({contacts}) =>
    contacts.map(contact =>
        `<tr>
            <td width="337" data-id="${contact.id}" class="fw-checkable fw-checkable-td">
                <span>${contact.avatar.html}</span>
                <span class="fw-inline">${escapeText(contact.name)}</span>
            </td>
        </tr>`
    ).join('')

const rightsPulldown = () =>
`<div class="fw-pulldown fw-left">
    <ul>
        <li>
            <span class="fw-pulldown-header" title="${gettext("Basic access rights")}">
                ${gettext("Basic")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="write" title="${gettext("Write")}">
                <i class="icon-access-write" ></i>&nbsp;${gettext("Write")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="write-tracked" title="${gettext("Write with changes tracked")}">
                <i class="icon-access-write-tracked" ></i>&nbsp;${gettext("Write tracked")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="comment" title="${gettext("Comment")}">
                <i class="icon-access-comment"></i>&nbsp;${gettext("Comment")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="read" title="${gettext("Read")}">
                <i class="icon-access-read"></i>&nbsp;${gettext("Read")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-header" title="${
                    gettext("Access rights used within document review")
                }">
                ${gettext("Review")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="read-without-comments" title="${
                    gettext("Read document but not see comments and chats of others")
                }">
                <i class="icon-access-read-without-comments"></i>&nbsp;${gettext("No comments")}
            </span>
        </li>
        <li>
            <span class="fw-pulldown-item" data-rights="review" title="${
                    gettext("Comment, but not see comments and chats of others")
                }">
                <i class="icon-access-review"></i>&nbsp;${gettext("Review")}
            </span>
        </li>
    </ul>
</div>`


/** The template for the right hand side list of users (the collaborators of the current document) of the access rights dialogue. */
export const collaboratorsTemplate = ({collaborators}) =>
collaborators.map(collaborator =>
    `<tr id="collaborator-${collaborator.user_id}" data-id="${collaborator.user_id}"
    class="collaborator-tr" data-rights="${collaborator.rights}">
        <td width="215">
            <span>${collaborator.avatar.html}</span>
            <span class="fw-inline">${escapeText(collaborator.user_name)}</span>
        </td>
        <td width="50" align="center">
            <div class="fw-inline edit-right-wrapper">
                <i class="icon-access-right icon-access-${collaborator.rights}"></i>
                <i class="fa fa-caret-down edit-right"></i>
                ${rightsPulldown()}
            </div>
        </td>
        <td width="50" align="center">
            <span class="delete-collaborator fw-inline" data-rights="delete">
                <i class="fas fa-trash-alt fw-link-text"></i>
            </span>
        </td>
    </tr>`
).join('')


/** The template for the right hand side list of users (the invites of the current document) of the access rights dialogue. */
export const invitesTemplate = ({invites}) =>
    invites.map(invite =>
        `<tr data-email="${escapeText(invite.email)}"
        class="invite-tr" data-rights="${invite.rights}">
            <td width="215">
                <span class="fw-inline"><em>${gettext('Invite')}: ${escapeText(invite.email)}</em></span>
            </td>
            <td width="50" align="center">
                <div class="fw-inline edit-right-wrapper">
                    <i class="icon-access-right icon-access-${invite.rights}"></i>
                    <i class="fa fa-caret-down edit-right"></i>
                    ${rightsPulldown()}
                </div>
            </td>
            <td width="50" align="center">
                <span class="delete-collaborator fw-inline" data-rights="delete">
                    <i class="fas fa-trash-alt fw-link-text"></i>
                </span>
            </td>
        </tr>`
    ).join('')

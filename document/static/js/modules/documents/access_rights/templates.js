import {escapeText} from "../../common"

/** The access rights dialogue template */
export let accessRightOverviewTemplate = ({contacts, collaborators}) =>
    `<div id="my-contacts" class="fw-ar-container">
        <h3 class="fw-green-title">${gettext("My contacts")}</h3>
        <table class="fw-document-table">
            <thead class="fw-document-table-header"><tr><th width="337">${gettext("Contacts")}</th></tr></thead>
            <tbody class="fw-document-table-body fw-small">
                ${accessRightTrTemplate({contacts})}
            </tbody>
        </table>
    </div>
    <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button">
        <i class="fa fa-caret-right"></i>
    </span>
    <div id="share-member" class="fw-ar-container">
        <h3 class="fw-green-title">${gettext("My collaborators")}</h3>
        <table class="fw-document-table tablesorter">
            <thead class="fw-document-table-header"><tr>
                    <th width="217">${gettext("Collaborators")}</th>
                    <th width="50" align="center">${gettext("Rights")}</th>
                    <th width="50" align="center">${gettext("Delete")}</th>
            </tr></thead>
            <tbody class="fw-document-table-body fw-small">
                ${collaboratorsTemplate({collaborators})}
            </tbody>
        </table>
    </div>`

/** The template for an individual row in the right hand side list of users (all contacts) of the access rights dialogue. */
export let accessRightTrTemplate = ({contacts}) =>
    contacts.map(contact =>
        `<tr>
            <td width="337" data-id="${contact.id}" data-avatar="${contact.avatar}" data-name="${escapeText(contact.name)}" class="fw-checkable fw-checkable-td">
                <span><img class="fw-avatar" src="${contact.avatar}" /></span>
                <span class="fw-inline">${escapeText(contact.name)}</span>
            </td>
        </tr>`
    ).join('')

/** The template for an individual row in the left hand side list of users (the collaborators of the current document) of the access rights dialogue. */
export let collaboratorsTemplate = ({collaborators}) =>
    collaborators.map(collaborator =>
        `<tr id="collaborator-${collaborator.user_id}" data-id="${collaborator.user_id}"
        class="collaborator-tr" data-right="${collaborator.rights}">
            <td width="215">
                <span><img class="fw-avatar" src="${collaborator.avatar}" /></span>
                <span class="fw-inline">${escapeText(collaborator.user_name)}</span>
            </td>
            <td width="50" align="center">
                <div class="fw-inline edit-right-wrapper">
                    <i class="icon-access-right icon-access-${collaborator.rights}"></i>
                    <i class="fa fa-caret-down edit-right"></i>
                    <div class="fw-pulldown fw-left">
                        <ul>
                            <li>
                                <span class="fw-pulldown-header" title="${gettext("Basic access rights")}">
                                    ${gettext("Basic")}
                                </span>
                            </li>
                            <li>
                                <span class="fw-pulldown-item" data-right="write" title="${gettext("Write")}">
                                    <i class="icon-access-write" ></i>&nbsp;${gettext("Write")}
                                </span>
                            </li>
                            <li>
                                <span class="fw-pulldown-item" data-right="comment" title="${gettext("Comment")}">
                                    <i class="icon-access-comment"></i>&nbsp;${gettext("Comment")}
                                </span>
                            </li>
                            <li>
                                <span class="fw-pulldown-item" data-right="read" title="${gettext("Read")}">
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
                                <span class="fw-pulldown-item" data-right="read-without-comments" title="${
                                        gettext("Read document but not see comments and chats of others")
                                    }">
                                    <i class="icon-access-read-without-comments"></i>&nbsp;${gettext("No comments")}
                                </span>
                            </li>
                            <li>
                                <span class="fw-pulldown-item" data-right="review" title="${
                                        gettext("Comment, but not see comments and chats of others")
                                    }">
                                    <i class="icon-access-review"></i>&nbsp;${gettext("Review")}
                                </span>
                            </li>
                        </ul>
                    </div>
                </div>
            </td>
            <td width="50" align="center">
                <span class="delete-collaborator fw-inline" data-right="delete">
                    <i class="fa fa-trash-o fw-link-text"></i>
                </span>
            </td>
        </tr>`
    ).join('')

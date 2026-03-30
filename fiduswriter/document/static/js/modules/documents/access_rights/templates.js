import {avatarTemplate, escapeText} from "../../common"

/** Outer wrapper with two tabs: "People" and "Share link" */
export const accessRightOverviewTemplate = ({contacts, collaborators}) =>
    `<div class="fw-ar-tabs">
        <span class="fw-ar-tab fw-ar-tab-active" data-tab="people">${gettext("People")}</span>
        <span class="fw-ar-tab" data-tab="sharelink">${gettext("Share link")}</span>
    </div>
    <div class="fw-ar-tab-content" data-tab-content="people">
        <div id="my-contacts" class="fw-ar-container">
            <h3 class="fw-green-title">${gettext("My contacts")}</h3>
            <table class="fw-data-table">
                <thead class="fw-data-table-header"><tr><th width="337">${gettext("Contacts")}</th></tr></thead>
                <tbody class="fw-data-table-body fw-small">
                    ${contactsTemplate({contacts})}
                </tbody>
            </table>
        </div>
        <span id="add-share-contact" class="fw-button fw-large fw-square fw-light fw-ar-button">
            <i class="fa fa-caret-right"></i>
        </span>
        <div id="share-contact" class="fw-ar-container">
            <h3 class="fw-green-title">${gettext("My collaborators")}</h3>
            <table class="fw-data-table tablesorter">
                <thead class="fw-data-table-header"><tr>
                        <th width="217">${gettext("Collaborators")}</th>
                        <th width="50" align="center">${gettext("Rights")}</th>
                        <th width="50" align="center">${gettext("Delete")}</th>
                </tr></thead>
                <tbody class="fw-data-table-body fw-small">
                    ${collaboratorsTemplate({collaborators})}
                </tbody>
            </table>
        </div>
    </div>
    <div class="fw-ar-tab-content fw-ar-tab-hidden" data-tab-content="sharelink">
        <div id="share-token-list">
            <p class="fw-ar-loading">${gettext("Loading…")}</p>
        </div>
        <button class="fw-button fw-light fw-add-button" id="create-share-token-btn">
            <i class="fa fa-plus"></i>&nbsp;${gettext("Create new share link")}
        </button>
    </div>`

/** The list of active share-link tokens for a single document */
export const shareTokenListTemplate = ({tokens}) => {
    if (!tokens.length) {
        return `<p class="fw-ar-no-tokens">${gettext("No active share links yet.")}</p>`
    }
    return tokens.map(token => shareTokenRowTemplate({token})).join("")
}

/** A single share-link token row */
export const shareTokenRowTemplate = ({token}) => {
    const expiry = token.expires_at
        ? escapeText(token.expires_at.slice(0, 10))
        : gettext("never")
    const note = token.note ? escapeText(token.note) : ""
    return `<div class="share-token-row" data-token-id="${token.id}">
        <div class="share-token-meta">
            <span class="share-token-rights fw-bold">${escapeText(token.rights)}</span>
            <span class="share-token-expiry">&nbsp;·&nbsp;${gettext("expires")}: ${expiry}</span>
            ${note ? `<span class="share-token-note">&nbsp;·&nbsp;${note}</span>` : ""}
        </div>
        <div class="share-token-url-row">
            <input class="share-token-url-input" type="text" readonly value="${escapeText(token.share_url)}" />
            <button class="fw-button fw-light copy-share-token-btn" data-url="${escapeText(token.share_url)}" title="${gettext("Copy link")}">
                <i class="fa fa-copy"></i>
            </button>
            <button class="fw-button fw-light revoke-share-token-btn" data-token-id="${token.id}" title="${gettext("Revoke")}">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    </div>`
}

/** Sub-dialog for creating a new share link */
export const createShareTokenDialogTemplate = () =>
    `<table class="fw-dialog-table">
        <tbody>
            <tr>
                <th><label for="share-token-rights">${gettext("Rights")}</label></th>
                <td>
                    <select id="share-token-rights" class="fw-button fw-light">
                        <option value="read">${gettext("Read")}</option>
                        <option value="comment">${gettext("Comment")}</option>
                        <option value="write">${gettext("Write")}</option>
                        <option value="write-tracked">${gettext("Write tracked")}</option>
                    </select>
                </td>
            </tr>
            <tr>
                <th><label for="share-token-expires">${gettext("Expires")}</label></th>
                <td>
                    <input id="share-token-expires" type="date" class="fw-button fw-light" placeholder="${gettext("leave empty for no expiry")}" />
                </td>
            </tr>
            <tr>
                <th><label for="share-token-note">${gettext("Note")}</label></th>
                <td>
                    <input id="share-token-note" type="text" class="fw-input" style="width:100%" placeholder="${gettext('optional label, e.g. "for reviewers"')}"/>
                </td>
            </tr>
        </tbody>
    </table>`

/** The template for an individual row in the left hand side list of users (all contacts) of the access rights dialogue. */
export const contactsTemplate = ({contacts}) =>
    contacts
        .map(
            contact =>
                `<tr>
            <td width="337" data-id="${contact.id}" data-type="${contact.type}" class="fw-checkable fw-checkable-td">
                <span>${avatarTemplate({user: contact})}</span>
                <span class="fw-inline">
                ${
                    contact.type === "userinvite"
                        ? `${gettext("Invite")}:&nbsp;`
                        : ""
                }
                    ${escapeText(contact.name)}

                </span>
            </td>
        </tr>`
        )
        .join("")

/** The template for the right hand side list of users (the collaborators of the current document) of the access rights dialogue. */
export const collaboratorsTemplate = ({collaborators}) =>
    collaborators
        .map(
            collaborator =>
                `<tr id="collaborator-${collaborator.holder.type}-${collaborator.holder.id}"
    data-type="${collaborator.holder.type}" data-id="${collaborator.holder.id}"
    class="collaborator-tr" data-rights="${collaborator.rights}">
        <td width="215">
            <span>${avatarTemplate({user: collaborator.holder})}</span>
            <span class="fw-inline">${
                collaborator.holder.type === "userinvite"
                    ? `${gettext("Invite")}: `
                    : ""
            }${escapeText(collaborator.holder.name)}</span>
        </td>
        <td width="50" align="center">
            <div class="fw-inline edit-right-wrapper">
                <i class="icon-access-right icon-access-${collaborator.rights}"></i>
                <i class="fa fa-caret-down edit-right"></i>
            </div>
        </td>
        <td width="50" align="center">
            <span class="delete-collaborator fw-inline" data-rights="delete">
                <i class="fas fa-trash-alt fw-link-text"></i>
            </span>
        </td>
    </tr>`
        )
        .join("")

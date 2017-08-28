import {escapeText} from "../common"

/** A template to confirm the deletion of a user avatar. */
export let confirmDeleteAvatarTemplate = () =>
    `<div id="confirmdeletion"
            title="${gettext('Confirm deletion')}">
        <p>${gettext('Delete the avatar?')}</p>
    </div>`

/** A template to change the user avatar. */
export let changeAvatarDialogTemplate = () =>
    `<div id="change-avatar-dialog" title="${gettext('Upload your profile picture')}">
        <form id="avatar-uploader-form" method="post" enctype="multipart/form-data"
                class="ajax-upload">
            <input type="file" id="avatar-uploader" name="avatar" required />
            <span id="upload-avatar-btn" class="fw-button fw-white fw-large">
                ${gettext('Select a file')}
            </span>
            <label id="uploaded-avatar-name" class="ajax-upload-label"></label>
        </form>
    </div>`

/** A template for the confirmation dialog to delete a user account. */
export let deleteUserDialogTemplate = () =>
    `<div id="confirmaccountdeletion" title="${gettext('Confirm deletion')}"><p>
        ${gettext('Really delete your account? Type in your username below to confirm deletion.')}
    </p><input type="text" id="username-confirmation"></div>`

/** A template for the change email dialog of the user account. */
export let changeEmailDialogTemplate = () =>
    `<div id="fw-add-email-dialog" title="${gettext('Add Email')}">
        <table class="ui-dialog-content-table"><tbody>
            <tr><td>
                <form id="fw-add-email-form" action="" method="post" onsubmit="return false;">
                    <input type="text" name="email" id="new-profile-email"
                            class="fw-profile-dialog-input"
                            placeholder="${gettext('Enter the new E-mail address')}" />
                </form>
            </td></tr>
            <tr><td><span id="fw-add-email-error" class="warning"></span></td></tr>
        </tbody></table>
    </div>`

/** A template for the delete email dialog of the user account. */
export let deleteEmailDialogTemplate = ({text, title}) =>
    `<div id="fw-confirm-email-dialog" title="${escapeText(title)}">
        <p>${escapeText(text)}</p>
    </div>`

/** A template for the change password dialog of the user account. */
export let changePwdDialogTemplate = () =>
    `<div id="fw-change-pwd-dialog" title="${gettext('Change Password')}">
        <table class="ui-dialog-content-table"><tbody>
            <tr><td><form id="fw-password-change-form" action="" method="post"
                    onsubmit="return false;">
                <input type="password" id="old-password-input" name="old_password"
                        class="fw-profile-dialog-input" placeholder="${gettext('Old password')}" /><br />
                <input type="password" id="new-password-input1" name="new_password1"
                        class="fw-profile-dialog-input" placeholder="${gettext('New password')}" /><br />
                <input type="password" id="new-password-input2" name="new_password2"
                        class="fw-profile-dialog-input"
                        placeholder="${gettext('Confirm the new password')}" />
            </form></td></tr>
            <tr><td><span id="fw-password-change-error" class="warning"></span></td></tr>
        </tbody></table>
    </div>`

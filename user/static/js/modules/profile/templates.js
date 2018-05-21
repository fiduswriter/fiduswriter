import {escapeText} from "../common"

/** A template to confirm the deletion of a user avatar. */
export let confirmDeleteAvatarTemplate = () =>
    `<p>${gettext('Delete the avatar?')}</p>`

/** A template to change the user avatar. */
export let changeAvatarDialogTemplate = () =>
    `<form id="avatar-uploader-form" method="post" enctype="multipart/form-data"
            class="ajax-upload">
        <input type="file" id="avatar-uploader" name="avatar" required />
        <span id="upload-avatar-btn" class="fw-button fw-white fw-large">
            ${gettext('Select a file')}
        </span>
        <label id="uploaded-avatar-name" class="ajax-upload-label"></label>
    </form>`

/** A template for the confirmation dialog to delete a user account. */
export let deleteUserDialogTemplate = () =>
    `<h3>
        ${gettext('NOTICE: ALL OF YOUR INFORMATION WILL DISAPPEAR FROM OUR SYSTEM!')}
    </h3>
    <p>
        ${gettext('Really delete your account? Type in your username and password below to confirm deletion.')}
    </p>
    <p>
        ${gettext('We cannot reverse an account deletion.')}
    </p>
    <p>
        ${gettext('Some copies of your files may temporarily be kept in our backup system, but also these will disappear automatically in due time.')}
    </p>
    <input type="text" id="username-confirmation" placeholder="${gettext('Username')}">
    <input type="password" id="password" autocomplete="new-password" placeholder="${gettext('Password')}">`

/** A template for the change email dialog of the user account. */
export let changeEmailDialogTemplate = () =>
    `<table class="ui-dialog-content-table"><tbody>
        <tr><td>
            <form id="fw-add-email-form" action="" method="post" onsubmit="return false;">
                <input type="text" name="email" id="new-profile-email"
                        class="fw-profile-dialog-input"
                        placeholder="${gettext('Enter the new E-mail address')}" />
            </form>
        </td></tr>
        <tr><td><span id="fw-add-email-error" class="warning"></span></td></tr>
    </tbody></table>`

/** A template for the delete email dialog of the user account. */
export let deleteEmailDialogTemplate = ({text}) => `<p>${escapeText(text)}</p>`

/** A template for the change primary email dialog of the user account. */
export let changePrimaryEmailDialogTemplate = ({text}) => `<p>${escapeText(text)}</p>`

/** A template for the change password dialog of the user account. */
export let changePwdDialogTemplate = () =>
    `<table class="ui-dialog-content-table"><tbody>
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
    </tbody></table>`


/** A template for the confirm email/agree to terms page */
export let confirmAccountTemplate = ({confirmationData, confirmQuestionsTemplates}) =>
    `<h1 class="fw-login-title">${gettext('Confirm E-mail Address and Agree to Terms and Conditions')}</h1>
    ${confirmationData.confirmed ? confirmAccountFormTemplate(confirmationData, confirmQuestionsTemplates) : expiredConfirmationLinkTemplate(confirmationData)}
    `

let confirmAccountFormTemplate = ({userName, email}, confirmQuestionsTemplates) =>
    `<p>${
        interpolate(
            gettext(
                'Please confirm that you own the email <a href="mailto:%(email)s">%(email)s</a>, that you apply for the username %(userName)s, and that you have read and agree to our <a href="/pages/terms/" target="_blank">Terms and Conditions</a> and <a href="/pages/privacy/" target="_blank">Privacy Policy</a>.'
            ),
            {email, userName},
            true
        )
    }</p>
    <table>
    ${confirmQuestionsTemplates.map(template => `<tr>${template()}</tr>`).join('')}
    </table>
    <p class="submit-wrapper">
        <button type="submit" id="submit" disabled class="fw-button fw-orange fw-uppercase">${gettext('Confirm')}</button>
    </p>
    `

export let checkTermsTemplate = () =>
    `<td>
        <input type="checkbox" class="checker" id="terms-check">
    </td><td>
        ${gettext('I have read and agree to the <a href="/terms/" target="_blank">Terms and Conditions</a>.')}
    </td>`

export let testServerQuestionTemplate = () =>
    `<td>
        <input type="checkbox" class="checker" id="test-check">
    </td><td>
        ${gettext('I am aware that I am signing up for a test account and that service may be ended abruptly and without notice, leaving me without my files.')}
    </td>`

let expiredConfirmationLinkTemplate = ({emailUrl}) =>
    `<p>
        ${
        interpolate(
            gettext('This e-mail confirmation link expired or is invalid. Please <a href="%(emailUrl)s">issue a new e-mail confirmation request</a>.'),
            {emailUrl},
            true
        )
        }
    </p>`

export let verifiedAccountTemplate = () =>
    `<h1>${gettext('Thanks for verifying!')}</h1>
    <p>${gettext('You can now log in.')}</p>`

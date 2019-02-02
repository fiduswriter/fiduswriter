import {escapeText} from "../common"

/** A template to confirm the deletion of a user avatar. */
export const confirmDeleteAvatarTemplate = () =>
    `<p>${gettext('Delete the avatar?')}</p>`

/** A template to change the user avatar. */
export const changeAvatarDialogTemplate = () =>
    `<span id="upload-avatar-btn" class="fw-button fw-white fw-large">
        ${gettext('Select a file')}
    </span>
    <label id="uploaded-avatar-name" class="ajax-upload-label"></label>`

/** A template for the confirmation dialog to delete a user account. */
export const deleteUserDialogTemplate = () =>
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
export const changeEmailDialogTemplate = () =>
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
export const deleteEmailDialogTemplate = ({text}) => `<p>${escapeText(text)}</p>`

/** A template for the change primary email dialog of the user account. */
export const changePrimaryEmailDialogTemplate = ({text}) => `<p>${escapeText(text)}</p>`

/** A template for the change password dialog of the user account. */
export const changePwdDialogTemplate = () =>
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
export const confirmAccountTemplate = ({confirmationData, confirmQuestionsTemplates}) =>
    `<h1 class="fw-login-title">${gettext('Confirm E-mail Address and Agree to Terms and Conditions')}</h1>
    ${confirmationData.confirmed ? confirmAccountFormTemplate(confirmationData, confirmQuestionsTemplates) : expiredConfirmationLinkTemplate(confirmationData)}
    `

const confirmAccountFormTemplate = ({userName, email}, confirmQuestionsTemplates) =>
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

export const checkTermsTemplate = () =>
    `<td>
        <input type="checkbox" class="checker" id="terms-check">
    </td><td>
        ${gettext('I have read and agree to the <a href="/terms/" target="_blank">Terms and Conditions</a>.')}
    </td>`

export const testServerQuestionTemplate = () =>
    `<td>
        <input type="checkbox" class="checker" id="test-check">
    </td><td>
        ${gettext('I am aware that I am signing up for a test account and that service may be ended abruptly and without notice, leaving me without my files.')}
    </td>`

const expiredConfirmationLinkTemplate = ({emailUrl}) =>
    `<p>
        ${
        interpolate(
            gettext('This e-mail confirmation link expired or is invalid. Please <a href="%(emailUrl)s">issue a new e-mail confirmation request</a>.'),
            {emailUrl},
            true
        )
        }
    </p>`

export const verifiedAccountTemplate = () =>
    `<h1>${gettext('Thanks for verifying!')}</h1>
    <p>${gettext('You can now log in.')}</p>`

export const profileContents = ({avatar, username, first_name, last_name, emails}) =>
    `<div id="profile-wrapper">
        <div id="profile-avatar">
            <img src="${avatar.url}" width="80" height="80" alt="${username}">
            <div id="avatar-pulldown-wrapper">
                <span id="edit-avatar-btn" class="fw-link-text">
                    <i class="fa fa-pencil-alt"></i> ${gettext('Edit profile picture')}
                </span>
                <div id="edit-avatar-pulldown" class="fw-pulldown fw-left">
                    <ul>
                        <li>
                            <span class="fw-pulldown-item change-avatar">
                                <i class="fa fa-file-image-o"></i> ${gettext('Change picture')}
                            </span>
                        </li>
                        ${
                            avatar.uploaded ?
                            `<li>
                                <span class="fw-pulldown-item delete-avatar">
                                    <i class="fa fa-times-circle"></i> ${gettext('Delete picture')}
                                </span>
                            </li>` :
                            ''
                        }
                    </ul>
                </div>
            </div>
        </div>
        <table id="profile-data">
            <tbody>
                <tr>
                    <th>${gettext('Username')}:</th>
                    <td><input type="text" name="username" id="username" value="${escapeText(username)}" /></td>
                </tr>
                <tr>
                    <th>${gettext('First name')}:</th>
                    <td><input type="text" name="firstname" id="first_name" value="${escapeText(first_name)}" /></td>
                </tr>
                <tr>
                    <th>${gettext('Last name')}:</th>
                    <td><input type="text" name="lastname" id="last_name" value="${escapeText(last_name)}" /></td>
                </tr>
                <tr>
                    <th>${gettext('Password')}:</th>
                    <td>
                        <input type="password" value="******" readonly disabled />
                        <span id="fw-edit-profile-pwd" class="fw-link-text"><i class="fa fa-pencil-alt"></i></span>
                    </td>
                </tr>
                <tr>
                    <th class="profile-emial-title">${gettext('Email')}:</th>
                    <td>
                        <table class="fw-document-table">
                            <thead class="fw-document-table-header">
                                <tr>
                                    <th></th>
                                    <th>${gettext('Primary address')}</th>
                                    <th>${gettext('Verified')}</th>
                                    <th>${gettext('Delete')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${
                                    emails.map(
                                        email => `<tr${email.primary ? ' class="primary-email-tr"' : ''}>
                                            <td class="emailaddress">${email.address}</td>
                                            <td>
                                                ${
                                                    email.verified ?
                                                        `<input type="radio" class="primary-email-radio" value="${email.address}"
                                                            name="primaryemail"${ email.primary ? " checked" : ""} />` :
                                                        ''
                                                }
                                            </td>
                                            <td>
                                                ${ email.verified ? '<i class="fa fa-check"></i>' : '<i class="fa fa-check disabled"></i>' }
                                            </td>
                                            <td>
                                                <span class="${ email.primary ? 'disabled' : 'delete-email fw-link-text' }" data-email="${email.address}">
                                                    <i class="fa fa-trash-alt"></i>
                                                </span>
                                            </td>
                                        </tr>`
                                    ).join('')
                                }
                            </tbody>
                        </table>
                        <div class="fw-link-text" id="add-profile-email">
                            <i class="fa fa-plus-circle"></i>
                        </div>
                    </td>
                </tr>
                <tr>
                    <td colspan="2" id="profile-submit-wrapper" >
                        <span id="submit-profile" class="fw-button fw-dark">
                            ${gettext('Submit')}
                        </span>
                        <span id="delete-account" data-username="${username}" class="fw-button fw-orange">
                            ${gettext('Delete account')}
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>`

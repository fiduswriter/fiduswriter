/**
 * @file Templates for editing user.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */
/** A template to confirm the deletion of a user avatar. */
var tmp_confirm_delete_avatar = '<div id="confirmdeletion" title="'
    + gettext('Confirm deletion') + '"><p>'
    + gettext('Delete the avatar') + '?</p></div>';
/** A template to change the user avatar. */
var tmp_change_avatar_dialog = '<div id="change-avatar-dialog" title="' + gettext('Upload your profile picture') + '">\
        <form id="avatar-uploader-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="avatar-uploader" name="avatar" required />\
            <span id="upload-avatar-btn" class="fw-button fw-white fw-large">'
                + gettext('Select a file') +
            '</span>\
            <label id="uploaded-avatar-name" class="ajax-upload-label"></label>\
        </form>\
    </div>';
/** A template for the confirmation dialog to delete a user account. */
var tmp_delete_user_dialog = '<div id="confirmaccountdeletion" title="'
    + gettext('Confirm deletion') + '"><p>'
    + gettext('Really delete your account? Type in your username below to confirm deletion.') +
    '</p><input type="text" id="username-confirmation"></div>';
/** A template for the change email dialog of the user account. */
var tmp_change_email_dialog = '<div id="fw-add-email-dialog" title="' + gettext('Add Email') + '">\
        <table class="ui-dialog-content-table"><tbody>\
            <tr><td>\
                <form id="fw-add-email-form" action="" method="post" onsubmit="return false;">\
                    <input type="text" name="email" id="new-profile-email" class="fw-profile-dialog-input" placeholder="'
                        + gettext('Enter the new E-mail address') + '" />\
                </form>\
            </td></tr>\
            <tr><td><span id="fw-add-email-error" class="warning"></span></td></tr>\
        </tbody></table>\
    </div>';
/** A template for the delete email dialog of the user account. */
var tmp_delete_email_dialog = _.template('<div id="fw-confirm-email-dialog" title="<%= title %>">\
        <p><%- text %></p>\
    </div>');
/** A template for the change password dialog of the user account. */
var tmp_change_pwd_dialog = '<div id="fw-change-pwd-dialog" title="' + gettext('Change Password') + '">\
        <table class="ui-dialog-content-table"><tbody>\
            <tr><td><form id="fw-password-change-form" action="" method="post" onsubmit="return false;">\
                <input type="password" id="old-password-input" name="old_password" class="fw-profile-dialog-input" placeholder="' + gettext('Old password') + '" /><br />\
                <input type="password" id="new-password-input1" name="new_password1" class="fw-profile-dialog-input" placeholder="' + gettext('New password') + '" /><br />\
                <input type="password" id="new-password-input2" name="new_password2" class="fw-profile-dialog-input" placeholder="' + gettext('Confirm the new password') + '" />\
            </form></td></tr>\
            <tr><td><span id="fw-password-change-error" class="warning"></span></td></tr>\
        </tbody></table>\
    </div>';

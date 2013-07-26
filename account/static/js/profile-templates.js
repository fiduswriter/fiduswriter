var tmp_confirm_delete_avatar = '<div id="confirmdeletion" title="'
    + gettext('Confirm deletion') + '"><p>'
    + gettext('Delete the avatar') + '?</p></div>';

var tmp_change_avatar_dialog = '<div id="change-avatar-dialog" title="' + gettext('Upload your profile picture') + '">\
        <form id="avatar-uploader-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="avatar-uploader" name="avatar" required />\
            <span id="upload-avatar-btn" class="fw-button fw-white fw-large">'
                + gettext('Select a file') +
            '</span>\
            <label id="uploaded-avatar-name" class="ajax-upload-label"></label>\
        </form>\
    </div>';

var tmp_delete_user_dialog = '<div id="confirmaccountdeletion" title="'
    + gettext('Confirm deletion') + '"><p>'
    + gettext('Really delete your account? Type in your username below to confirm deletion.') +
    '</p><input type="text" id="username-confirmation"></div>';

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

var tmp_delete_email_dialog = _.template('<div id="fw-confirm-email-dialog" title="<%= title %>">\
        <p><%- text %></p>\
    </div>');

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

import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    deleteUserDialogTemplate, changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate} from "./templates"
import {addDropdownBox, activateWait, deactivateWait, post, postJson, postJsonStatus, addAlert} from "../common"
import {SiteMenu} from "../menu"

let changeAvatarDialog = function() {
    jQuery('body').append(changeAvatarDialogTemplate())
    let buttons = [
        {
            text: gettext('Upload'),
            class: "fw-button fw-dark",
            click: function() {

                let avatarUploaderEl = document.getElementById('avatar-uploader')

                if (!avatarUploaderEl.files.length) {
                    // No file selected
                    return
                }

                activateWait()

                let file = avatarUploaderEl.files[0]

                postJson(
                    '/account/avatar/upload/',
                    {
                        avatar: {
                            file,
                            filename: file.name
                        }
                    }
                ).then(
                    response => document.querySelector('#profile-avatar > img').setAttribute('src', response.avatar)
                ).catch(
                    () => addAlert('error', gettext('Could not update profile avatar'))
                ).then(
                    () => deactivateWait()
                )

                jQuery(this).dialog('close')
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]
    jQuery("#change-avatar-dialog").dialog({
        resizable : false,
        height : 180,
        modal : true,
        buttons,
        create : () => {
            jQuery('#avatar-uploader').bind('change', function() {
                jQuery('#uploaded-avatar-name').html(jQuery(this).val().replace(/C:\\fakepath\\/i, ''))
            })
            jQuery('#upload-avatar-btn').bind('click', () => {
                jQuery('#avatar-uploader').trigger('click')
            })
        },
        close : () => {
            jQuery("#change-avatar-dialog").dialog('destroy').remove()
        }
    })
}

let deleteCurrentUser = function() {
    activateWait()

    post(
        '/account/delete/'
    ).then(
        () => window.location = '/logout/'
    ).catch(
        () => {
            addAlert('error', gettext('Could not delete account'))
            deactivateWait()
        }
    )
}


let deleteAvatar = function() {
    activateWait()

    postJson(
        '/account/avatar/delete/'
    ).then(
        response => document.querySelector('#profile-avatar > img').setAttribute('src', response.avatar)
    ).catch(
        () => addAlert('error', gettext('Could not delete avatar'))
    ).then(
        () => deactivateWait()
    )
}

let deleteAvatarDialog = function() {
    jQuery('body').append(confirmDeleteAvatarTemplate())
    let buttons = [
        {
            text: gettext('Delete'),
            class: "fw-button fw-dark",
            click: function() {
                deleteAvatar()
                jQuery(this).dialog('close')
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]
    jQuery("#confirmdeletion").dialog({
        resizable: false,
        height: 180,
        modal: true,
        buttons,
        close: () => jQuery("#confirmdeletion").dialog('destroy').remove()
    })
}

let saveProfile = function() {
    activateWait()

    post(
        '/account/save/',
        {
            form_data: JSON.stringify({
                user: {
                    username: document.getElementById('username').value,
                    first_name: document.getElementById('first_name').value,
                    last_name: document.getElementById('last_name').value
                }
            })
        }
    ).catch(
        () => addAlert('error', gettext('Could not save profile data'))
    ).then(
        () => deactivateWait()
    )

}

let deleteUserDialog = function() {
    let username = jQuery(this).attr('data-username')
    jQuery('body').append(deleteUserDialogTemplate())
    let buttons = [
        {
            text: gettext('Delete'),
            class: "fw-button fw-dark",
            click: function() {
                let usernamefieldValue = jQuery('#username-confirmation').val()
                if (usernamefieldValue===username) {
                    deleteCurrentUser()
                    jQuery(this).dialog('close')
                }
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]
    jQuery("#confirmaccountdeletion").dialog({
        resizable: false,
        height: 250,
        modal: true,
        buttons,
        close: function() { jQuery(this).dialog('destroy').remove() }
    })
}

let changePwdDialog = function() {
    jQuery('body').append(changePwdDialogTemplate())
    let buttons = [
        {
            text: gettext('Submit'),
            class: "fw-button fw-dark",
            click: () => {
                let oldPwd = document.getElementById('old-password-input').value,
                    newPwd1 = document.getElementById('new-password-input1').value,
                    newPwd2 = document.getElementById('new-password-input2').value

                document.getElementById('fw-password-change-error').innerHTML = ''

                if('' === oldPwd || '' === newPwd1 || '' === newPwd2) {
                    document.getElementById('fw-password-change-error').innerHTML = gettext('All fields are required!')
                    return
                }

                if(newPwd1 !== newPwd2) {
                    document.getElementById('fw-password-change-error').innerHTML = gettext('Please confirm the new password!')
                    return
                }


                activateWait()

                postJsonStatus(
                    '/account/passwordchange/',
                    {
                        old_password: oldPwd,
                        new_password1: newPwd1,
                        new_password2: newPwd2
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            jQuery("#fw-change-pwd-dialog").dialog('close')
                            addAlert('info', gettext('The password has been changed.'))
                        } else {
                            let eMsg
                            if(json.msg.hasOwnProperty('old_password')) {
                                eMsg = json.msg['old_password'][0]
                            } else if(json.msg.hasOwnProperty('new_password1')) {
                                eMsg = json.msg['new_password1'][0]
                            } else if(json.msg.hasOwnProperty('new_password2')) {
                                eMsg = json.msg['new_password2'][0]
                            } else {
                                eMsg = gettext('The password could not be changed!')
                            }
                            document.getElementById('fw-password-change-error').innerHTML = eMsg
                        }
                    }
                ).catch(
                    () => addAlert('error', gettext('The password could not be changed'))
                ).then(
                    () => deactivateWait()
                )
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]

    jQuery("#fw-change-pwd-dialog").dialog({
        resizable: false,
        height: 350,
        modal: true,
        buttons,
        close: function() { jQuery(this).dialog('destroy').remove() }
    })
}

let addEmailDialog = function() {
    jQuery('body').append(changeEmailDialogTemplate())
    let buttons = [
        {
            text: gettext('Submit'),
            class: "fw-button fw-dark",
            click: () => {
                let email = document.getElementById('new-profile-email').value.replace(/(^\s+)|(\s+$)/g, "")

                document.getElementById('fw-add-email-error').innerHTML = ''

                if('' === email) {
                    document.getElementById('fw-add-email-error').innerHTML = gettext('New email address is required!')
                    return
                }

                document.getElementById('new-profile-email').value = email

                postJsonStatus(
                    '/account/emailadd/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            jQuery('#fw-add-email-dialog').dialog('close')
                            addAlert('info', `${gettext('Confirmation e-mail sent to')}: ${email}`)
                        } else {
                            document.getElementById('fw-add-email-error').innerHTML = json.msg['email'][0]
                        }
                    }
                ).catch(
                    () => document.getElementById('fw-add-email-error').innerHTML = gettext('The email could not be added!')
                ).then(
                    () => deactivateWait()
                )
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]

    jQuery("#fw-add-email-dialog").dialog({
        resizable: false,
        height: 230,
        modal: true,
        buttons,
        close: function() { jQuery(this).dialog('destroy').remove() }
    })
}

let deleteEmailDialog = function() {
    let thisTr = jQuery(this).parent().parent(),
        email = jQuery(this).data('email')

    jQuery('body').append(deleteEmailDialogTemplate({
        'title': gettext('Confirm remove'),
        'text':  gettext('Remove the email address') + ': ' + email + '?'
    }))

    let buttons = [
        {
            text: gettext('Remove'),
            class: "fw-button fw-dark",
            click: () => {
                activateWait()

                postJsonStatus(
                    '/account/emaildelete/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 == status) {
                            thisTr.remove()
                        }
                        addAlert('info', gettext(json.msg))
                    }
                ).catch(
                    () => addAlert('error', gettext('The email could not be removed!'))
                ).then(
                    () => {
                        jQuery('#fw-confirm-email-dialog').dialog('close')
                        deactivateWait()
                    }
                )
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() { jQuery(this).dialog('close') }
        }
    ]

    jQuery("#fw-confirm-email-dialog").dialog({
        resizable: false,
        height: 200,
        modal: true,
        buttons,
        close : function() {jQuery(this).dialog('destroy').remove()}
    })
}

let changePrimaryEmailDialog = function() {
    let primEmailRadio = jQuery('.primary-email-radio:checked'),
        primEmailErapper = primEmailRadio.parent().parent(),
        email = primEmailRadio.val()

    jQuery('body').append(deleteEmailDialogTemplate({
        'title': gettext('Confirm set primary'),
        'text':  `${gettext('Set the email address primary')}: ${email}?`
    }))

    let buttons = [
        {
            text: gettext('Submit'),
            class: "fw-button fw-dark",
            click: () => {
                activateWait()

                postJsonStatus(
                    '/account/emailprimary/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 == status) {
                            document.querySelector('tr.primary-email-tr span.disabled').setAttribute('class', 'delete-email fw-link-text')
                            primEmailErapper.find('span.delete-email.fw-link-text').attr('class', 'disabled')
                        } else {
                            jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true)
                        }
                        addAlert('info', gettext(json.msg))
                    }
                ).catch(
                    () => addAlert('error', gettext('The email could not be set primary'))
                ).then(
                    () => {
                        jQuery('#fw-confirm-email-dialog').dialog('close')
                        deactivateWait()
                    }
                )
            }
        },
        {
            text: gettext('Cancel'),
            class: "fw-button fw-orange",
            click: function() {
                jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true)
                jQuery(this).dialog('close')
            }
        }
    ]

    jQuery("#fw-confirm-email-dialog").dialog({
        resizable: false,
        height: 180,
        modal: true,
        buttons,
        close: function() { jQuery(this).dialog('destroy').remove() }
    })
}

export let bind = function() {
    jQuery(document).ready(() => {
        let smenu = new SiteMenu("") // Nothing highlighted
        smenu.init()
        addDropdownBox(jQuery('#edit-avatar-btn'), jQuery('#edit-avatar-pulldown'))
        jQuery('.change-avatar').bind('mousedown', changeAvatarDialog)
        jQuery('.delete-avatar').bind('mousedown', deleteAvatarDialog)
        jQuery('#submit-profile').bind('click', saveProfile)
        jQuery('#delete-account').bind('click', deleteUserDialog)
        jQuery('#fw-edit-profile-pwd').bind('click',changePwdDialog)
        jQuery('#add-profile-email').bind('click', addEmailDialog)
        jQuery(document).on('click', '.delete-email', deleteEmailDialog)
        jQuery('.primary-email-radio').bind('change', changePrimaryEmailDialog)
    })
}

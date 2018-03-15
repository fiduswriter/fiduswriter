import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    deleteUserDialogTemplate, changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate} from "./templates"
import {addDropdownBox, activateWait, deactivateWait, post, postJson, postJsonStatus, addAlert} from "../common"
import {SiteMenu} from "../menu"

let changeAvatarDialog = function() {

    document.body.insertAdjacentHTML(
        'beforeend',
        changeAvatarDialogTemplate()
    )
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
            document.getElementById('avatar-uploader').addEventListener('change', function() {
                document.getElementById('uploaded-avatar-name').innerHTML = this.value.replace(/C:\\fakepath\\/i, '')
            })
            document.getElementById('upload-avatar-btn').addEventListener('click', () => document.getElementById('avatar-uploader').click())
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
    document.body.insertAdjacentHTML(
        'beforeend',
        confirmDeleteAvatarTemplate()
    )
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
    let username = this.dataset.username
    document.body.insertAdjacentHTML(
        'beforeend',
        deleteUserDialogTemplate()
    )
    let buttons = [
        {
            text: gettext('Delete'),
            class: "fw-button fw-dark",
            click: function() {
                let usernamefieldValue = document.getElementById('username-confirmation').value
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
    document.body.insertAdjacentHTML(
        'beforeend',
        changePwdDialogTemplate()
    )
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
    document.body.insertAdjacentHTML(
        'beforeend',
        changeEmailDialogTemplate()
    )
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
    let thisTr = this.parentElement.parentElement,
        email = this.dataset.email

    document.body.insertAdjacentHTML(
        'beforeend',
        deleteEmailDialogTemplate({
            'title': gettext('Confirm remove'),
            'text':  gettext('Remove the email address') + ': ' + email + '?'
        })
    )

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
                            thisTr.parentElement.removeChild(thisTr)
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
    let primEmailRadio = document.querySelector('.primary-email-radio:checked'),
        primEmailErapper = primEmailRadio.parentElement.parentElement,
        email = primEmailRadio.value
    document.body.insertAdjacentHTML(
        'beforeend',
        deleteEmailDialogTemplate({
            'title': gettext('Confirm set primary'),
            'text':  `${gettext('Set the email address primary')}: ${email}?`
        })
    )

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
                            document.querySelector('tr.primary-email-tr .primary-email-radio').checked = true
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
                document.querySelector('tr.primary-email-tr .primary-email-radio').checked = true
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
        addDropdownBox(document.getElementById('edit-avatar-btn'), document.getElementById('edit-avatar-pulldown'))
        document.querySelector('.change-avatar').addEventListener('mousedown', changeAvatarDialog)
        document.querySelector('.delete-avatar').addEventListener('mousedown', deleteAvatarDialog)
        document.getElementById('submit-profile').addEventListener('click', saveProfile)
        document.getElementById('delete-account').addEventListener('click', deleteUserDialog)
        document.getElementById('fw-edit-profile-pwd').addEventListener('click',changePwdDialog)
        document.getElementById('add-profile-email').addEventListener('click', addEmailDialog)
        jQuery(document).on('click', '.delete-email', deleteEmailDialog)
        document.querySelectorAll('.primary-email-radio').forEach(el => el.addEventListener(
            'change', changePrimaryEmailDialog
        ))
    })
}

import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate, changePrimaryEmailDialogTemplate} from "./templates"
import {activateWait, deactivateWait, post, postJson, addAlert, Dialog, escapeText} from "../common"

export const changeAvatarDialog = function(app) {
    const avatarUploader = document.createElement('input')
    avatarUploader.type='file'
    avatarUploader.accept=".png, .jpg, .jpeg"

    const buttons = [
        {
            text: gettext('Upload'),
            classes: "fw-dark",
            click: () => {

                if (!avatarUploader.files.length) {
                    // No file selected
                    return
                }

                activateWait()

                const file = avatarUploader.files[0]

                post(
                    '/account/avatar/upload/',
                    {
                        avatar: {
                            file,
                            filename: file.name
                        }
                    }
                ).then(
                    () => deactivateWait()
                ).then(
                    () => app.getUserInfo()
                ).then(
                    () => app.selectPage()
                ).catch(
                    () => {
                        deactivateWait()
                        addAlert('error', gettext('Could not update profile avatar'))
                    }
                )
                dialog.close()
            }
        },
        {
            type: 'cancel'
        }
    ]
    let dialog = new Dialog({
        id: 'change-avatar-dialog',
        title: gettext('Upload your profile picture'),
        body: changeAvatarDialogTemplate(),
        buttons
    })
    dialog.open()

    avatarUploader.addEventListener('change', () => {
         document.getElementById('uploaded-avatar-name').innerHTML = avatarUploader.value.replace(/C:\\fakepath\\/i, '')
    })
    document.getElementById('upload-avatar-btn').addEventListener(
         'click',
         event => {
             event.preventDefault()
             avatarUploader.click()
         }
    )
}


const deleteAvatar = function(app) {
    activateWait()

    post(
        '/account/avatar/delete/'
    ).then(
        () => deactivateWait()
    ).then(
        () => app.getUserInfo()
    ).then(
        () => app.selectPage()
    ).catch(
        () => {
            deactivateWait()
            addAlert('error', gettext('Could not delete avatar'))
        }
    )
}

export const deleteAvatarDialog = function(app) {
    let buttons = [
        {
            text: gettext('Delete'),
            classes: "fw-dark",
            click: () => {
                deleteAvatar(app)
                dialog.close()
            }
        },
        {
            type: 'cancel'
        }
    ]
    let dialog = new Dialog({
        title: gettext('Confirm deletion'),
        id: 'confirmdeletion',
        icon: 'exclamation-triangle',
        body: confirmDeleteAvatarTemplate(),
        buttons
    })
    dialog.open()
}

export const changePwdDialog = function() {
    let buttons = [
        {
            text: gettext('Submit'),
            classes: "fw-dark",
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

                postJson(
                    '/account/passwordchange/',
                    {
                        old_password: oldPwd,
                        new_password1: newPwd1,
                        new_password2: newPwd2
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            dialog.close()
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
            type: 'cancel'
        }
    ]
    let dialog = new Dialog({
        id: 'fw-change-pwd-dialog',
        title: gettext('Change Password'),
        body: changePwdDialogTemplate(),
        buttons
    })

    dialog.open()
}

export const addEmailDialog = function() {

    let buttons = [
        {
            text: gettext('Submit'),
            classes: "fw-dark",
            click: () => {
                let email = document.getElementById('new-profile-email').value.replace(/(^\s+)|(\s+$)/g, "")

                document.getElementById('fw-add-email-error').innerHTML = ''

                if('' === email) {
                    document.getElementById('fw-add-email-error').innerHTML = gettext('New email address is required!')
                    return
                }

                document.getElementById('new-profile-email').value = email

                postJson(
                    '/account/emailadd/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            dialog.close()
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
            type: 'cancel'
        }
    ]

    let dialog = new Dialog({
        id: 'fw-add-email-dialog',
        title: gettext('Add Email'),
        body: changeEmailDialogTemplate(),
        buttons,
        width: 400
    })
    dialog.open()
}

export const deleteEmailDialog = function(target, app) {
    let thisTr = target.parentElement.parentElement,
        email = target.dataset.email

    let buttons = [
        {
            text: gettext('Remove'),
            classes: "fw-dark",
            click: () => {
                activateWait()

                post(
                    '/account/emaildelete/',
                    {
                        email
                    }
                ).then(
                    () => addAlert('info', gettext('Email succesfully deleted!'))
                ).then(
                    () => {
                        dialog.close()
                        deactivateWait()
                    }
                ).then(
                    () => app.getUserInfo()
                ).then(
                    () => app.selectPage()
                ).catch(
                    () => {
                        deactivateWait()
                        addAlert('error', gettext('The email could not be deleted!'))
                    }
                )
            }
        },
        {
            type: 'cancel'
        }
    ]

    let dialog = new Dialog({
        id: 'fw-confirm-email-dialog',
        title: gettext('Confirm remove'),
        body: deleteEmailDialogTemplate({
            'text':  `${gettext('Remove the email address')}: ${escapeText(email)}?`
        }),
        buttons,
        icon: 'exclamation-triangle'
    })
    dialog.open()

}

export const changePrimaryEmailDialog = function(app) {
    let primEmailRadio = document.querySelector('.primary-email-radio:checked'),
        email = primEmailRadio.value
    let buttons = [
        {
            text: gettext('Submit'),
            classes: "fw-dark",
            click: () => {
                activateWait()

                post(
                    '/account/emailprimary/',
                    {
                        email
                    }
                ).then(
                    () => {
                        dialog.close()
                        deactivateWait()
                    }
                ).then(
                    () => app.getUserInfo()
                ).then(
                    () => app.selectPage()
                ).catch(
                    error => {
                        deactivateWait()
                        addAlert('error', gettext('The email could not be set primary'))
                    }
                )
            }
        },
        {
            type: 'cancel'
        }
    ]

    let dialog = new Dialog({
        id: 'change-primary-email',
        title: gettext('Confirm set primary'),
        body: changePrimaryEmailDialogTemplate({
            'text':  `${gettext('Set this email as the address primary')}: ${email}?`
        }),
        buttons
    })
    dialog.open()
}

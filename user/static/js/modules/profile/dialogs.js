import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate, changePrimaryEmailDialogTemplate} from "./templates"
import {activateWait, deactivateWait, post, postJson, addAlert, Dialog, escapeText} from "../common"

export const changeAvatarDialog = function() {
    let buttons = [
        {
            text: gettext('Upload'),
            classes: "fw-dark",
            click: () => {

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
                    ({json}) => document.querySelector('#profile-avatar > img').setAttribute('src', json.avatar)
                ).catch(
                    () => addAlert('error', gettext('Could not update profile avatar'))
                ).then(
                    () => deactivateWait()
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
        height: 80,
        buttons
    })
    dialog.open()

    document.getElementById('avatar-uploader').addEventListener('change', function() {
        document.getElementById('uploaded-avatar-name').innerHTML = this.value.replace(/C:\\fakepath\\/i, '')
    })
    document.getElementById('upload-avatar-btn').addEventListener('click', () => document.getElementById('avatar-uploader').click())
}


const deleteAvatar = function() {
    activateWait()

    postJson(
        '/account/avatar/delete/'
    ).then(
        ({json}) => document.querySelector('#profile-avatar > img').setAttribute('src', json.avatar)
    ).catch(
        () => addAlert('error', gettext('Could not delete avatar'))
    ).then(
        () => deactivateWait()
    )
}

export const deleteAvatarDialog = function() {
    let buttons = [
        {
            text: gettext('Delete'),
            classes: "fw-dark",
            click: () => {
                deleteAvatar()
                dialog.close()
            }
        },
        {
            type: 'cancel'
        }
    ]
    let dialog = new Dialog({
        height: 180,
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
        height: 250,
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
        height: 100,
        width: 400
    })
    dialog.open()
}

export const deleteEmailDialog = function(target) {
    let thisTr = target.parentElement.parentElement,
        email = target.dataset.email

    let buttons = [
        {
            text: gettext('Remove'),
            classes: "fw-dark",
            click: () => {
                activateWait()

                postJson(
                    '/account/emaildelete/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            thisTr.parentElement.removeChild(thisTr)
                        }
                        addAlert('info', gettext(json.msg))
                    }
                ).catch(
                    () => addAlert('error', gettext('The email could not be removed!'))
                ).then(
                    () => {
                        dialog.close()
                        deactivateWait()
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
        icon: 'exclamation-triangle',
        height: 200
    })
    dialog.open()

}

export const changePrimaryEmailDialog = function() {
    let primEmailRadio = document.querySelector('.primary-email-radio:checked'),
        primEmailErapper = primEmailRadio.parentElement.parentElement,
        email = primEmailRadio.value
    let buttons = [
        {
            text: gettext('Submit'),
            classes: "fw-dark",
            click: () => {
                activateWait()

                postJson(
                    '/account/emailprimary/',
                    {
                        email
                    }
                ).then(
                    ({json, status}) => {
                        if(200 === status) {
                            document.querySelector('tr.primary-email-tr span.disabled').setAttribute('class', 'delete-email fw-link-text')
                            primEmailErapper.querySelector('span.delete-email.fw-link-text').setAttribute('class', 'disabled')
                        } else {
                            document.querySelector('tr.primary-email-tr .primary-email-radio').checked = true
                        }
                        addAlert('info', gettext(json.msg))
                    }
                ).catch(
                    error => {
                        console.error({error})
                        addAlert('error', gettext('The email could not be set primary'))
                    }
                ).then(
                    () => {
                        dialog.close()
                        deactivateWait()
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
        height: 180,
        buttons
    })
    dialog.open()
}

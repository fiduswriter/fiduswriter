import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    deleteUserDialogTemplate, changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate} from "./templates"
import {addDropdownBox, activateWait, deactivateWait, csrfToken} from "../common"
import {SiteMenu} from "../menu"

let changeAvatarDialog = function() {
    jQuery('body').append(changeAvatarDialogTemplate())
    let buttons = [
        {
            text: gettext('Upload'),
            class: "fw-button fw-dark",
            click: function() {
                activateWait()
                let data = new window.FormData(jQuery('#avatar-uploader-form')[0])
                jQuery.ajax({
                    url: '/account/avatar/upload/',
                    data,
                    type: 'POST',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: function(xhr, settings) {
                        xhr.setRequestHeader("X-CSRFToken", csrfToken)
                    },
                    processData: false,
                    contentType: false,
                    dataType: 'json',
                    success: (response, textStatus, jqXHR) => {
                        jQuery('#profile-avatar > img').attr('src', response.avatar)
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        console.log(jqXHR.responseText)
                    },
                    complete: () => deactivateWait()
                })
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
    jQuery.ajax({
        url : '/account/delete/',
        data : {},
        type : 'POST',
        dataType : 'json',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) => {
            xhr.setRequestHeader("X-CSRFToken", csrfToken)
        },
        success : (response, textStatus, jqXHR) => {
            window.location = '/logout/'
        },
        error: (jqXHR, textStatus, errorThrown) => {
            console.log(jqXHR.responseText)
        },
        complete: () => deactivateWait()
    })
}


let deleteAvatar = function() {
    activateWait()
    jQuery.ajax({
        url : '/account/avatar/delete/',
        data : {},
        type : 'POST',
        dataType : 'json',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) =>
            xhr.setRequestHeader("X-CSRFToken", csrfToken),
        success : (response, textStatus, jqXHR) =>
            jQuery('#profile-avatar > img').attr('src', response.avatar),
        error: (jqXHR, textStatus, errorThrown) =>
            console.error(jqXHR.responseText),
        complete: () => deactivateWait()
    })
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
    let postData = {
        'user': {
            'username': jQuery('#username').val(),
            'first_name': jQuery('#first_name').val(),
            'last_name': jQuery('#last_name').val()
        }
    }
    jQuery.ajax({
        url : '/account/save/',
        data : {'form_data': JSON.stringify(postData)},
        type : 'POST',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) => {
            xhr.setRequestHeader("X-CSRFToken", csrfToken)
        },
        error: (jqXHR, textStatus, errorThrown) => {
            if(422 === jqXHR.status) {
                jQuery('#edit_user').removeAttr("disabled")
                let response = jQuery.parseJSON(jqXHR.responseText)
                jQuery.each(response.errors, (fieldname, errmsg) => {
                    let firstError = '<span class="form-error-msg">'+errmsg[0]+'</span>'
                    jQuery('#'+fieldname).after(firstError)
                })
                let eMsg = gettext("Please check the above errors")
                jQuery('#emsg').text( eMsg ).fadeIn('slow')
            } else {
                console.log(jqXHR.responseText)
            }
        },
        complete: () => deactivateWait()
    })
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
                let oldPwd = jQuery('#old-password-input').val(),
                    newPwd1 = jQuery('#new-password-input1').val(),
                    newPwd2 = jQuery('#new-password-input2').val()

                jQuery('#fw-password-change-error').html('')

                if('' === oldPwd || '' === newPwd1 || '' === newPwd2) {
                    jQuery('#fw-password-change-error').html(gettext('All fields are required!'))
                    return
                }

                if(newPwd1 !== newPwd2) {
                    jQuery('#fw-password-change-error').html(gettext('Please confirm the new password!'))
                    return
                }

                let formData = new window.FormData(document.getElementById('fw-password-change-form'))

                activateWait()
                jQuery.ajax({
                    url : '/account/passwordchange/',
                    data: formData,
                    type : 'POST',
                    processData: false,
                    contentType: false,
                    dataType : 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) => {
                        xhr.setRequestHeader("X-CSRFToken", csrfToken)
                    },
                    success: (response, textStatus, jqXHR) => {
                        if(200 === jqXHR.status) {
                            jQuery("#fw-change-pwd-dialog").dialog('close')
                            window.alert(gettext('The password has been changed.'))
                        } else {
                            let eMsg
                            if(response.msg.hasOwnProperty('old_password')) {
                                eMsg = response.msg['old_password'][0]
                            } else if(response.msg.hasOwnProperty('new_password1')) {
                                eMsg = response.msg['new_password1'][0]
                            } else if(response.msg.hasOwnProperty('new_password2')) {
                                eMsg = response.msg['new_password2'][0]
                            } else {
                                eMsg = gettext('The password could not be changed!')
                            }
                            jQuery('#fw-password-change-error').html(eMsg)
                        }
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        jQuery('#fw-password-change-error').html(gettext('The password could not be changed!'))
                    },
                    complete: () => deactivateWait()
                })
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
        height: 300,
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
            click: () => {
                let newEmail = jQuery('#new-profile-email').val()
                newEmail = newEmail.replace(/(^\s+)|(\s+$)/g, "")

                jQuery('#fw-add-email-error').html('')

                if('' === newEmail) {
                    jQuery('#fw-add-email-error').html(gettext('New email address is required!'))
                    return
                }

                jQuery('#new-profile-email').val(newEmail)

                let formData = new window.FormData(document.getElementById('fw-add-email-form'))
                activateWait()
                jQuery.ajax({
                    url : '/account/emailadd/',
                    data: formData,
                    type : 'POST',
                    processData: false,
                    contentType: false,
                    dataType : 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) =>
                        xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success : (response, textStatus, jqXHR) => {
                        if(200 == jqXHR.status) {
                            jQuery('#fw-add-email-dialog').dialog('close')
                            window.alert(gettext('Confirmation e-mail sent to ' + newEmail))
                        } else {
                            let eMsg = response.msg['email'][0]
                            jQuery('#fw-add-email-error').html(eMsg)
                        }
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        jQuery('#fw-add-email-error').html(gettext('The email could not be added!'))
                    },
                    complete: () => deactivateWait()
                })
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
                let formData = new window.FormData()
                formData.append('email', email)

                activateWait()
                jQuery.ajax({
                    url : '/account/emaildelete/',
                    data: formData,
                    type : 'POST',
                    processData: false,
                    contentType: false,
                    dataType : 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) => {
                        xhr.setRequestHeader("X-CSRFToken", csrfToken)
                    },
                    success : (response, textStatus, jqXHR) => {
                        if(200 == jqXHR.status) {
                            thisTr.remove()
                        }
                        jQuery('#fw-confirm-email-dialog').dialog('close')
                        window.alert(gettext(response.msg))
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        jQuery('#fw-confirm-email-dialog').dialog('close')
                        window.alert(gettext('The email could not be removed!'))
                    },
                    complete: () => deactivateWait()
                })
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
        primEmail = primEmailRadio.val()

    jQuery('body').append(deleteEmailDialogTemplate({
        'title': gettext('Confirm set primary'),
        'text':  gettext('Set the email address primary') + ': ' + primEmail + '?'
    }))

    let buttons = [
        {
            text: gettext('Submit'),
            class: "fw-button fw-dark",
            click: () => {
                let formData = new window.FormData()
                formData.append('email', primEmail)

                activateWait()
                jQuery.ajax({
                    url : '/account/emailprimary/',
                    data: formData,
                    type : 'POST',
                    processData: false,
                    contentType: false,
                    dataType : 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) =>
                        xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success : (response, textStatus, jqXHR) => {
                        if(200 == jqXHR.status) {
                            jQuery('tr.primary-email-tr span.disabled').attr('class', 'delete-email fw-link-text')
                            primEmailErapper.find('span.delete-email.fw-link-text').attr('class', 'disabled')
                        } else {
                            jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true)
                        }
                        window.alert(gettext(response.msg))
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        window.alert(gettext('The email could not be set primary!'))
                    },
                    complete: () => {
                        jQuery('#fw-confirm-email-dialog').dialog('close')
                        deactivateWait()
                    }
                })
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

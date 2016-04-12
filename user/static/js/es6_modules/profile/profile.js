import {changeAvatarDialogTemplate, confirmDeleteAvatarTemplate,
    deleteUserDialogTemplate, changePwdDialogTemplate, changeEmailDialogTemplate,
deleteEmailDialogTemplate, } from "./templates"

let changeAvatarDialog = function() {
    jQuery('body').append(changeAvatarDialogTemplate)
    let diaButtons = {}
    diaButtons[gettext('Upload')] = function() {
        let $form, f_data
        $.activateWait()
        $form = jQuery('#avatar-uploader-form')
        f_data = new FormData($form[0])
        $.ajax({
            url : '/account/avatar/upload/',
            data: f_data,
            type : 'POST',
            processData: false,
            contentType: false,
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                jQuery('#profile-avatar > img').attr('src', response.avatar)
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText)
            },
            complete: function() { $.deactivateWait() }
        })
        jQuery(this).dialog('close')
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }
    jQuery("#change-avatar-dialog").dialog({
        resizable : false,
        height : 180,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
            jQuery('#avatar-uploader').bind('change', function() {
                jQuery('#uploaded-avatar-name').html(jQuery(this).val().replace(/C:\\fakepath\\/i, ''))
            })
            jQuery('#upload-avatar-btn').bind('click', function() {
                jQuery('#avatar-uploader').trigger('click')
            })
        },
        close : function() {
            jQuery("#change-avatar-dialog").dialog('destroy').remove()
        }
    })
}

let deleteCurrentUser = function() {
    $.activateWait()
    $.ajax({
        url : '/account/delete/',
        data : {},
        type : 'POST',
        dataType : 'json',
        success : function(response, textStatus, jqXHR) {
            $.deactivateWait()
            window.location = '/logout/'
        },
        error: function(jqXHR, textStatus, errorThrown) {
            $.deactivateWait()
            console.log(jqXHR.responseText)
        },
        complete: function() { $.deactivateWait() }
    })
}


let deleteAvatar = function() {
    $.activateWait()
    $.ajax({
        url : '/account/avatar/delete/',
        data : {},
        type : 'POST',
        dataType : 'json',
        success : function(response, textStatus, jqXHR) {
            jQuery('#profile-avatar > img').attr('src', response.avatar)
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.responseText)
        },
        complete: function() { $.deactivateWait() }
    })
}

let deleteAvatarDialog = function() {
    jQuery('body').append(confirmDeleteAvatarTemplate)
    let diaButtons = {}
    diaButtons[gettext('Delete')] = function() {
        deleteAvatar()
        jQuery(this).dialog('close')
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }
    jQuery("#confirmdeletion").dialog({
        resizable : false,
        height : 180,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery("#confirmdeletion").dialog('destroy').remove() }
    })
}

let saveProfile = function() {
    $.activateWait()
    let post_data = {
        'user': {
            'username': jQuery('#username').val(),
            'first_name': jQuery('#first_name').val(),
            'last_name': jQuery('#last_name').val()
        }
    }
    $.ajax({
        url : '/account/save/',
        data : {'form_data': JSON.stringify(post_data)},
        type : 'POST',
        error: function (jqXHR, textStatus, errorThrown) {
            if(422 == jqXHR.status) {
                jQuery('#edit_user').removeAttr("disabled")
                let response = $.parseJSON(jqXHR.responseText)
                $.each(response.errors, function(fieldname, errmsg) {
                    firstError = '<span class="form-error-msg">'+errmsg[0]+'</span>'
                    jQuery('#'+fieldname).after(firstError)
                })
                let e_msg = gettext("Please check the above errors")
                jQuery('#emsg').text( e_msg ).fadeIn('slow')
            } else {
                console.log(jqXHR.responseText)
            }
        },
        complete: function() { $.deactivateWait() }
    })
}

let deleteUserDialog = function() {
    let username = jQuery(this).attr('data-username')
    jQuery('body').append(deleteUserDialogTemplate)
    let diaButtons = {}
    diaButtons[gettext('Delete')] = function() {
        let usernamefieldValue = jQuery('#username-confirmation').val()
        if (usernamefieldValue===username) {
            deleteCurrentUser()
            jQuery(this).dialog('close')
        }
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }
    jQuery("#confirmaccountdeletion").dialog({
        resizable : false,
        height : 250,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery(this).dialog('destroy').remove() }
    })
}

let changePwdDialog = function() {
    jQuery('body').append(changePwdDialogTemplate)
    let diaButtons = {}
    diaButtons[gettext('Submit')] = function() {
        let old_pwd = jQuery('#old-password-input').val(),
            new_pwd1 = jQuery('#new-password-input1').val(),
            new_pwd2 = jQuery('#new-password-input2').val()

        jQuery('#fw-password-change-error').html('')

        if('' == old_pwd || '' == new_pwd1 || '' == new_pwd2) {
            jQuery('#fw-password-change-error').html(gettext('All fields are required!'))
            return
        }

        if(new_pwd1 != new_pwd2) {
            jQuery('#fw-password-change-error').html(gettext('Please confirm the new password!'))
            return
        }

        let form_data = new FormData(document.getElementById('fw-password-change-form'))

        $.activateWait()
        $.ajax({
            url : '/account/passwordchange/',
            data: form_data,
            type : 'POST',
            processData: false,
            contentType: false,
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(200 == jqXHR.status) {
                    jQuery("#fw-change-pwd-dialog").dialog('close')
                    alert(gettext('The password has been changed.'))
                } else {
                    let error_msg
                    if(response.msg.hasOwnProperty('old_password')) {
                        error_msg = response.msg['old_password'][0]
                    } else if(response.msg.hasOwnProperty('new_password1')) {
                        error_msg = response.msg['new_password1'][0]
                    } else if(response.msg.hasOwnProperty('new_password2')) {
                        error_msg = response.msg['new_password2'][0]
                    } else {
                        error_msg = gettext('The password could not be changed!')
                    }
                    jQuery('#fw-password-change-error').html(error_msg)
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                jQuery('#fw-password-change-error').html(gettext('The password could not be changed!'))
            },
            complete: function() { $.deactivateWait() }
        })
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }

    jQuery("#fw-change-pwd-dialog").dialog({
        resizable : false,
        height : 300,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery(this).dialog('destroy').remove() }
    })
}

let addEmailDialog = function() {
    jQuery('body').append(changeEmailDialogTemplate)
    let diaButtons = {}
    diaButtons[gettext('Submit')] = function() {
        let new_email = jQuery('#new-profile-email').val()
        new_email = new_email.replace(/(^\s+)|(\s+$)/g, "")

        jQuery('#fw-add-email-error').html('')

        if('' == new_email) {
            jQuery('#fw-add-email-error').html(gettext('New email address is required!'))
            return
        }

        jQuery('#new-profile-email').val(new_email)

        let form_data = new FormData(document.getElementById('fw-add-email-form'))
        $.activateWait()
        $.ajax({
            url : '/account/emailadd/',
            data: form_data,
            type : 'POST',
            processData: false,
            contentType: false,
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(200 == jqXHR.status) {
                    jQuery('#fw-add-email-dialog').dialog('close')
                    alert(gettext('Confirmation e-mail sent to ' + new_email))
                } else {
                    let error_msg = response.msg['email'][0]
                    jQuery('#fw-add-email-error').html(error_msg)
                }
            },
            error: function(jqXHR, textStatus, errorThrown) {
                jQuery('#fw-add-email-error').html(gettext('The email could not be added!'))
            },
            complete: function() { $.deactivateWait() }
        })
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }

    jQuery("#fw-add-email-dialog").dialog({
        resizable : false,
        height : 230,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery(this).dialog('destroy').remove() }
    })
}

let deleteEmailDialog = function() {
    let this_tr = jQuery(this).parent().parent()
        email = jQuery(this).data('email'),
        diaButtons = {}

    jQuery('body').append(deleteEmailDialogTemplate({
        'title': gettext('Confirm remove'),
        'text':  gettext('Remove the email address') + ': ' + email + '?'
    }))

    diaButtons[gettext('Remove')] = function() {
        let form_data = new FormData()
        form_data.append('email', email)

        $.activateWait()
        $.ajax({
            url : '/account/emaildelete/',
            data: form_data,
            type : 'POST',
            processData: false,
            contentType: false,
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(200 == jqXHR.status) {
                    this_tr.remove()
                }
                jQuery('#fw-confirm-email-dialog').dialog('close')
                alert(gettext(response.msg))
            },
            error: function(jqXHR, textStatus, errorThrown) {
                jQuery('#fw-confirm-email-dialog').dialog('close')
                alert(gettext('The email could not be removed!'))
            },
            complete: function() { $.deactivateWait() }
        })
    }
    diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close') }

    jQuery("#fw-confirm-email-dialog").dialog({
        resizable : false,
        height : 200,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery(this).dialog('destroy').remove() }
    })
}

let changePrimaryEmailDialog = function() {
    let prim_email_radio = jQuery('.primary-email-radio:checked'),
        prim_email_wrapper = prim_email_radio.parent().parent(),
        prim_email = prim_email_radio.val(),
        diaButtons = {}

    jQuery('body').append(deleteEmailDialogTemplate({
        'title': gettext('Confirm set primary'),
        'text':  gettext('Set the email address primary') + ': ' + prim_email + '?'
    }))

    diaButtons[gettext('Submit')] = function() {
        let form_data = new FormData()
        form_data.append('email', prim_email)

        $.activateWait()
        $.ajax({
            url : '/account/emailprimary/',
            data: form_data,
            type : 'POST',
            processData: false,
            contentType: false,
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(200 == jqXHR.status) {
                    jQuery('tr.primary-email-tr span.disabled').attr('class', 'delete-email fw-link-text')
                    prim_email_wrapper.find('span.delete-email.fw-link-text').attr('class', 'disabled')
                } else {
                    jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true)
                }
                alert(gettext(response.msg))
            },
            error: function(jqXHR, textStatus, errorThrown) {
                alert(gettext('The email could not be set primary!'))
            },
            complete: function() {
                jQuery('#fw-confirm-email-dialog').dialog('close')
                jQuery.deactivateWait()
            }
        })
    }
    diaButtons[gettext('Cancel')] = function() {
        jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true)
        jQuery(this).dialog('close')
    }

    jQuery("#fw-confirm-email-dialog").dialog({
        resizable : false,
        height : 180,
        modal : true,
        buttons : diaButtons,
        create : function() {
            let $the_dialog = jQuery(this).closest(".ui-dialog")
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close : function() { jQuery(this).dialog('destroy').remove() }
    })
}

export let bind = function() {
    jQuery(document).ready(function() {
        jQuery.addDropdownBox(jQuery('#edit-avatar-btn'), jQuery('#edit-avatar-pulldown'))
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

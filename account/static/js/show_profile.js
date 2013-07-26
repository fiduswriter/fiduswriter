$(document).ready(function() {
    var changeAvatarDialog = function() {
        $('body').append(tmp_change_avatar_dialog   );
        var diaButtons = {};
        diaButtons[gettext('Upload')] = function() {
            var $form, f_data;
            $.activateWait();
            $form = $('#avatar-uploader-form');
            f_data = new FormData($form[0]);
            $.ajax({
                url : '/account/avatar/upload/',
                data: f_data,
                type : 'POST',
                processData: false,
                contentType: false,
                dataType : 'json',
                success : function(response, textStatus, jqXHR) {
                    $('#profile-avatar > img').attr('src', response.avatar)
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR.responseText);
                },
                complete: function() { $.deactivateWait(); }
            });
            $(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };
        $("#change-avatar-dialog").dialog({
            resizable : false,
            height : 180,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                $('#avatar-uploader').bind('change', function() {
                    $('#uploaded-avatar-name').html($(this).val().replace(/C:\\fakepath\\/i, ''));
                });
                $('#upload-avatar-btn').bind('click', function() {
                    $('#avatar-uploader').trigger('click');
                });
            },
            close : function() {
                $("#change-avatar-dialog").dialog('destroy').remove();
            }
        });
    };

    var deleteCurrentUser = function() {
        $.activateWait();
        $.ajax({
            url : '/account/delete/',
            data : {},
            type : 'POST',
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                $.deactivateWait();
                window.location = '/logout/';
            },
            error: function(jqXHR, textStatus, errorThrown) {
                $.deactivateWait();
                console.log(jqXHR.responseText);
            },
            complete: function() { $.deactivateWait(); }
        });
    };


    var deleteAvatar = function() {
        $.activateWait();
        $.ajax({
            url : '/account/avatar/delete/',
            data : {},
            type : 'POST',
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                $('#profile-avatar > img').attr('src', response.avatar);
            },
            error: function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            },
            complete: function() { $.deactivateWait(); }
        });
    };

    var deleteAvatarDialog = function() {
        $('body').append(tmp_confirm_delete_avatar);
        var diaButtons = {};
        diaButtons[gettext('Delete')] = function() {
            deleteAvatar();
            $(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };
        $("#confirmdeletion").dialog({
            resizable : false,
            height : 180,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $("#confirmdeletion").dialog('destroy').remove(); }
        });
    };

    var saveProfile = function() {
        $.activateWait();
        var post_data = {
            'user': {
                'username': $('#username').val(),
                'first_name': $('#first_name').val(),
                'last_name': $('#last_name').val()
            }
        }
        $.ajax({
            url : '/account/save/',
            data : {'form_data': JSON.stringify(post_data)},
            type : 'POST',
            error: function (jqXHR, textStatus, errorThrown) {
                if(422 == jqXHR.status) {
                    $('#edit_user').removeAttr("disabled");
                    var response = $.parseJSON(jqXHR.responseText);
                    $.each(response.errors, function(fieldname, errmsg) {
                        firstError = '<span class="form-error-msg">'+errmsg[0]+'</span>';
                        $('#'+fieldname).after(firstError);
                    });
                    e_msg = gettext("Please check the above errors");
                    $('#emsg').text( e_msg ).fadeIn('slow');
                } else {
                    console.log(jqXHR.responseText);
                }
            },
            complete: function() { $.deactivateWait(); }
        });
    }

    var deleteUserDialog = function() {
        var username = $(this).attr('data-username');
        $('body').append(tmp_delete_user_dialog);
        var diaButtons = {};
        diaButtons[gettext('Delete')] = function() {
            var usernamefieldValue = $('#username-confirmation').val();
            if (usernamefieldValue===username) {
                deleteCurrentUser();
                $(this).dialog('close');
            }
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };
        $("#confirmaccountdeletion").dialog({
            resizable : false,
            height : 250,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $(this).dialog('destroy').remove(); }
        });
    };

    var changePwdDialog = function() {
        $('body').append(tmp_change_pwd_dialog);
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function() {
            var old_pwd = jQuery('#old-password-input').val(),
                new_pwd1 = jQuery('#new-password-input1').val(),
                new_pwd2 = jQuery('#new-password-input2').val();

            $('#fw-password-change-error').html('');

            if('' == old_pwd || '' == new_pwd1 || '' == new_pwd2) {
                $('#fw-password-change-error').html(gettext('All fields are required!'));
                return;
            }

            if(new_pwd1 != new_pwd2) {
                $('#fw-password-change-error').html(gettext('Please confirm the new password!'));
                return;
            }

            var form_data = new FormData(document.getElementById('fw-password-change-form'));

            $.activateWait();
            $.ajax({
                url : '/account/passwordchange/',
                data: form_data,
                type : 'POST',
                processData: false,
                contentType: false,
                dataType : 'json',
                success : function(response, textStatus, jqXHR) {
                    if(200 == jqXHR.status) {
                        $("#fw-change-pwd-dialog").dialog('close');
                        alert(gettext('The password has been changed.'));
                    } else {
                        var error_msg;
                        if(response.msg.hasOwnProperty('old_password')) {
                            error_msg = response.msg['old_password'][0];
                        } else if(response.msg.hasOwnProperty('new_password1')) {
                            error_msg = response.msg['new_password1'][0];
                        } else if(response.msg.hasOwnProperty('new_password2')) {
                            error_msg = response.msg['new_password2'][0];
                        } else {
                            error_msg = gettext('The password could not be changed!');
                        }
                        $('#fw-password-change-error').html(error_msg);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    $('#fw-password-change-error').html(gettext('The password could not be changed!'));
                },
                complete: function() { $.deactivateWait(); }
            });
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };

        $("#fw-change-pwd-dialog").dialog({
            resizable : false,
            height : 300,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $(this).dialog('destroy').remove(); }
        });
    };

    var addEmailDialog = function() {
        $('body').append(tmp_change_email_dialog);
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function() {
            var new_email = jQuery('#new-profile-email').val();
            new_email = new_email.replace(/(^\s+)|(\s+$)/g, "");

            $('#fw-add-email-error').html('');

            if('' == new_email) {
                $('#fw-add-email-error').html(gettext('New email address is required!'));
                return;
            }

            jQuery('#new-profile-email').val(new_email);

            var form_data = new FormData(document.getElementById('fw-add-email-form'));
            $.activateWait();
            $.ajax({
                url : '/account/emailadd/',
                data: form_data,
                type : 'POST',
                processData: false,
                contentType: false,
                dataType : 'json',
                success : function(response, textStatus, jqXHR) {
                    if(200 == jqXHR.status) {
                        $('#fw-add-email-dialog').dialog('close');
                        alert(gettext('Confirmation e-mail sent to ' + new_email));
                    } else {
                        var error_msg = response.msg['email'][0];
                        $('#fw-add-email-error').html(error_msg);
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    $('#fw-add-email-error').html(gettext('The email could not be added!'));
                },
                complete: function() { $.deactivateWait(); }
            });
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };

        $("#fw-add-email-dialog").dialog({
            resizable : false,
            height : 230,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $(this).dialog('destroy').remove(); }
        });
    }

    var deleteEmailDialog = function() {
        var this_tr = jQuery(this).parent().parent();
            email = jQuery(this).data('email'),
            diaButtons = {};

        $('body').append(tmp_delete_email_dialog({
            'title': gettext('Confirm remove'),
            'text':  gettext('Remove the email address') + ': ' + email + '?'
        }));

        diaButtons[gettext('Remove')] = function() {
            var form_data = new FormData();
            form_data.append('email', email);

            $.activateWait();
            $.ajax({
                url : '/account/emaildelete/',
                data: form_data,
                type : 'POST',
                processData: false,
                contentType: false,
                dataType : 'json',
                success : function(response, textStatus, jqXHR) {
                    if(200 == jqXHR.status) {
                        this_tr.remove();
                    }
                    $('#fw-confirm-email-dialog').dialog('close');
                    alert(gettext(response.msg));
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    $('#fw-confirm-email-dialog').dialog('close');
                    alert(gettext('The email could not be removed!'));
                },
                complete: function() { $.deactivateWait(); }
            });
        };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };

        $("#fw-confirm-email-dialog").dialog({
            resizable : false,
            height : 200,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $(this).dialog('destroy').remove(); }
        });
    }

    var changePrimaryEmailDialog = function() {
        var prim_email_radio = jQuery('.primary-email-radio:checked'),
            prim_email_wrapper = prim_email_radio.parent().parent(),
            prim_email = prim_email_radio.val(),
            diaButtons = {};

        $('body').append(tmp_delete_email_dialog({
            'title': gettext('Confirm set primary'),
            'text':  gettext('Set the email address primary') + ': ' + prim_email + '?'
        }));

        diaButtons[gettext('Submit')] = function() {
            var form_data = new FormData();
            form_data.append('email', prim_email);

            $.activateWait();
            $.ajax({
                url : '/account/emailprimary/',
                data: form_data,
                type : 'POST',
                processData: false,
                contentType: false,
                dataType : 'json',
                success : function(response, textStatus, jqXHR) {
                    if(200 == jqXHR.status) {
                        jQuery('tr.primary-email-tr span.disabled').attr('class', 'delete-email fw-link-text');
                        prim_email_wrapper.find('span.delete-email.fw-link-text').attr('class', 'disabled');
                    } else {
                        jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true);
                    }
                    alert(gettext(response.msg));
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    alert(gettext('The email could not be set primary!'));
                },
                complete: function() {
                    jQuery('#fw-confirm-email-dialog').dialog('close');
                    jQuery.deactivateWait();
                }
            });
        };
        diaButtons[gettext('Cancel')] = function() {
            jQuery('tr.primary-email-tr .primary-email-radio').prop("checked", true);
            jQuery(this).dialog('close');
        };

        $("#fw-confirm-email-dialog").dialog({
            resizable : false,
            height : 180,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $(this).dialog('destroy').remove(); }
        });
    }

    jQuery.addDropdownBox($('#edit-avatar-btn'), $('#edit-avatar-pulldown'));
    jQuery('.change-avatar').bind('click', changeAvatarDialog);
    jQuery('.delete-avatar').bind('click', deleteAvatarDialog);
    jQuery('#submit-profile').bind('click', saveProfile);
    jQuery('#delete-account').bind('click', deleteUserDialog);
    jQuery('#fw-edit-profile-pwd').bind('click',changePwdDialog);
    jQuery('#add-profile-email').bind('click', addEmailDialog);
    jQuery(document).on('click', '.delete-email', deleteEmailDialog);
    jQuery('.primary-email-radio').bind('change', changePrimaryEmailDialog);
});
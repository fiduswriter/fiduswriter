(function () {
    var exports = this,
        contactHelpers = {};

    //template for the list of teammembers
    contactHelpers.tmp_teammember = _.template('<% _.each(members, function(member) { %>\
        <tr id="user-<%= member.id %>">\
            <td width="30">\
                <span class="fw-inline"><input type="checkbox" class="entry-select" data-id="<%= member.id %>"/></span>\
            </td>\
            <td width="350">\
                <span><img class="fw-avatar" src="<%= member.avatar %>" /></span>\
                <span class="fw-inline"><%- member.name %></span>\
            </td>\
            <td width="350">\
                <span class="fw-inline"><%- member.email %></span>\
            </td>\
            <td width="50" align="center">\
                <span class="fw-link-text delete-single-member fw-inline" data-id="<%= member.id %>">\
                    <i class="icon-trash"></i>\
                </span>\
            </td>\
        </tr><% }) %>');

    //template for member adding dialog
    contactHelpers.tmp_editcategories = _.template('\
        <div id="add-new-member" title="<%- dialogHeader %>">\
            <table class="ui-dialog-content-table"><tbody><tr><td>\
                <input type="text" name="email" id="new-member-email" placeholder="' + gettext('E-mail address of the user') + '" />\
            </td></tr></tbody></table>\
        </div>');

    //add a user to contact per ajax
    contactHelpers.addMember = function(user_email) {
        if(null == user_email || 'undefined' == typeof(user_email)) { return false; }

        user_email = $.trim(user_email);
        $('#add-new-member .warning').detach();
        if('' == user_email)
            return false;
        $.ajax({
            url : '/account/teammember/add',
            data : {'email': user_email},
            type : 'POST',
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(jqXHR.status == 200) {//user added to the contacts
                    if($('#access-rights-dialog').size()) {
                        console.log(response.member);
                        var member_data = {
                            'user_id': response.member.id,
                            'user_name': response.member.name,
                            'avatar': response.member.avatar,
                            'rights': 'r'
                        };

                        $('#my-contacts .fw-document-table-body').append(tmp_access_right_tr({'contacts': [response.member]}));
                        $('#share-member table tbody').append(tmp_collaborators({'collaborators': [member_data]}));
                        accessrightsHelpers.collaboratorFunctionsEvent();
                    } else {
                        $('#team-table tbody').append(
                            contactHelpers.tmp_teammember({
                                'members': [response.member]
                            })
                        );
                    }
                    $("#add-new-member").dialog('close');
                } else {//user not found
                    var inviting_text = '<div class="warning">'
                        + gettext('No user is registered with the given email address.') +
                        '<br />'
                        + gettext('Please invite him/her ') +
                        '<a target="_blank" href="mailto:' + user_email + '?subject='
                            + encodeURIComponent(gettext('Fiduswriter')) + '&body='
                                + encodeURIComponent(gettext('Hey, I would like you to sign up for a Fiduswriter account.') + "\n"
                                    + gettext('Please register at http://beta.fiduswriter.com')) +
                        '">'
                            + gettext('by sending an email') +
                        '</a>!\
                    </div>';
                    $('#add-new-member').append(inviting_text);
                }
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            }
        });
    }

    //dialog for adding a user to contacts
    contactHelpers.addMemberDialog = function() {
        var dialogHeader = gettext('Add a user to your contacts');
        $('body').append(contactHelpers.tmp_editcategories({
            'dialogHeader': dialogHeader
        }));

        var diaButtons = {};
        diaButtons[gettext('Submit')] = function() { contactHelpers.addMember($('#new-member-email').val()); };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };

        $("#add-new-member").dialog({
            resizable : false,
            width : 350,
            height : 250,
            modal : true,
            buttons : diaButtons,
            create : function () {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                $('#new-member-email').css('width', 340);
            },
            close : function() { $("#add-new-member").dialog('destroy').remove(); },
        });
    }

    contactHelpers.deleteMember = function(ids) {
        $.ajax({
            url : '/account/teammember/remove',
            data : {'members[]': ids},
            type : 'POST',
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(jqXHR.status == 200) {//user added to the contacts
                    $('#user-' + ids.join(', #user-')).remove()
                    $("#confirmdeletion").dialog('close');
                }
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            }
        });
    }

    //dialog for removing a user from contacts
    contactHelpers.deleteMemberDialog = function(memberIds) {
        $('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Remove from the contacts') + '?</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function() { contactHelpers.deleteMember(memberIds); };
        diaButtons[gettext('Cancel')] = function() { $(this).dialog('close'); };
        $("#confirmdeletion").dialog({
            resizable : false,
            height : 200,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { $("#confirmdeletion").dialog('destroy').remove(); }
        });
    }

    exports.contactHelpers = contactHelpers;
}).call(this);
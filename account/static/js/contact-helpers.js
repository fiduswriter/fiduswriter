/**
 * @file Sets up the contacts management.
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

(function () {
    var exports = this,
    /** 
  * Helper functions for adding and removing contacts. TODO
  * @namespace contactHelpers
  */
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
    contactHelpers.tmp_add_teammember = _.template('\
        <div id="add-new-member" title="<%- dialogHeader %>">\
            <table class="ui-dialog-content-table"><tbody><tr><td>\
                <input type="text" name="user_string" id="new-member-user-string" placeholder="' + gettext('E-mail address or username') + '" />\
            </td></tr></tbody></table>\
        </div>');

    //add a user to contact per ajax
    contactHelpers.addMember = function(user_string) {
        if(null == user_string || 'undefined' == typeof(user_string)) { return false; }

        user_string = $.trim(user_string);
        jQuery('#add-new-member .warning').detach();
        if('' == user_string)
            return false;
        $.ajax({
            url : '/account/teammember/add',
            data : {'user_string': user_string},
            type : 'POST',
            dataType : 'json',
            success : function(response, textStatus, jqXHR) {
                if(jqXHR.status == 201) {//user added to the contacts
                    if(jQuery('#access-rights-dialog').size()) {
                        var member_data = {
                            'user_id': response.member.id,
                            'user_name': response.member.name,
                            'avatar': response.member.avatar,
                            'rights': 'r'
                        };

                        jQuery('#my-contacts .fw-document-table-body').append(tmp_access_right_tr({'contacts': [response.member]}));
                        jQuery('#share-member table tbody').append(tmp_collaborators({'collaborators': [member_data]}));
                        accessrightsHelpers.collaboratorFunctionsEvent();
                    } else {
                        jQuery('#team-table tbody').append(
                            contactHelpers.tmp_teammember({
                                'members': [response.member]
                            })
                        );
                    }
                    jQuery("#add-new-member").dialog('close');
                } else {//user not found
		    var responseHtml;
		  
		    if (response.error === 1) {
			responseHtml = gettext('You cannot add yourself to your contacts!');
		    } else if (response.error === 2) {
		        responseHtml = gettext('This person is already in your contacts');
		    } else if (user_string.indexOf('@') != -1 && user_string.indexOf('.') != -1) {
			responseHtml = gettext('No user is registered with the given email address.') +
			    '<br />'
			    + gettext('Please invite him/her ') +
			    '<a target="_blank" href="mailto:' + user_string + '?subject='
                            + encodeURIComponent(gettext('Fidus Writer')) + '&body='
                                + encodeURIComponent(gettext('Hey, I would like you to sign up for a Fidus Writer account.') + "\n"
                                    + gettext('Please register at')) + ' ' +
				    window.location.origin +
			    '">'
				+ gettext('by sending an email') +
			    '</a>!';
		    } else {
			responseHtml = gettext('User is not registered.')
		    }
                    jQuery('#add-new-member').append('<div class="warning" style="padding: 8px;">'+responseHtml+'</div>');
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
        jQuery('body').append(contactHelpers.tmp_add_teammember({
            'dialogHeader': dialogHeader
        }));

        var diaButtons = {};
        diaButtons[gettext('Submit')] = function() { contactHelpers.addMember(jQuery('#new-member-user-string').val()); };
        diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close'); };

        jQuery("#add-new-member").dialog({
            resizable : false,
            width : 350,
            height : 250,
            modal : true,
            buttons : diaButtons,
            create : function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
                jQuery('#new-member-user-string').css('width', 340);
            },
            close : function() { jQuery("#add-new-member").dialog('destroy').remove(); },
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
                    jQuery('#user-' + ids.join(', #user-')).remove()
                    jQuery("#confirmdeletion").dialog('close');
                }
            },
            error : function(jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            }
        });
    }

    //dialog for removing a user from contacts
    contactHelpers.deleteMemberDialog = function(memberIds) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Remove from the contacts') + '?</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function() { contactHelpers.deleteMember(memberIds); };
        diaButtons[gettext('Cancel')] = function() { jQuery(this).dialog('close'); };
        jQuery("#confirmdeletion").dialog({
            resizable : false,
            height : 200,
            modal : true,
            buttons : diaButtons,
            create : function() {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            },
            close : function() { jQuery("#confirmdeletion").dialog('destroy').remove(); }
        });
    }

    exports.contactHelpers = contactHelpers;
}).call(this);

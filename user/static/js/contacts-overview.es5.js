/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit contacts-overview.es6.js and run ./es6-transpile.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _overview = require("./es6_modules/contacts/overview");

(0, _overview.contactsOverview)();

},{"./es6_modules/contacts/overview":3}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.deleteMemberDialog = exports.addMemberDialog = undefined;

var _templates = require('./templates');

/**
* Sets up the contacts management. Helper functions for adding and removing contacts.
*/

//add a user to contact per ajax
var addMember = function addMember(user_string) {
    if (null == user_string || 'undefined' == typeof user_string) {
        return false;
    }

    user_string = $.trim(user_string);
    jQuery('#add-new-member .warning').detach();
    if ('' == user_string) return false;
    $.ajax({
        url: '/account/teammember/add',
        data: { 'user_string': user_string },
        type: 'POST',
        dataType: 'json',
        success: function success(response, textStatus, jqXHR) {
            if (jqXHR.status == 201) {
                //user added to the contacts
                if (jQuery('#access-rights-dialog').size()) {
                    var member_data = {
                        'user_id': response.member.id,
                        'user_name': response.member.name,
                        'avatar': response.member.avatar,
                        'rights': 'r'
                    };

                    jQuery('#my-contacts .fw-document-table-body').append(tmp_access_right_tr({ 'contacts': [response.member] }));
                    jQuery('#share-member table tbody').append(tmp_collaborators({ 'collaborators': [member_data] }));
                    //accessrightsHelpers.collaboratorFunctionsEvent() TODO: FIgure out what is happening here. This event disappeared with conversion to ES6.
                } else {
                        jQuery('#team-table tbody').append((0, _templates.teammemberTemplate)({
                            'members': [response.member]
                        }));
                    }
                jQuery("#add-new-member").dialog('close');
            } else {
                //user not found
                var responseHtml = undefined;

                if (response.error === 1) {
                    responseHtml = gettext('You cannot add yourself to your contacts!');
                } else if (response.error === 2) {
                    responseHtml = gettext('This person is already in your contacts');
                } else if (user_string.indexOf('@') != -1 && user_string.indexOf('.') != -1) {
                    responseHtml = gettext('No user is registered with the given email address.') + '<br />' + gettext('Please invite him/her ') + '<a target="_blank" href="mailto:' + user_string + '?subject=' + encodeURIComponent(gettext('Fidus Writer')) + '&body=' + encodeURIComponent(gettext('Hey, I would like you to sign up for a Fidus Writer account.') + "\n" + gettext('Please register at')) + ' ' + window.location.origin + '">' + gettext('by sending an email') + '</a>!';
                } else {
                    responseHtml = gettext('User is not registered.');
                }
                jQuery('#add-new-member').append('<div class="warning" style="padding: 8px;">' + responseHtml + '</div>');
            }
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.responseText);
        }
    });
};

//dialog for adding a user to contacts
var addMemberDialog = exports.addMemberDialog = function addMemberDialog() {
    var dialogHeader = gettext('Add a user to your contacts');
    jQuery('body').append((0, _templates.addTeammemberTemplate)({
        'dialogHeader': dialogHeader
    }));

    var diaButtons = {};
    diaButtons[gettext('Submit')] = function () {
        addMember(jQuery('#new-member-user-string').val());
    };
    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog('close');
    };

    jQuery("#add-new-member").dialog({
        resizable: false,
        width: 350,
        height: 250,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var $the_dialog = jQuery(this).closest(".ui-dialog");
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
            jQuery('#new-member-user-string').css('width', 340);
        },
        close: function close() {
            jQuery("#add-new-member").dialog('destroy').remove();
        }
    });
};

var deleteMember = function deleteMember(ids) {
    $.ajax({
        url: '/account/teammember/remove',
        data: { 'members[]': ids },
        type: 'POST',
        dataType: 'json',
        success: function success(response, textStatus, jqXHR) {
            if (jqXHR.status == 200) {
                //user added to the contacts
                jQuery('#user-' + ids.join(', #user-')).remove();
                jQuery("#confirmdeletion").dialog('close');
            }
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.responseText);
        }
    });
};

//dialog for removing a user from contacts
var deleteMemberDialog = exports.deleteMemberDialog = function deleteMemberDialog(memberIds) {
    jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Remove from the contacts') + '?</p></div>');
    var diaButtons = {};
    diaButtons[gettext('Delete')] = function () {
        deleteMember(memberIds);
    };
    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog('close');
    };
    jQuery("#confirmdeletion").dialog({
        resizable: false,
        height: 200,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var $the_dialog = jQuery(this).closest(".ui-dialog");
            $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange");
        },
        close: function close() {
            jQuery("#confirmdeletion").dialog('destroy').remove();
        }
    });
};

},{"./templates":4}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.contactsOverview = undefined;

var _templates = require("./templates");

var _manage = require("./manage");

var contactsOverview = exports.contactsOverview = function contactsOverview() {
    //intialize the teammember table
    jQuery('#team-table tbody').append((0, _templates.teammemberTemplate)({ 'members': teammembers }));

    //select all members
    jQuery('#select-all-entry').bind('change', function () {
        var new_bool = false;
        if (jQuery(this).prop("checked")) new_bool = true;
        jQuery('.entry-select').not(':disabled').each(function () {
            this.checked = new_bool;
        });
    });

    jQuery('.add-contact').bind('click', _manage.addMemberDialog);

    $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'));
    jQuery('#action-selection-pulldown span').bind('mousedown', function () {
        var ids = [],
            action_name = jQuery(this).attr('data-action');
        if ('' == action_name || 'undefined' == typeof action_name) return;
        jQuery('.entry-select:checked').each(function () {
            ids[ids.length] = parseInt(jQuery(this).attr('data-id'));
        });
        (0, _manage.deleteMemberDialog)(ids);
    });

    //delete single user
    jQuery(document).on('click', '.delete-single-member', function () {
        (0, _manage.deleteMemberDialog)([jQuery(this).attr('data-id')]);
    });
};

},{"./manage":2,"./templates":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
//template for the list of teammembers
var teammemberTemplate = exports.teammemberTemplate = _.template('<% _.each(members, function(member) { %>\
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
var addTeammemberTemplate = exports.addTeammemberTemplate = _.template('\
    <div id="add-new-member" title="<%- dialogHeader %>">\
        <table class="ui-dialog-content-table"><tbody><tr><td>\
            <input type="text" name="user_string" id="new-member-user-string" placeholder="' + gettext('E-mail address or username') + '" />\
        </td></tr></tbody></table>\
    </div>');

},{}]},{},[1]);

/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit document-accessrights-helpers.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _dialog = require("./es6_modules/documents/access-rights/dialog");

var accessrightsHelpers = {
  DocumentAccessRightsDialog: _dialog.DocumentAccessRightsDialog
};

window.accessrightsHelpers = accessrightsHelpers;

},{"./es6_modules/documents/access-rights/dialog":2}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.DocumentAccessRightsDialog = undefined;

var _templates = require('./templates');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
* Functions for the document access rights dialog.
*/

var DocumentAccessRightsDialog = exports.DocumentAccessRightsDialog = (function () {
    function DocumentAccessRightsDialog(documentIds, accessRights, teamMembers) {
        _classCallCheck(this, DocumentAccessRightsDialog);

        this.documentIds = documentIds;
        this.accessRights = accessRights;
        this.teamMembers = teamMembers;
        this.createAccessRightsDialog();
    }

    _createClass(DocumentAccessRightsDialog, [{
        key: 'createAccessRightsDialog',
        value: function createAccessRightsDialog() {
            var that = this;
            var dialogHeader = gettext('Share your document with others');
            var documentCollaborators = {};
            var len = this.accessRights.length;

            for (var i = 0; i < len; i++) {
                if (_.include(that.documentIds, that.accessRights[i].document_id)) {
                    if ('undefined' == typeof documentCollaborators[that.accessRights[i].user_id]) {
                        documentCollaborators[that.accessRights[i].user_id] = that.accessRights[i];
                        documentCollaborators[that.accessRights[i].user_id].count = 1;
                    } else {
                        if (documentCollaborators[that.accessRights[i].user_id].rights != that.accessRights[i].rights) documentCollaborators[that.accessRights[i].user_id].rights = 'r';
                        documentCollaborators[that.accessRights[i].user_id].count += 1;
                    }
                }
            }
            documentCollaborators = _.select(documentCollaborators, function (obj) {
                return obj.count == that.documentIds.length;
            });

            var dialogBody = (0, _templates.accessRightOverviewTemplate)({
                'dialogHeader': dialogHeader,
                'contacts': (0, _templates.accessRightTrTemplate)({ 'contacts': that.teamMembers }),
                'collaborators': (0, _templates.collaboratorsTemplate)({
                    'collaborators': documentCollaborators
                })
            });
            jQuery('body').append(dialogBody);

            var diaButtons = {};
            diaButtons[gettext('Add new contact')] = function () {
                contactHelpers.addMemberDialog();
            };
            diaButtons[gettext('Submit')] = function () {
                //apply the current state to server
                var collaborators = [],
                    rights = [];
                jQuery('#share-member .collaborator-tr').each(function () {
                    collaborators[collaborators.length] = jQuery(this).attr('data-id');
                    rights[rights.length] = jQuery(this).attr('data-right');
                });
                that.submitAccessRight(collaborators, rights);
                jQuery(this).dialog('close');
            };
            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog("close");
            };

            jQuery('#access-rights-dialog').dialog({
                draggable: false,
                resizable: false,
                top: 10,
                width: 820,
                height: 540,
                modal: true,
                buttons: diaButtons,
                create: function create() {
                    var theDialog = jQuery(this).closest(".ui-dialog");
                    theDialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-light fw-add-button");
                    theDialog.find(".ui-dialog-buttonset .ui-button:eq(1)").addClass("fw-button fw-dark");
                    theDialog.find(".ui-dialog-buttonset .ui-button:eq(2)").addClass("fw-button fw-orange");
                },
                close: function close() {
                    jQuery('#access-rights-dialog').dialog('destroy').remove();
                }
            });
            jQuery('.fw-checkable').bind('click', function () {
                $.setCheckableLabel(jQuery(this));
            });
            jQuery('#add-share-member').bind('click', function () {
                var selectedMembers = jQuery('#my-contacts .fw-checkable.checked');
                var selectedData = [];
                selectedMembers.each(function () {
                    var memberId = jQuery(this).attr('data-id');
                    var collaborator = jQuery('#collaborator-' + memberId);
                    if (0 == collaborator.size()) {
                        selectedData[selectedData.length] = {
                            'user_id': memberId,
                            'user_name': jQuery(this).attr('data-name'),
                            'avatar': jQuery(this).attr('data-avatar'),
                            'rights': 'r'
                        };
                    } else if ('d' == collaborator.attr('data-right')) {
                        collaborator.removeClass('d').addClass('r').attr('data-right', 'r');
                    }
                });
                jQuery('#my-contacts .checkable-label.checked').removeClass('checked');
                jQuery('#share-member table tbody').append((0, _templates.collaboratorsTemplate)({
                    'collaborators': selectedData
                }));
                that.collaboratorFunctionsEvent();
            });
            that.collaboratorFunctionsEvent();
        }
    }, {
        key: 'collaboratorFunctionsEvent',
        value: function collaboratorFunctionsEvent() {
            jQuery('.edit-right').unbind('click');
            jQuery('.edit-right').each(function () {
                $.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
            });
            var spans = jQuery('.edit-right-wrapper .fw-pulldown-item, .delete-collaborator');
            spans.unbind('mousedown');
            spans.bind('mousedown', function () {
                var newRight = jQuery(this).attr('data-right');
                jQuery(this).closest('.collaborator-tr').attr('class', 'collaborator-tr ' + newRight);
                jQuery(this).closest('.collaborator-tr').attr('data-right', newRight);
            });
        }
    }, {
        key: 'submitAccessRight',
        value: function submitAccessRight(newCollaborators, newAccessRights) {
            var that = this;
            var postData = {
                'documents[]': that.documentIds,
                'collaborators[]': newCollaborators,
                'rights[]': newAccessRights
            };
            $.ajax({
                url: '/document/accessright/save/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(response) {
                    that.accessRights = response.access_rights;
                    $.addAlert('success', gettext('Access rights have been saved'));
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR.responseText);
                }
            });
        }
    }]);

    return DocumentAccessRightsDialog;
})();

},{"./templates":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** The access rights dialogue template */
var accessRightOverviewTemplate = exports.accessRightOverviewTemplate = _.template('\
    <div id="access-rights-dialog" title="<%- dialogHeader %>">\
        <div id="my-contacts" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My contacts") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="337">' + gettext("Contacts") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= contacts %></tbody>\
            </table>\
        </div>\
        <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
        <div id="share-member" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My collaborators") + '</h3>\
            <table class="fw-document-table tablesorter">\
                <thead class="fw-document-table-header"><tr>\
                        <th width="217">' + gettext("Collaborators") + '</th>\
                        <th width="50" align="center">' + gettext("Rights") + '</th>\
                        <th width="50" align="center">' + gettext("Delete") + '</th>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= collaborators %></tbody>\
            </table>\
        </div>\
    </div>');

/** The template for an individual row in the right hand side list of users (all contacts) of the access rights dialogue. */
var accessRightTrTemplate = exports.accessRightTrTemplate = _.template('<% _.each(contacts, function(contact) { %>\
        <tr>\
            <td width="337" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                <span class="fw-inline"><%= contact.name %></span>\
            </td>\
        </tr>\
    <% }) %>');

/** The template for an individual row in the left hand side list of users (the collaborators of the current document) of the access rights dialogue. */
var collaboratorsTemplate = exports.collaboratorsTemplate = _.template('<% _.each(collaborators, function(collaborator) { %>\
        <tr id="collaborator-<%- collaborator.user_id %>" data-id="<%- collaborator.user_id %>"\
        class="collaborator-tr <%- collaborator.rights %>" data-right="<%- collaborator.rights %>">\
            <td width="215">\
                <span><img class="fw-avatar" src="<%- collaborator.avatar %>" /></span>\
                <span class="fw-inline"><%= collaborator.user_name %></span>\
            </td>\
            <td width="50" align="center">\
                <div class="fw-inline edit-right-wrapper">\
                    <i class="icon-access-right"></i>\
                    <i class="icon-down-dir edit-right"></i>\
                    <div class="fw-pulldown fw-left">\
                        <ul>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="w">\
                                    <i class="icon-pencil" >' + gettext("Editor") + '</i>\
                                </span>\
                            </li>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="r">\
                                    <i class="icon-eye">' + gettext("Read only") + '</i>\
                                </span>\
                            </li>\
                        </ul>\
                    </div>\
                </div>\
            </td>\
            <td width="50" align="center">\
                <span class="delete-collaborator fw-inline" data-right="d">\
                    <i class="icon-trash fw-link-text"></i>\
                </span>\
            </td>\
        </tr>\
    <% }) %>');

},{}]},{},[1]);

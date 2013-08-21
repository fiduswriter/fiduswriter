/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

var tmp_access_right_overview = _.template('\
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
var tmp_access_right_tr = _.template('<% _.each(contacts, function(contact) { %>\
        <tr>\
            <td width="337" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                <span class="fw-inline"><%= contact.name %></span>\
            </td>\
        </tr>\
    <% }) %>');
var tmp_collaborators = _.template('<% _.each(collaborators, function(collaborator) { %>\
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
/*
var tmp_users_with_rights = _.template('\
    <% _.each(rights,function(right,key,list){ %>\
    <p><%= teamMembers[right.user_id] %> (<%= right.rights %>)</p>\
    <% }); %>\
    ');
*/

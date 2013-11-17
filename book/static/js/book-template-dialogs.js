/**
 * @file Book access rights templates.
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

/** A template for the book access rights overview */
var tmp_book_access_right_overview = _.template('\
    <div id="access-rights-dialog" title="<%- dialogHeader %>">\
        <div id="my-contacts" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My contacts") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="332">' + gettext("Contacts") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small"><% _.each(contacts, function(contact) { %>\
                    <tr>\
                        <td width="332" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                            <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                            <span class="fw-inline"><%= contact.name %></span>\
                        </td>\
                    </tr>\
                <% }) %></tbody>\
            </table>\
        </div>\
        <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
        <div id="share-member" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My collaborators") + '</h3>\
            <table class="fw-document-table tablesorter">\
                <thead class="fw-document-table-header"><tr>\
                        <th width="212">' + gettext("Collaborators") + '</th>\
                        <th width="50" align="center">' + gettext("Rights") + '</th>\
                        <th width="50" align="center">' + gettext("Delete") + '</th>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= collaborators %></tbody>\
            </table>\
        </div>\
    </div>');
/** A template for the book collaboration pane */
var tmp_book_collaborators = _.template('<% _.each(collaborators, function(collaborator) { %>\
        <tr id="collaborator-<%- collaborator.user_id %>" data-id="<%- collaborator.user_id %>"\
        class="collaborator-tr <%- collaborator.rights %>" data-right="<%- collaborator.rights %>">\
            <td width="212">\
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

/**
 * This file is part of Fidus Writer <http://www.fiduswriter.com>
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

var tmp_documents_list = _.template('\
<% _.each(theDocumentList,function(aDocument,key,list){%><%= tmp_documents_list_item({aDocument:aDocument})%><% }); %>');

var tmp_documents_list_item = _.template('\
 <tr id="Text_<%- aDocument.id %>" <% if (theUser.id == aDocument.owner) { %>class="owned-by-user"<% } %> >\
                <td width="20">\
                    <span class="fw-inline">\
                        <input type="checkbox" class="entry-select"\
                            data-id="<%- aDocument.id %>"\
                            data-owner="<%- aDocument.owner %>"/>\
                    </span>\
                </td>\
                <td width="230">\
                    <span class="fw-document-table-title fw-inline">\
                        <i class="icon-doc"></i>\
                        <a class="doc-title fw-link-text fw-searchable" href="/text/<%- aDocument.id %>/">\
                            <% var documentTitle=document.createElement("div"); documentTitle.innerHTML=aDocument.title; if (documentTitle.innerText.length > 0) { %>\
                                <%= documentTitle.innerText %>\
                            <% } else { %>\
                                '+gettext('Untitled')+'\
                            <% } %>\
                        </a>\
                        <% if (aDocument.is_locked) { %>\
                            <i class="icon-lock"></i>\
                        <% } %>\
                    </span>\
                </td>\
                <td width="115">\
                    <span class="fw-inline"><%- aDocument.added %></span>\
                </td>\
                <td width="115">\
                    <span class="fw-inline"><%- aDocument.updated %></span>\
                </td>\
                <td width="170">\
                    <span>\
                        <img class="fw-avatar" src="<%- aDocument.owner_avatar %>" />\
                    </span>\
                    <span class="fw-inline fw-searchable"><%- aDocument.owner_name %></span>\
                </td>\
                <td width="60" align="center">\
                    <span class="rights fw-inline" data-id="<%- aDocument.id %>">\
                        <i data-id="<%- aDocument.id %>" class="icon-access-right <%- aDocument.rights %>"></i>\
                    </span>\
                </td>\
                 <td width="40" align="center">\
                    <span class="delete-document fw-inline fw-link-text" data-id="<%- aDocument.id %>" data-title="<%- documentTitle.innerText %>">\
                        <% if (theUser.id === aDocument.owner) { %><i class="icon-trash"></i><% } %>\
                    </span>\
                </td>\
            </tr>\
');

var tmp_import_fidus = _.template('<div id="importfidus" title="' + gettext('Import another Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" required />\
            <span id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');
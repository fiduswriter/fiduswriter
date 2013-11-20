/**
 * @file Templates for the document overview page.
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
/** A template for the document overview list. */
var tmp_documents_list = _.template('\
<% _.each(theDocumentList,function(aDocument,key,list){%><%= tmp_documents_list_item({aDocument:aDocument})%><% }); %>');
/** A template for each document overview list item. */
var tmp_documents_list_item = _.template('\
 <% var documentTitle; if (0===aDocument.title.length) {documentTitle="'+gettext('Untitled')+'";} else {documentTitle=aDocument.title;} %>\
 <tr id="Text_<%- aDocument.id %>" <% if (theUser.id == aDocument.owner) { %>class="owned-by-user"<% } %> >\
                <td width="20">\
                    <span class="fw-inline">\
                        <input type="checkbox" class="entry-select"\
                            data-id="<%- aDocument.id %>"\
                            data-owner="<%- aDocument.owner %>"/>\
                    </span>\
                </td>\
                <td width="220">\
                    <span class="fw-document-table-title fw-inline">\
                        <i class="icon-doc"></i>\
                        <a class="doc-title fw-link-text fw-searchable" href="/document/<%- aDocument.id %>/">\
                            <%- documentTitle %>\
                        </a>\
                    </span>\
                </td>\
                <td width="80" class="td-icon">\
                    <% if (aDocument.revisions.length > 0) { %>\
                        <span class="fw-inline revisions" data-id="<%- aDocument.id %>">\
                            <i class="icon-clock"></i>\
                        </span>\
                    <% } %>\
                </td>\
                <td width="80">\
                    <span class="fw-inline"><%- jQuery.localizeDate(aDocument.added*1000, true) %></span>\
                </td>\
                <td width="80">\
                    <span class="fw-inline"><%- jQuery.localizeDate(aDocument.updated*1000, true) %></span>\
                </td>\
                <td width="170">\
                    <span>\
                        <img class="fw-avatar" src="<%- aDocument.owner_avatar %>" />\
                    </span>\
                    <span class="fw-inline fw-searchable"><%- aDocument.owner_name %></span>\
                </td>\
                <td width="60"  class="td-icon">\
                    <span class="rights fw-inline" data-id="<%- aDocument.id %>">\
                        <i data-id="<%- aDocument.id %>" class="icon-access-right <%- aDocument.rights %>"></i>\
                    </span>\
                </td>\
                 <td width="40"  class="td-icon">\
                    <span class="delete-document fw-inline fw-link-text" data-id="<%- aDocument.id %>" data-title="<%- aDocument.title %>">\
                        <% if (theUser.id === aDocument.owner) { %><i class="icon-trash"></i><% } %>\
                    </span>\
                </td>\
            </tr>\
');
/** A template for the Fidus Writer document import dialog */ 
var tmp_import_fidus = _.template('<div id="importfidus" title="' + gettext('Import another Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" required />\
            <span id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');
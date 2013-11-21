/**
 * @file Templates for listing document revisions
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Johannes Wilm.
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
/** A template for listing the templates of a certain document */
tmp_documentrevisions = _.template('\
<div title="' + gettext('Saved revisions of') + ' <%= aDocument.title%>">\
<table class="fw-document-table" style="width:342px;">\
    <thead class="fw-document-table-header">\
        <th width="80">' + gettext('Time') + '</th>\
        <th width="300">' + gettext('Description') + '</th>\
        <th width="50">' + gettext('Recreate') + '</th>\
        <th width="50">' + gettext('Download') + '</th>\
        <% if (aDocument.is_owner) {%>\
            <th width="50">' + gettext('Delete') + '</th>\
        <% } %>\
    </thead>\
    <tbody class="fw-document-table-body fw-middle">\
        <%_.each(_.sortBy(aDocument.revisions, function(revision){return 0-revision.date;}), function(revision) { %>\
            <tr class="revision-<%- revision.pk%>" data-document="<%= aDocument.id %>">\
                <td width="80"><span class="fw-inline"><%- jQuery.localizeDate(revision.date*1000) %></span></td>\
                <td width="300"><span class="fw-inline"><%- revision.note %></span></td>\
                <td width="50"><span class="fw-inline recreate-revision" data-id="<%- revision.pk%>"><i class="icon-download"></i></span></td>\
                <td width="50"><span class="fw-inline download-revision" data-id="<%- revision.pk%>" data-filename="<%- revision.file_name %>"><i class="icon-download"></i></span></td>\
                <% if (aDocument.is_owner) {%>\
                    <td width="50">\
                        <span class="fw-inline delete-revision" data-id="<%- revision.pk%>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                <% } %>\
            </tr>\
        <% }); %>\
    </tbody>\
</table>\
</div>\
');

tmp_documentrevisions_confirm_delete = _.template('\
<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '">\
    <p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
    gettext('Do you really want to delete the revision?') + '</p></div>');
/**
 * @file Templates for the editable area in the editor.
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
/** A template for the metadata fields in the editor. */
var tmp_metadata = _.template('\
<% if (settings.subtitle) { %>\
    <div id="metadata-subtitle" class="editable metadata metadata-subtitle" data-metadata="subtitle" contenteditable="true" title="'+gettext('The subtitle of the document')+'"><%= metadata.subtitle %></div>\
<% } %>\
<% if (settings.authors) { %>\
    <div id="metadata-authors" class="editable metadata metadata-authors" data-metadata="authors" contenteditable="true" title="'+gettext('The authors of the document (comma-separated)')+'"><%= metadata.authors %></div>\
<% } %>\
<% if (settings.abstract) { %>\
    <div id="metadata-abstract" class="editable metadata metadata-abstract" data-metadata="abstract" contenteditable="true" title="'+gettext('The abstract of the document')+'"><%= metadata.abstract %></div>\
<% } %>\
<% if (settings.keywords) { %>\
    <div id="metadata-keywords" class="editable metadata metadata-keywords" data-metadata="keywords" contenteditable="true" title="'+gettext('The keywords related to the document (comma-separated)')+'"><%= metadata.keywords %></div>\
<% } %>\
');
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

var tmp_metadata = _.template('\
<% if (settings.subtitle) { %>\
    <div id="metadata-subtitle" class="editable metadata metadata-subtitle" data-metadata="subtitle" data-metadata-type="html" contenteditable="true" title="'+gettext('The subtitle of the document')+'"><%= metadata.subtitle %></div>\
<% } %>\
<% if (settings.abstract) { %>\
    <div id="metadata-abstract" class="editable metadata metadata-abstract" data-metadata="abstract" data-metadata-type="html" contenteditable="true" title="'+gettext('The abstract of the document')+'"><%= metadata.abstract %></div>\
<% } %>\
');
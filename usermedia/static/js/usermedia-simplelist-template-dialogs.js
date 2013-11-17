/**
 * @file Templates for a simple image overview within the editor
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

/** Simpler image overview table for use in editor. */
var tmp_usermedia_table = _.template('\
                <tr id="Image_<%- id %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>" >\
                     <td class="type" style="width:100px;">\
                        <% if (thumbnail) { %>\
                            <img src="<%- thumbnail %>" style="max-heigth:30px;max-width:30px;">\
                        <% } else { %>\
                            <img src="<%- image %>" style="max-heigth:30px;max-width:30px;">\
                        <% } %>\
                    </td>\
                    <td class="title" style="width:212px;">\
                        <span class="fw-inline">\
                            <span class="edit-image fw-link-text icon-figure" data-id="<%- id %>">\
                                <%- title %>\
                            </span>\
                        </span>\
                    </td>\
                    <td class="checkable" style="width:30px;">\
                    </td>\
                </tr>');

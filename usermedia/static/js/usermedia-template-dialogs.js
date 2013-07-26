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

var tmp_usermedia_editcategories = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>');

var tmp_usermedia_categoryforms = _.template('\
    <% _.each(categories, function(cat) { %>\
    <tr id="categoryTr_<%- cat.id %>" class="fw-list-input">\
        <td>\
            <input type="text" class="category-form" id="categoryTitle_<%- cat.id %>" value="<%= cat.category_title %>" data-id="<%- cat.id %>" />\
            <span class="fw-add-input icon-addremove"></span>\
        </td>\
    </tr>\
    <% }) %>\
    <tr class="fw-list-input">\
        <td>\
            <input type="text" class="category-form" />\
            <span class="fw-add-input icon-addremove"></span>\
        </td>\
    </tr>');

var tmp_usermedia_table = _.template('\
                <tr id="Image_<%- id %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>">\
                    <td width="30">\
                        <span class="fw-inline">\
                            <input type="checkbox" class="entry-select" data-id="<%- id %>">\
                        </span>\
                    </td>\
                    <td width="350" class="title">\
                        <span class="fw-usermedia-image">\
                            <img src="<% if(thumbnail) { %><%- thumbnail %><% } else { %><%- image %><% } %>">\
                        </span>\
                        <span class="fw-inline fw-usermedia-title">\
                            <span class="edit-image fw-link-text fw-searchable" data-id="<%- id %>">\
                                <%- title %>\
                            </span>\
                            <span class="fw-usermedia-type"><%- file_type %></span>\
                        </span>\
                    </td>\
                    <td width="170" class="type ">\
                        <span class="fw-inline"><%- width %> x <%- height %></span>\
                    </td>\
                    <td width="170" class="file_type ">\
                        <span class="fw-inline"><%= commentHelpers.localizeDate(added, true) %></span>\
                    </td>\
                    <td width="50" align="center">\
                        <span class="delete-image fw-inline fw-link-text" data-id="<%- id %>" data-title="<%- title %>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                </tr>');

var tmp_usermedia_category_list_item = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- iCat.id %>">\
            <%- iCat.category_title %>\
        </span>\
    </li>');

var tmp_usermedia_upload = _.template('<div id="uploadimage" class="fw-media-uploader" title="<%- action %>">\
    <form action="#" method="post" class="usermediaUploadForm">\
        <div>\
            <input name="title" class="fw-media-title fw-meida-form" type="text" placeholder="' + gettext('Insert a title') + '" value="<%- title %>" />\
            <button type="button" class="fw-media-select-button fw-button fw-light">'
                + gettext('Select a file') +
            '</button>\
            <input name="image" type="file" class="fw-media-file-input fw-meida-form">\
        </div>\
        <div class="figure-preview"><div>\
            <% if(image) { %><img src="<%- image %>" /><% } %>\
        </div></div>\
        <%= categories %>\
    </form></div>');

var tmp_usermedia_upload_categoriy = _.template('<% if(0 < categories.length) { %>\
        <div class="fw-media-category">\
            <div><%- fieldTitle %></div>\
            <% _.each(categories, function(cat) { %>\
                <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="imageCat<%- cat.id %>">\
                    <%- cat.category_title %>\
                </label>\
                <input class="fw-checkable-input fw-meida-form entry-cat" type="checkbox"\
                    id="imageCat<%- cat.id %>" name="imageCat" value="<%- cat.id %>"<%- cat.checked %>>\
            <% }); %>\
        </div>\
    <% } %>');

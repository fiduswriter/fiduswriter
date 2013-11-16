/**
 * @license This file is part of Fidus Writer <http://www.fiduswriter.org>
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

var tmp_editcategories = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>');

var tmp_categoryforms = _.template('\
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

var tmp_import_bib = _.template('<div id="importbibtex" title="' + gettext('Import another BibTex library') + '">\
        <form id="import-bib-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="bib-uploader" name="bib" required />\
            <span id="import-bib-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-bib-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');

var tmp_create_bibitem = _.template('\
    <div id="createbook" title="<%- dialogHeader %>">\
        <%= sourcetype %>\
        <div id="bookoptionsTab">\
            <ul>\
                <li><a href="#optionTab1" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#optionTab2" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#optionTab3" class="fw-button fw-large">' + gettext('Extras') + '</a></li>\
            </ul>\
            <div id="optionTab1"><table class="fw-dialog-table"><tbody><%= requiredfields %></tbody></table></div>\
            <div id="optionTab2"><table class="fw-dialog-table"><tbody><%= optionalfields %></tbody></table></div>\
            <div id="optionTab3"><table class="fw-dialog-table"><tbody><%= extras %></tbody></table></div>\
        </div>\
    </div>');

var tmp_sourcetype = _.template('<div id="source-type-selection" class="fw-button fw-white fw-large">\
        <input type="hidden" id="id_<%- fieldName %>" name="<%- fieldName %>" value="<%- fieldValue %>" />\
        <span id="selected-source-type-title"><%= fieldTitle %></span>\
        <span class="icon-down-dir"></span>\
        <div class="fw-pulldown fw-center">\
            <ul><% _.each(_.sortBy(options, function(source_type){ return source_type.order; }), function(opt) { %>\
                <li>\
                    <span class="fw-pulldown-item" data-value="<%- opt.id %>"><%= gettext(opt.title) %></span>\
                </li>\
            <% }) %></ul>\
        </div>\
    </div>');

var tmp_category = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- fieldTitle %></h4></th>\
        <td><% _.each(categories, function(cat) { %>\
            <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="entryCat<%- cat.id %>"><%- cat.category_title %></label>\
            <input class="fw-checkable-input entryForm entry-cat" type="checkbox" id="entryCat<%- cat.id %>" name="entryCat" value="<%- cat.id %>"<%- cat.checked %> />\
        <% }) %></td>\
    </tr>');

var tmp_bibtable = _.template('\
    <tr id="Entry_<%- id %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>">\
        <td width="30">\
            <span class="fw-inline"><input type="checkbox" class="entry-select" data-id="<%- id %>" /></span>\
        </td>\
        <td width="235">\
            <span class="fw-document-table-title fw-inline">\
                <i class="icon-book"></i>\
                <% if ( allowEdit ){ %>\
                    <span class="edit-bib fw-link-text fw-searchable" data-id="<%- id %>" data-type="<%- type %>">\
                        <% if (title.length>0) { %>\
                            <%- title %>\
                        <% } else { %>\
                            <i>'+gettext('Untitled')+'</i>\
                        <% } %>\
                    </span>\
                <% } else { %>\
                    <span class="fw-searchable">\
                        <% if (title.length>0) { %>\
                            <%- title %>\
                        <% } else { %>\
                            <i>'+gettext('Untitled')+'</i>\
                        <% } %>\
                    </span>\
                <% } %>\
            </span>\
        </td>\
        <td width="170" class="type"><span class="fw-inline"><%- gettext(typetitle) %></span></td>\
        <td width="175" class="author"><span class="fw-inline fw-searchable"><%- author %></span></td>\
        <td width="100" class="publised"><span class="fw-inline"><%- published %></span></td>\
        <td width="50" align="center">\
            <% if ( allowEdit ){ %>\
                <span class="delete-bib fw-inline fw-link-text" data-id="<%- id %>" data-title="<%= title %>">\
                    <i class="icon-trash"></i>\
                </span>\
            <% } %>\
        </td>\
    </tr>');

var tmp_input_tr = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- gettext(fieldTitle) %></h4></th>\
        <%= inputForm %>\
    </tr>');

var tmp_input = _.template('<td>\
        <input class="entryForm" type="<%- fieldType %>" name="<%- fieldName %>" id="id_<%- fieldName %>" value="<%- fieldValue %>" />\
    </td>');

/*var tmp_select = _.template('<td>\
        <select class="entryForm dk" name="<%- fieldName %>" id="id_<%- fieldName %>">\
            <option value="<%- fieldDefault.value %>"><%- fieldDefault.title %></option>\
            <% _.each(options, function(option) { %>\
                <option value="<%- option.value %>"<% if(option.value == fieldValue) { %> selected<%} %>><%- option.title %></option>\
            <% }) %>\
        </select>\
    </td>');*/

var tmp_select = _.template('<td>\
        <div class="fw-bib-select-pulldown fw-button fw-white">\
            <label><% if("" == fieldValue) { %><%- fieldDefault.title %><% } else { %><%- fieldTitle %><% } %></label>\
            <span class="icon-down-dir"></span>\
            <div class="fw-pulldown fw-left">\
                <ul class="entryForm" data-field-name="<%- fieldName %>" data-type="fieldkeys" id="id_<%- fieldName %>">\
                    <% if("" != fieldDefault.value) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if("" == fieldValue || fieldDefault.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- fieldDefault.value %>">\
                            <%- fieldDefault.title %>\
                        </span></li>\
                    <% } %>\
                    <% _.each(options, function(option) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if(option.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- option.value %>">\
                            <%- option.title %>\
                        </span></li>\
                    <% }) %>\
                </ul>\
            </div>\
        </div>\
    </td>');

var tmp_dateinput = _.template('<td class="entryForm fw-date-form" data-type="date" data-field-name="<%- fieldName %>">\
        <table class="fw-bib-date-table"><tr>\
            <td class="month-td"><input <%= monthSelect %> placeholder="Month" /></td>\
            <td class="day-td"><input <%= dateSelect %> placeholder="Day" /></td>\
            <td class="year-td"><input <%= yearSelect %> placeholder="Year" /></td>\
            <td class="fw-date-separator">-</td>\
            <td class="month-td2"><input <%= month2Select %> placeholder="Month" /></td>\
            <td class="day-td2"><input <%= date2Select %> placeholder="Day" /></td>\
            <td class="year-td2"><input <%= year2Select %> placeholder="Year" /></td>\
        </tr></table>\
    </td>');

var tmp_dateselect = _.template('type="text" name="<%- fomrname %>" class="select-<%- type %>" value="<%- value %>"');
var tmp_list_input = _.template('<td class="entryForm" data-type="<%- filedType %>" data-field-name="<%- fieldName %>">\
        <%= inputForm %>\
    </td>');

var tmp_namelist_input = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input">\
            <input type="text" class="fw-name-input fw-first" value="<%= val.first %>" placeholder="' + gettext('First Name') + '" />\
            <input type="text" class="fw-name-input fw-last" value="<%= val.last %>" placeholder="' + gettext('Last Name') + '" />\
            <span class="fw-add-input icon-addremove"></span>\
        </div>\
    <% }) %>');

var tmp_literallist_input = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input"><input class="fw-input" type="text" value="<%= val %>" /><span class="fw-add-input icon-addremove"></span></div>\
    <% }) %>');

var tmp_eitheror_tr = _.template('<tr class="eitheror">\
        <th>\
            <div class="fw-bib-field-pulldown fw-bib-form-pulldown">\
                <label><%- selected.title %></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown field-names fw-left">\
                    <ul><% _.each(fields, function(field) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(selected.id == field.id) { %> selected<% } %>"\
                                data-value="<%= field.name %>">\
                                <%- field.title %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>');

var date_format = {
    'y': gettext('Year'),
    'y/y': gettext('Year - Year'),
    'my': gettext('Month/Year'),
    'my/my': gettext('M/Y - M/Y'),
    'mdy': gettext('Month/Day/Year'),
    'mdy/mdy': gettext('M/D/Y - M/D/Y')
};
var tmp_dateinput_tr = _.template('<tr class="date-input-tr" data-format="<%= format %>">\
        <th>\
            <div class="fw-data-format-pulldown fw-bib-form-pulldown">\
                <label><%- fieldTitle %> <span>(<%- date_format[format] %>)</span></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown fw-left">\
                    <ul><% _.each(date_format, function(format_title, key) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(key == format) { %> selected<% } %>"\
                                data-value="<%= key %>">\
                                <%- format_title %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>');

var tmp_bibliography_category_list_item = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- bCat.id %>">\
            <%- bCat.category_title %>\
        </span>\
    </li>\
');

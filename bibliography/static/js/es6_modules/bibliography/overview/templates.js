/** A template for the editing of bibliography categories list. */
export let editCategoriesTemplate = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>')

/** A template for each category in the category list edit of the bibliography categories list. */
export let categoryFormsTemplate = _.template('\
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
    </tr>')



/* A template for the overview list of bibliography items. */
export let bibtableTemplate = _.template('\
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
    </tr>')

/** A template of a bibliography category list item. */
export let bibliographyCategoryListItemTemplate = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- bCat.id %>">\
            <%- bCat.category_title %>\
        </span>\
    </li>\
')

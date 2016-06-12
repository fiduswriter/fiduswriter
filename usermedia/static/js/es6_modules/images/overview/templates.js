/** A template to edit image categories. */
export let usermediaEditcategoriesTemplate = _.template('\
    <div id="editCategories" title="<%- dialogHeader %>">\
        <table id="editCategoryList" class="fw-dialog-table"><tbody><%= categories %></tbody></table>\
    </div>')

/** A template for the image category edit form. */
export let usermediaCategoryformsTemplate = _.template('\
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

/** A template for image overview list. */
export let usermediaTableTemplate = _.template('\
                <tr id="Image_<%- pk %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>">\
                    <td width="30">\
                        <span class="fw-inline">\
                            <input type="checkbox" class="entry-select" data-id="<%- pk %>">\
                        </span>\
                    </td>\
                    <td width="350" class="title">\
                        <span class="fw-usermedia-image">\
                            <img src="<% if(thumbnail) { %><%- thumbnail %><% } else { %><%- image %><% } %>">\
                        </span>\
                        <span class="fw-inline fw-usermedia-title">\
                            <span class="edit-image fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- title !== "" ? title : "'+gettext('Untitled')+'" %>\
                            </span>\
                            <span class="fw-usermedia-type"><%- fileType %></span>\
                        </span>\
                    </td>\
                    <td width="170" class="type ">\
                        <span class="fw-inline"><%- width %> x <%- height %></span>\
                    </td>\
                    <td width="170" class="file_type ">\
                        <span class="fw-inline"><%= localizeDate(added, true) %></span>\
                    </td>\
                    <td width="50" align="center">\
                        <span class="delete-image fw-inline fw-link-text" data-id="<%- pk %>" data-title="<%- title %>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                </tr>')

/* A template for each image category list item */
export let usermediaCategoryListItemTemplate = _.template('\
    <li>\
        <span class="fw-pulldown-item" data-id="<%- iCat.id %>">\
            <%- iCat.category_title %>\
        </span>\
    </li>')

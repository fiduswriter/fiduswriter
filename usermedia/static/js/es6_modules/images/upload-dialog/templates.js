/* A template for the form for the image upload dialog. */
export let usermediaUploadTemplate = _.template('<div id="uploadimage" class="fw-media-uploader" title="<%- action %>">\
    <form action="#" method="post" class="usermediaUploadForm">\
        <div>\
            <input name="title" class="fw-media-title fw-media-form" type="text" placeholder="' + gettext('Insert a title') + '" value="<%- title %>" />\
            <button type="button" class="fw-media-select-button fw-button fw-light">'
                + gettext('Select a file') +
            '</button>\
            <input name="image" type="file" class="fw-media-file-input fw-media-form">\
        </div>\
        <div class="figure-preview"><div>\
            <% if(image) { %><img src="<%- image %>" /><% } %>\
        </div></div>\
        <%= categories %>\
    </form></div>')

/* A template for the image category selection of the image selection dialog. */
export let usermediaUploadCategoryTemplate = _.template('<% if(0 < categories.length) { %>\
        <div class="fw-media-category">\
            <div><%- fieldTitle %></div>\
            <% _.each(categories, function(cat) { %>\
                <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="imageCat<%- cat.id %>">\
                    <%- cat.category_title %>\
                </label>\
                <input class="fw-checkable-input fw-media-form entry-cat" type="checkbox"\
                    id="imageCat<%- cat.id %>" name="imageCat" value="<%- cat.id %>"<%- cat.checked %>>\
            <% }); %>\
        </div>\
    <% } %>')

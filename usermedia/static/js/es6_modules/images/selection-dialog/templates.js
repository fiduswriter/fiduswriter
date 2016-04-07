/** Simpler image overview table for use in editor. */
export let usermediaImageItemSelectionTemplate =  _.template('\
<tr id="Image_<%- pk %>" class="<% _.each(cats, function(cat) { %>cat_<%- cat %> <% }) %>" >\
     <td class="type" style="width:100px;">\
        <% if (typeof thumbnail !== "undefined") { %>\
            <img src="<%- thumbnail %>" style="max-heigth:30px;max-width:30px;">\
        <% } else { %>\
            <img src="<%- image %>" style="max-heigth:30px;max-width:30px;">\
        <% } %>\
    </td>\
    <td class="title" style="width:212px;">\
        <span class="fw-inline">\
            <span class="edit-image fw-link-text icon-figure" data-id="<%- pk %>">\
                <%- title %>\
            </span>\
        </span>\
    </td>\
    <td class="checkable" style="width:30px;">\
    </td>\
</tr>')

/** A template to select images. */
export let usermediaImageSelectionTemplate = _.template('\
    <div>\
        <table id="select_imagelist" class="tablesorter fw-document-table" style="width:342px;">\
            <thead class="fw-document-table-header">\
                <tr>\
                    <th width="50">'+gettext('Image')+'</th>\
                    <th width="150">'+gettext('Title')+'</th>\
                </tr>\
            </thead>\
            <tbody class="fw-document-table-body fw-small">\
                <% _.each(imageDB, function (anImage) { %> <%= usermediaImageItemSelectionTemplate(anImage) %> <% }); %>\
            </tbody>\
        </table>\
        <div class="dialogSubmit">\
            <button id="selectImageUploadButton" class="fw-button fw-light">' +
                gettext('Upload') +
                '<span class="icon-plus-circle"></span>\
            </button>\
            <button type="button" id="selectImageSelectionButton" class="fw-button fw-dark">' +
                gettext('Use image') +
            '</button>\
             <button type="button" id="cancelImageSelectionButton" class="fw-button fw-orange">' +
                gettext('Cancel') +
            '</button>\
        </div>\
    </div>\
')

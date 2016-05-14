export let linkDialogTemplate = _.template('\
    <div title="' + gettext("Link") + '">\
        <p><input class="linktitle" type="text" value="<%- linkTitle %>" placeholder="' + gettext("Link text (optional") + '"/></p>\
        <p><input class="link" type="text" value="<%- link  %>" placeholder="' + gettext("Link") + '"/></p>\
    </div>\
')

export let mathDialogTemplate = _.template('\
    <div title="' + gettext("Math") + '">\
        <p><span class="math-field-header">Type formula here: </span><span class="math-field" type="text" name="math" ></span></p>\
        <p><span class="math-field-header">LATEX result: </span><span class="math-latex"></span></p>\
        <div class="math-error"></div>\
    </div>\
')

export let figureImageItemTemplate =  _.template('\
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

/** A template to select images inside the figure configuration dialog in the editor. */
export let figureImageTemplate = _.template('\
    <div>\
        <table id="imagelist" class="tablesorter fw-document-table" style="width:342px;">\
            <thead class="fw-document-table-header">\
                <tr>\
                    <th width="50">'+gettext('Image')+'</th>\
                    <th width="150">'+gettext('Title')+'</th>\
                </tr>\
            </thead>\
            <tbody class="fw-document-table-body fw-small">\
                <% _.each(imageDB, function (anImage) { %> <%= figureImageItemTemplate(anImage) %> <% }); %>\
            </tbody>\
        </table>\
        <div class="dialogSubmit">\
            <button class="edit-image createNew fw-button fw-light">' +
                gettext('Upload') +
                '<span class="icon-plus-circle"></span>\
            </button>\
            <button type="button" id="selectImageFigureButton" class="fw-button fw-dark">' +
                gettext('Insert') +
            '</button>\
             <button type="button" id="cancelImageFigureButton" class="fw-button fw-orange">' +
                gettext('Cancel') +
            '</button>\
        </div>\
    </div>\
')

    /** A template to configure the display of a figure in the editor. */
export let configureFigureTemplate = _.template('\
    <div class="fw-media-uploader">\
            <div>\
                <input class="fw-media-title figure-math" type="text" name="figure-math" placeholder="'
                    + gettext('Insert formula') + '" value="<%- equation %>" <%if (image) {%>disabled=disabled<%} %>/>\
                <button type="button" id="insertFigureImage" class="fw-button fw-light<%if (equation!=="") {%> disabled<%} %>">'
                    + gettext('Insert image') + ' <i class="icon-figure"></i>\
                </button>\
            </div>\
            <input type="hidden" id="figure-category">\
            <div style="margin-top: 10px;">\
                <div id="figure-category-btn" class="fw-button fw-light fw-large">\
                    <input type="hidden" id="figure-category" />\
                    <label></label>\
                    <span class="icon-down-dir"></span>\
                </div>\
                <div id="figure-category-pulldown" class="fw-pulldown fw-left" style="left: 10px;">\
                    <ul id="figure-category-list">\
                        <li><span class="fw-pulldown-item" id="figure-category-none">' +
        gettext('None') +
        '</span></li>\
                        <li><span class="fw-pulldown-item" id="figure-category-figure">' +
        gettext('Figure') +
        '</span></li>\
                        <li><span class="fw-pulldown-item" id="figure-category-photo">' +
        gettext('Photo') +
        '</span></li>\
                        <li><span class="fw-pulldown-item" id="figure-category-table">' +
        gettext('Table') +
        '</span></li>\
                    </ul>\
                </div>\
            </div>\
            <div class="figure-preview">\
                <div id="inner-figure-preview"></div>\
            </div>\
            <div style="margin-top: 10px;"><input style="width: 402px;" class="caption" type="text" name="figure-caption" value="<%- caption %>" placeholder="' +
        gettext('Insert caption') +
        '" /></div>\
        </div>')

/** A template to configure citations in the editor */
export let configureCitationTemplate = _.template('\
    <div title="' + gettext('Configure Citation') + '">\
        <div id="my-sources" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My sources") + '</h3>\
            <table id="cite-source-table" class="fw-document-table">\
                <thead class="fw-document-table-header"><tr>\
                    <th width="161">' + gettext("Title") + '</th>\
                    <th width="161">' + gettext("Author") + '</th>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-min">\
                    <%= citableItemsHTML %>\
                </tbody>\
            </table>\
        </div>\
        <span id="add-cite-book" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
        <div id="cite-books" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("Citation format") + '</h3>\
            <div id="citation-style-selector" class="fw-pulldown-select">\
                <div id="citation-style-label" class="fw-pulldown-select-label" data-style="<%= citeFormat %>"><label>\
                <% if("textcite" == citeFormat){ %>'
                    + gettext("Author (1998)") +
                '<% } else { %>'
                    + gettext("(Author, 1998)") +
                '<% } %>\
                </label></div>\
                <div id="citation-style-pulldown" class="fw-pulldown fw-left">\
                    <ul>\
                        <li>\
                            <span class="fw-pulldown-item" data-style="autocite">'
                                + gettext("(Author, 1998)") +
                            '</span>\
                        </li>\
                        <li>\
                            <span class="fw-pulldown-item" data-style="textcite">'
                                + gettext("Author (1998)") +
                            '</span>\
                        </li>\
                    </ul>\
                </div>\
            </div>\
            <table id="selected-cite-source-table" class="fw-document-table tablesorter">\
                <thead class="fw-document-table-header"><tr>\
                    <th width="135">' + gettext("Title") + '</th>\
                    <th width="135">' + gettext("Author") + '</th>\
                    <td width="50" align="center">' + gettext("Remove") + '</td>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-min">\
                  <%= citedItemsHTML %>\
                </tbody>\
            </table>\
        </div>\
    </div>')

/** A template for each item that can be cited inside the citation configuration dialog of the editor. */
export let citationItemTemplate = _.template('<tr class="fw-checkable fw-checkable-tr" data-id="<%- id %>" data-type="<%- type %>" data-title="<%= title %>" data-author="<%= author %>">\
        <td width="162">\
            <span class="fw-document-table-title fw-inline">\
                <i class="icon-book"></i>\
                <span class="fw-searchable"><%- title %></span>\
            </span>\
        </td>\
        <td width="163">\
            <span class="fw-inline fw-searchable"><%- author %></span>\
        </td>\
    </tr>')

/** A template for each selected citation item inside the citation configuration dialog of the editor. */
export let selectedCitationTemplate = _.template('<tr id="selected-source-<%= id %>" class="selected-source"><td colspan="3" width="335">\
      <table class="fw-cite-parts-table">\
          <tr>\
              <td width="135">\
                  <span class="fw-document-table-title fw-inline">\
                      <i class="icon-book"></i>\
                      <span data-id="<%- id %>" data-type="<%- type %>">\
                          <%- title %>\
                      </span>\
                  </span>\
              </td>\
              <td width="135">\
                  <span class="fw-inline">\
                      <%- author %>\
                  </span>\
              </td>\
              <td width="50" align="center">\
                  <span class="delete fw-inline fw-link-text" data-id="<%- id %>">\
                      <i class="icon-trash"></i>\
                  </span>\
              </td>\
          </tr>\
          <tr>\
              <td class="cite-extra-fields" colspan="3" width="335">\
                  <div>\
                      <label>' + gettext('Page') + '</label>\
                      <input class="fw-cite-page" type="text" value="<%= page %>" />\
                  </div>\
                  <div>\
                      <label>' + gettext('Text before') + '</label>\
                      <input class="fw-cite-text" type="text" value="<%= prefix %>" />\
                  </div>\
              </td>\
          </tr>\
      </table>\
  </td></tr>')

export let linkDialogTemplate = _.template('\
    <div title="' + gettext("Link") + '">\
    <% if (internalTargets.length) { %>\
        <div class="fw-radio">\
            <input type="radio" name="link-type" value="internal" class="link-internal-check">\
            <label class="link-internal-label">' + gettext("Internal") + '</label>\
        </div>\
        <div class="fw-select-container">\
            <select class="internal-link-selector fw-button fw-white fw-large" required="">\
                <option class="placeholder" selected="" disabled="" value="">\
                    ' + gettext("Select Target") + '\
                </option>\
                <% internalTargets.forEach(target => { %>\
                    <option class="link-item" type="text" value="<%= target.id %>" <%= link === "#"+target.id ? "selected" : "" %>>\
                        <%= target.text %>\
                    </option>\
                <% }); %>\
            </select>\
            <div class="fw-select-arrow icon-down-dir"></div>\
        </div>\
        <p></p>\
        <div class="fw-radio">\
            <input type="radio" name="link-type" value="external" class="link-external-check">\
            <label class="link-external-label">' + gettext("External") + '</label>\
        </div>\
    <% } %>\
        <input class="link-title" type="text" value="<%- linkTitle  %>" placeholder="' + gettext("Link title") + '"/>\
        <p></p>\
        <input class="link" type="text" value="<%- ["#", undefined].includes(link[0]) ? defaultLink : link %>" placeholder="' + gettext("URL") + '"/>\
    </div>\
')

/** Dialog to add a note to a revision before saving. */
export let revisionDialogTemplate = _.template('\
<div title="'+gettext('Revision description')+'">\
  <p>\
    <input type="text" class="revision-note" placeholder="'+gettext('Description (optional)')+'">\
  </p>\
</div>')

export let tableInsertTemplate = _.template(`
    <table class="insert-table-selection">
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
        <tr>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
            <td>&nbsp;</td>
        </tr>
    </table>
`)

export let tableEditTemplate = _.template(`
    <div>
        <div class="table-edit-button-group">
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Insert row before")+ `">
                    <label class="row-before">` + gettext("Insert row before")+ `</label>
                </span>
            </div>
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Insert row after")+ `">
                    <label class="row-after">` + gettext("Insert row after")+ `</label>
                </span>
            </div>
        </div>
        <div class="table-edit-button-group">
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Insert column before")+ `">
                    <label class="col-before">` + gettext("Insert column before")+ `</label>
                </span>
            </div>
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Insert column after")+ `">
                    <label class="col-after">` + gettext("Insert column after")+ `</label>
                </span>
            </div>
        </div>
        <div class="table-edit-button-group">
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Remove row")+ `">
                    <label class="row-remove">` + gettext("Remove row")+ `</label>
                </span>
            </div>
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Remove column")+ `">
                    <label class="col-remove">` + gettext("Remove column")+ `</label>
                </span>
            </div>
            <div class="fw-button fw-dark ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
                <span class="ui-button-text" title="` + gettext("Remove table")+ `">
                    <label class="table-remove">` + gettext("Remove table")+ `</label>
                </span>
            </div>
        </div>
    </div>
`)

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
                <input class="fw-media-title figure-math" type="text" name="figure-math" placeholder="' +
                    gettext('Insert formula') + '" value="<%- equation %>" <%if (image && image !== "false") {%>disabled=disabled<%} %>/>\
                <button type="button" id="insertFigureImage" class="fw-button fw-light<%if (equation!=="") {%> disabled<%} %>">' +
                    gettext('Insert image') + ' <i class="icon-figure"></i>\
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
            <div class="fw-select-container">\
                <select id="citation-style-selector" class="fw-button fw-white fw-large" required="">\
                    <option value="autocite" <%= citeFormat==="autocite" ? "selected" : "" %>>' + gettext("(Author, 1998)") + '\
                    <option value="textcite" <%= citeFormat==="textcite" ? "selected" : "" %>>' + gettext("Author (1998)") + '\
                </select>\
                <div class="fw-select-arrow icon-down-dir"></div>\
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
export let citationItemTemplate = _.template('<tr class="fw-checkable fw-checkable-tr" data-id="<%- id %>" data-type="<%- bib_type %>" data-title="<%- title %>" data-author="<%= author %>">\
        <td width="162">\
            <span class="fw-document-table-title fw-inline">\
                <i class="icon-book"></i>\
                <span class="fw-searchable"><%= title %></span>\
            </span>\
        </td>\
        <td width="163">\
            <span class="fw-inline fw-searchable"><%- author %></span>\
        </td>\
    </tr>')

/** A template for each selected citation item inside the citation configuration dialog of the editor. */
export let selectedCitationTemplate = _.template('\
<tr id="selected-source-<%= id %>" class="selected-source">\
    <td colspan="3" width="335">\
      <table class="fw-cite-parts-table">\
          <tr>\
              <td width="135">\
                  <span class="fw-document-table-title fw-inline">\
                      <i class="icon-book"></i>\
                      <span data-id="<%- id %>" data-type="<%- bib_type %>">\
                          <%= title %>\
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
                      <input class="fw-cite-page" type="text" value="<%= locator %>" />\
                  </div>\
                  <div>\
                      <label>' + gettext('Text before') + '</label>\
                      <input class="fw-cite-text" type="text" value="<%= prefix %>" />\
                  </div>\
              </td>\
          </tr>\
      </table>\
  </td>\
</tr>')

/** A template for the list of books */
export let bookListTemplate = _.template('\
<% _.each(bookList,function(aBook,key,list){%>\
    <tr id="Book_<%- aBook.id %>" <% if (user.id == aBook.owner) { %>class="owned-by-user"<% } %> >\
       <td width="20">\
           <span class="fw-inline">\
               <input type="checkbox" class="entry-select"\
                   data-id="<%- aBook.id %>"\
                   data-owner="<%- aBook.owner %>"/>\
           </span>\
       </td>\
       <td width="280">\
           <span class="fw-document-table-title fw-inline">\
               <i class="icon-book"></i>\
               <span class="book-title fw-link-text fw-searchable" data-id="<%- aBook.id %>">\
                   <%  if (aBook.title.length > 0) { %>\
                       <%- aBook.title %>\
                   <% } else { %>' +
                       gettext('Untitled') +
                   '<% } %>\
               </span>\
           </span>\
       </td>\
       <td width="150">\
           <span class="fw-inline"><%- aBook.added %></span>\
       </td>\
       <td width="140">\
           <span class="fw-inline"><%- aBook.updated %></span>\
       </td>\
       <td width="210">\
           <span>\
               <img class="fw-avatar" src="<%- aBook.owner_avatar %>" />\
           </span>\
           <span class="fw-inline fw-searchable"><%- aBook.owner_name %></span>\
       </td>\
       <td width="80" align="center">\
           <span class="rights fw-inline" data-id="<%- aBook.id %>">\
               <i data-id="<%- aBook.id %>" class="icon-access-right icon-access-<%- aBook.rights %>"></i>\
           </span>\
       </td>\
        <td width="40" align="center">\
           <span class="delete-book fw-inline fw-link-text" data-id="<%- aBook.id %>" data-title="<%- aBook.title %>">\
               <% if (user.id === aBook.owner) { %><i class="icon-trash"></i><% } %>\
           </span>\
       </td>\
   </tr>\
<% }); %>')


/** A template for the Fidus Writer document file uploader. */
/*var tmp_import_fidus = _.template('<div id="importfidus" title="' + gettext('Import a Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" required />\
            <span id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');*/

/** A template for the basic info book template pane */
export let bookBasicInfoTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Title")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-title" value="<%- theBook.title %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Author")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-author" value="<%- theBook.metadata.author %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Subtitle")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-subtitle" value="<%- theBook.metadata.subtitle %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Publisher")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-publisher" value="<%- theBook.metadata.publisher %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Copyright notice")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-copyright" value="<%- theBook.metadata.copyright %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title" title="'+gettext("Comma separated keywords")+'">'+gettext("Keywords")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-keywords" value="<%- theBook.metadata.keywords %>" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
')

/** A template for the citation style pane of the book dialog */
export let bookBibliographyDataTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Citation style")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-citationstyle" id="book-settings-citationstyle" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
            <% _.each(citationDefinitions.styles, function(citationstyle, key) { %>\
                <option value="<%= key %>"<% if(key == theBook.settings.citationstyle) { %> selected<%} %>><%= citationDefinitions.styles[key].name %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
')

/** A template for the print related data pane of the book dialog */
export let bookPrintDataTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Document style")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-documentstyle" id="book-settings-documentstyle" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
            <% _.each(documentStyleList, function(documentstyle) { %>\
                <option value="<%= documentstyle.filename %>"<% if(documentstyle.filename == theBook.settings.documentstyle) { %> selected<%} %>><%= documentstyle.title %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Paper size")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-papersize" id="book-settings-papersize" <% if (theBook.rights==="read") {print("disabled=disabled")} %> >\
            <% _.each([["folio","' +
            gettext("Folio (15 x 12 inch)") + '"],["quarto","' +
            gettext("Quarto (12 × 9 inch)") + '"],["octavo","' +
            gettext("Octavo (9 x 6 inch)") + '"],["a5","' +
            gettext("A5") + '"],["a4","' +
            gettext("A4") +
            '"]], function(papersize) { %>\
                <option value="<%= papersize[0] %>"<% if(papersize[0] == theBook.settings.papersize) { %> selected<%} %>><%= papersize[1] %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
')

/** A template for the epub related data pane of the book dialog */
export let bookEpubDataTemplate = _.template('\
    <tr id="figure-preview-row">\
        <%= coverImage %>\
    </tr>\
    ')

/** A template for the cover image input on the epub pane of the book dialog. */
export let bookEpubDataCoverTemplate = _.template('\
        <th class="figure-preview-row">\
            <h4 class="fw-tablerow-title">'+gettext("Cover image")+'</h4>\
        </th>\
        <td>\
            <div class="figure-preview">\
                <div id="inner-figure-preview">\
                    <% if (theBook.cover_image) {%>\
                        <img src="<%= anImageDB.db[theBook.cover_image].image %>">\
                    <% } %>\
                </div>\
            </div>\
        </td>\
        <% if (theBook.rights==="write") { %>\
            <td class="figure-preview-row">\
                <button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only fw-button fw-dark" id="select-cover-image-button" role="button" aria-disabled="false">\
                    <span class="ui-button-text">'+gettext('Select Image')+'</span>\
                </button>\
                <% if (theBook.cover_image) {%>\
                    <button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only fw-button fw-orange" id="remove-cover-image-button" role="button" aria-disabled="false">\
                        <span class="ui-button-text">'+gettext('Remove Image')+'</span>\
                    </button>\
                <% } %>\
            </td>\
        <% } %>\
')

/** A template for the book dialog. */
export let bookDialogTemplate = _.template('\
    <div id="book-dialog" title="<%- dialogHeader %>">\
        <div id="bookoptionsTab">\
            <ul>\
                <li><a href="#optionTab1" class="fw-button fw-large">' + gettext('Basic info') + '</a></li>\
                <li><a href="#optionTab2" class="fw-button fw-large">' + gettext('Chapters') + '</a></li>\
                <li><a href="#optionTab3" class="fw-button fw-large">' + gettext('Bibliography') + '</a></li>\
                <li><a href="#optionTab4" class="fw-button fw-large">' + gettext('Epub') + '</a></li>\
                <li><a href="#optionTab5" class="fw-button fw-large">' + gettext('Print/PDF') + '</a></li>\
            </ul>\
            <div id="optionTab1"><table class="fw-dialog-table"><tbody><%= basicInfo %></tbody></table></div>\
            <div id="optionTab2"><%= chapters %></div>\
            <div id="optionTab3"><table class="fw-dialog-table"><tbody><%= bibliographyData %></tbody></table></div>\
            <div id="optionTab4"><table class="fw-dialog-table fw-media-uploader"><tbody><%= epubData %></tbody></table></div>\
            <div id="optionTab5"><table class="fw-dialog-table"><tbody><%= printData %></tbody></table></div>\
        </div>\
    </div>')

/** A template for the chapter pane of the book dialog. */
export let bookDialogChaptersTemplate = _.template('\
    <% if (theBook.rights==="write") { %>\
        <div class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My documents") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="332">' + gettext("Documents") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small" id="book-document-list">\
                    <%= documents %>\
                </tbody>\
            </table>\
        </div>\
        <span id="add-chapter" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
    <% } %>\
        <div class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("Book chapters") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="242">' + gettext("Title") + '</th>\
                <% if (theBook.rights==="write") { %>\
                    <th width="30">' + gettext("Sort") + '</th><th width="50">' + gettext("Delete") + '</th></tr></thead>\
                <% } %>\
                <tbody class="fw-document-table-body fw-small" id="book-chapter-list">\
                    <%= chapters %>\
                </tbody>\
            </table>\
        </div>\
    '
)

/** A template for the chapter list on the chapter pane the book dialog. */
export let bookChapterListTemplate = _.template('\
    <% var partCounter = 1; %>\
    <% _.each(_.sortBy(theBook.chapters, function (chapter) {return chapter.number;}), function(aChapter,index,list) { %>\
        <% var aDocument = _.findWhere(documentList, {id: aChapter.text});%>\
            <tr class="<% if(typeof(aDocument) === "undefined") {print("noaccess")} %>" >\
                <td width="222" data-id="<%- aChapter.text %>" class="fw-checkable-td">\
                    <span class="fw-inline">\
                        <% if(typeof(aDocument) === "undefined") {%>\
                            <i class="icon-minus-circle"></i>\
                        <% } %>\
                        <% if (aChapter.part!="") { %>\
                            <b class="part"><%- partCounter++ %>. '+gettext('Book part')+': <%- aChapter.part %></b><br>\
                        <% } %>\
                        <%- aChapter.number %>. \
                        <% var documentTitle; if (0===aDocument.title.length) {documentTitle="'+gettext('Untitled')+'";} else {documentTitle=aDocument.title;} %>\
                        <%- documentTitle %>\
                    </span>\
                </td>\
                <% if (theBook.rights==="write") { %>\
                    <td width="30" data-id="<%- aChapter.text %>" class="edit-chapter">\
                        <i class="icon-edit fw-link-text"></i>\
                    </td>\
                        <% if (index!=0) { %>\
                            <td width="10" class="book-sort-up" data-id="<%- aChapter.text %>">\
                                <i class="icon-sort-up fw-link-text"></i>\
                            </td>\
                        <% } else { %>\
                            <td width="10"></td>\
                        <% } %>\
                        <% if ((index+1)!=list.length) { %>\
                            <td width="10" class="book-sort-down" data-id="<%- aChapter.text %>">\
                                <i class="icon-sort-down fw-link-text"></i>\
                            </td>\
                        <% } else { %>\
                            <td width="10"></td>\
                        <% } %>\
                        <td width="50" align="center">\
                            <span class="delete-chapter fw-inline" data-id="<%- aChapter.text %>"><i class="icon-trash fw-link-text"></i></span>\
                        </td>\
                    <% } else { %>\
                        <td width="30"></td>\
                        <td width="10"></td>\
                        <td width="10"></td>\
                        <td width="50"></td>\
                    <% } %>\
            </tr>\
    <% }) %>\
    '
)
/** A template for the document list on the chapter pane of the book dialog */
export let bookDocumentListTemplate = _.template('\
      <% _.each(documentList, function(aDocument) { %>\
          <% var documentTitle; if (0===aDocument.title.length) {documentTitle="'+gettext('Untitled')+'";} else {documentTitle=aDocument.title;} %>\
          <% if (!(_.findWhere(theBook.chapters, {text:aDocument.id}))) { %>\
              <tr>\
                  <td width="332" data-id="<%- aDocument.id %>" class="fw-checkable fw-checkable-td">\
                      <span class="fw-inline">\
                          <%- documentTitle %>\
                      </span>\
                  </td>\
              </tr>\
          <% } %>\
      <% }) %>\
      '
)

/** A template for the chapter dialog for books */
export let bookChapterDialogTemplate = _.template('\
    <div id="book-chapter-dialog" title="<%- dialogHeader %>">\
        <table class="fw-dialog-table">\
            <tr>\
                <th>\
                    <h4 title="'+gettext('If this chapter starts a part of the book, specify the title of that part here')+'">'+gettext('Book part title')+'</h4>\
                </th>\
                <td>\
                    <input type="text" id="book-chapter-part" value="<%- aChapter.part %>">\
                </td>\
           </tr>\
       </table>\
    </div>\
    '
)

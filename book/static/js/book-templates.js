/**
 * @file Templates for the book overview page.
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
/** A template for the list of books */
var tmp_book_list = _.template('\
<% _.each(theBookList,function(aBook,key,list){%><%= tmp_book_list_item({aBook:aBook})%><% }); %>');
/** A template for a book in the list of books */
var tmp_book_list_item = _.template('\
 <tr id="Book_<%- aBook.id %>" <% if (theUser.id == aBook.owner) { %>class="owned-by-user"<% } %> >\
                <td width="20">\
                    <span class="fw-inline">\
                        <input type="checkbox" class="entry-select"\
                            data-id="<%- aBook.id %>"\
                            data-owner="<%- aBook.owner %>"/>\
                    </span>\
                </td>\
                <td width="225">\
                    <span class="fw-document-table-title fw-inline">\
                        <i class="icon-book"></i>\
                        <span class="book-title fw-link-text fw-searchable" data-id="<%- aBook.id %>">\
                            <%  if (aBook.title.length > 0) { %>\
                                <%- aBook.title %>\
                            <% } else { %>\
                                '+gettext('Untitled')+'\
                            <% } %>\
                        </span>\
                    </span>\
                </td>\
                <td width="115">\
                    <span class="fw-inline"><%- aBook.added %></span>\
                </td>\
                <td width="115">\
                    <span class="fw-inline"><%- aBook.updated %></span>\
                </td>\
                <td width="170">\
                    <span>\
                        <img class="fw-avatar" src="<%- aBook.owner_avatar %>" />\
                    </span>\
                    <span class="fw-inline fw-searchable"><%- aBook.owner_name %></span>\
                </td>\
                <td width="60" align="center">\
                    <span class="rights fw-inline" data-id="<%- aBook.id %>">\
                        <i data-id="<%- aBook.id %>" class="icon-access-right <%- aBook.rights %>"></i>\
                    </span>\
                </td>\
                 <td width="40" align="center">\
                    <span class="delete-book fw-inline fw-link-text" data-id="<%- aBook.id %>" data-title="<%- aBook.title %>">\
                        <% if (theUser.id === aBook.owner) { %><i class="icon-trash"></i><% } %>\
                    </span>\
                </td>\
            </tr>\
');
/** A template for the Fidus Writer document file uploader. */
var tmp_import_fidus = _.template('<div id="importfidus" title="' + gettext('Import a Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" required />\
            <span id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');

/** A template for the basic info book template pane */
var tmp_book_basic_info = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Title")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-title" value="<%- theBook.title %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Author")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-author" value="<%- theBook.metadata.author %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Subtitle")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-subtitle" value="<%- theBook.metadata.subtitle %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Publisher")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-publisher" value="<%- theBook.metadata.publisher %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Copyright notice")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-copyright" value="<%- theBook.metadata.copyright %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title" title="'+gettext("Comma separated keywords")+'">'+gettext("Keywords")+'</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-keywords" value="<%- theBook.metadata.keywords %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
');
/** A template for the citation style pane of the book dialog */
var tmp_book_bibliography_data = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Citation style")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-citationstyle" id="book-settings-citationstyle" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each(citeprocHelpers.styles, function(citationstyle, key) { %>\
                <option value="<%= key %>"<% if(key == theBook.settings.citationstyle) { %> selected<%} %>><%= this.citeprocHelpers.styleNames[key] %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
');
/** A template for the print related data pane of the book dialog */
var tmp_book_print_data = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Document style")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-documentstyle" id="book-settings-documentstyle" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each([["classic","Classic"],["modern","Modern"],["funky","Funky"]], function(documentstyle) { %>\
                <option value="<%= documentstyle[0] %>"<% if(documentstyle[0] == theBook.settings.documentstyle) { %> selected<%} %>><%= documentstyle[1] %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">'+gettext("Paper size")+'</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-papersize" id="book-settings-papersize" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each([["folio","'
            +gettext("Folio (15 x 12 inch)")+'"],["quarto","'
            +gettext("Quarto (12 × 9 inch)")+'"],["octavo","'
            +gettext("Octavo (9 x 6 inch)")+'"],["a5","'
            +gettext("A5")+'"],["a4","'
            +gettext("A4")+
            '"]], function(papersize) { %>\
                <option value="<%= papersize[0] %>"<% if(papersize[0] == theBook.settings.papersize) { %> selected<%} %>><%= papersize[1] %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
');
/** A template for the epub related data pane of the book dialog */
var tmp_book_epub_data = _.template('\
    <tr id="figure-preview-row">\
        <%= coverImage %>\
    </tr>\
    ');

/** A template for the cover image input on the epub pane of the book dialog. */
var tmp_book_epub_data_cover = _.template('\
        <th class="figure-preview-row">\
            <h4 class="fw-tablerow-title">'+gettext("Cover image")+'</h4>\
        </th>\
        <td>\
            <div class="figure-preview">\
                <div id="inner-figure-preview">\
                    <% if (theBook.cover_image) {%>\
                        <img src="<%= anImageDB[theBook.cover_image].image %>">\
                    <% } %>\
                </div>\
            </div>\
        </td>\
        <% if (theBook.rights==="w") { %>\
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
');
/** A template for the cover image selection for the epub version of a book. */
var tmp_book_cover_image_selection = _.template('\
    <div id="book-cover-image-selection">\
        <table id="imagelist" class="tablesorter fw-document-table" style="width:342px;">\
            <thead class="fw-document-table-header">\
                <tr>\
                    <th width="50">'+gettext('Image')+'</th>\
                    <th width="150">'+gettext('Title')+'</th>\
                </tr>\
            </thead>\
            <tbody class="fw-document-table-body fw-small">\
                <% _.each(anImageDB, function (image) { %>\
                    <tr id="Image_<%- image.pk %>">\
                        <td class="type" style="width:100px;">\
                            <img src="<%- image.thumbnail %>" style="max-heigth:30px;max-width:30px;">\
                        </td>\
                        <td class="title" style="width:212px;">\
                            <span class="fw-inline">\
                                <span class="edit-image fw-link-text icon-figure" data-id="<%- image.pk %>">\
                                    <%- image.title %>\
                                </span>\
                            </span>\
                        </td>\
                        <td class="checkable" style="width:30px;">\
                        </td>\
                    </tr>\
                <% }) %>\
            </tbody>\
        </table>\
        <div class="dialogSubmit">\
            <button class="edit-image createNew fw-button fw-light">' +
                gettext('Upload new image') +
                '<span class="icon-plus-circle"></span>\
            </button>\
            <button type="button" id="selectImageFigureButton" class="fw-button fw-dark">' +
                gettext('Use selected image') +
            '</button>\
                        <button type="button" id="cancelImageFigureButton" class="fw-button fw-orange">' +
                gettext('Cancel') +
            '</button>\
        </div>\
    </div>\
');

/** A template for the book dialog. */
var tmp_book_dialog = _.template('\
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
    </div>');

/** A template for the chapter pane of the book dialog. */
var tmp_book_dialog_chapters = _.template('\
    <% if (theBook.rights==="w") { %>\
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
                <% if (theBook.rights==="w") { %>\
                    <th width="30">' + gettext("Sort") + '</th><th width="50">' + gettext("Delete") + '</th></tr></thead>\
                <% } %>\
                <tbody class="fw-document-table-body fw-small" id="book-chapter-list">\
                    <%= chapters %>\
                </tbody>\
            </table>\
        </div>\
    ');
/** A template for the chapter list on the chapter pane the book dialog. */
var tmp_book_chapter_list = _.template('\
                    <% var partCounter = 1; %>\
                    <% _.each(_.sortBy(theBook.chapters, function (chapter) {return chapter.number;}), function(aChapter,index,list) { %>\
                        <% var aDocument = _.findWhere(theDocumentList, {id: aChapter.text});%>\
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
                                <% if (theBook.rights==="w") { %>\
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
                    ');
/** A template for the document list on the chapter pane of the book dialog */
var tmp_book_document_list = _.template('\
                    <% _.each(theDocumentList, function(aDocument) { %>\
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
                    ');
/** A template for the chapter dialog for books */
var tmp_book_chapter_dialog = _.template('\
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
    ');
/** A template to create the OPF file of book epubs. */
var tmp_epub_book_opf = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= aBook.id %></dc:identifier>\n\
    \t\t<dc:title><%= aBook.title %></dc:title>\n\
    \t\t<dc:creator><% if (aBook.metadata.author && aBook.metadata.author != "") {\
            print(aBook.metadata.author);\
        } else {\
            print(theUser.name);\
        } %></dc:creator>\n\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    <% if (aBook.metadata.copyright && aBook.metadata.copyright != "") { %>\
    \t\t<dc:rights><%- aBook.metadata.copyright %></dc:rights>\
    <% } %>\
    <% if (aBook.metadata.publisher && aBook.metadata.publisher != "") { %>\
    \t\t<dc:publisher><%- aBook.metadata.publisher %></dc:publisher>\
    <% } %>\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    <% if (aBook.metadata.keywords && aBook.metadata.keywords != "") {\
        _.each(aBook.metadata.keywords.split(","),function(keyword) { %>\
            <dc:subject><%- jQuery.trim(keyword) %></dc:subject>\
    <% }); } %>\
    \t</metadata>\n\
    \t<manifest>\n\
    <% if (coverImage) { %>\
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\
    <% } %>\
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>\
    <% _.each(chapters, function (aChapter) { %>\
        \t\t<item id="t<%- aChapter.number %>" href="document-<%- aChapter.number %>.xhtml" <% if (aChapter.mathjax) { %>properties="scripted svg" <% } %>media-type="application/xhtml+xml" />\n\
    <% }); %>\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>\
        <% _.each(images,function(item, index){ %>\
            <%= tmp_epub_opf_image_item({"item":item, "index": index})%>\
        <% }); %>\
        <% _.each(styleSheets,function(item, index){ %>\
            <%= tmp_epub_opf_css_item({"item":item, "index": index})%>\
        <% }); %>\
        <% if (mathjax) {%>\
            <%= tmp_epub_opf_mathjax_items({})%>\
        <% }%>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
        <% if (coverImage) { %>\
            \t\t<itemref idref="cover" linear="no"/>\
        <% } %>\
        <itemref idref="titlepage" linear="yes"/>\
        <% _.each(chapters, function (aChapter) { %>\
            \t\t<itemref idref="t<%- aChapter.number %>" linear="yes" />\n\
        <% }); %>\
        <itemref idref="copyright" linear="yes"/>\
        <itemref idref="nav" linear="no"/>\
    \t</spine>\n\
    </package>\
    ');
/** A template to create the book epub cover XML. */
var tmp_epub_book_cover = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <div id="cover">\
            <img src="<%= coverImage.image.split("/").pop().split("?")[0] %>" alt="'+gettext('Cover Image')+'" title="Cover Image"/>\
        </div>\
    </body>\
</html>\
');
/** A template to create the book epub titlepage XML. */
var tmp_epub_book_titlepage = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
   <head>\
      <title><%- aBook.title %></title>\
      <meta charset="utf-8"/>\
   </head>\
   <body style="text-align: center;">\
      <div id="title" epub:type="frontmatter titlepage">\
          <h1><%- aBook.title %></h1>\
          <% if (aBook.metadata.subtitle !="") { %>\
            <h2><%- aBook.metadata.subtitle %></h2>\
          <% } %>\
          <% if (aBook.metadata.author !="") { %>\
            <h3>'+gettext('by')+' <%- aBook.metadata.author %></h3>\
          <% } %>\
      </div>\
   </body>\
</html>\
');
/** A template to create the book epub copyright page XML. */
var tmp_epub_book_copyright = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <section epub:type="frontmatter copyright-page">\
            <div id="copyright">\
                <p>\
                    <%- aBook.title %>\
                    <% if (aBook.metadata.author !="") { %>\
                        '+gettext('by')+' <%- aBook.metadata.author %>\
                    <% } %>\
                </p>\
                <% if (aBook.metadata.copyright !="") { %>\
                    <p><%- aBook.metadata.copyright %></p>\
                <% } %>\
                <p>'+gettext('Title')+': <% aBook.title %></p>\
                <% if (aBook.metadata.author && aBook.metadata.author !="") { %>\
                    <p>'+gettext('Author')+': <%- aBook.metadata.author %></p>\
                <% } %>\
                <% if (aBook.metadata.publisher && aBook.metadata.publisher !="") { %>\
                    <p>'+gettext('Published by')+': <%- aBook.metadata.publisher %></p>\
                <% } %>\
                <p>'+gettext('Last Updated')+': <%= aBook.updated %></p>\
                <p>'+gettext('Created')+': <%= aBook.added %></p>\
                <p>'+gettext('Language')+': <%= language %></p>\
                <p>'+gettext('Created by')+': <%= creator %></p>\
            </div>\
        </section>\
    </body>\
</html>\
');
/** A template to create the book index. */
var tmp_html_book_index = _.template('\
    <html>\n\
    \t<head>\n\
    \t\t<meta charset="utf-8"></meta>\n\
    \t\t<title><%- aBook.title %></title>\n\
    \t</head>\n\
    \t<body>\n\
    \t\t<h1><%- aBook.title %></h1>\
    <% if (aBook.metadata.subtitle !="") { %>\
        \t\t<h2><%- aBook.metadata.subtitle %></h2>\
    <% } %>\
    <% if (aBook.metadata.author !="") { %>\
        \t\t<h3>'+gettext('by')+' <%- aBook.metadata.author %></h3>\
    <% } %>\
    \t\t<ol>\n\
        <% _.each(contentItems,function(item){ %>\
            <%= tmp_html_book_index_item({"item":item})%>\
        <% }); %>\
    \t\t</ol>\n\
    <% if (aBook.metadata.publisher && aBook.metadata.publisher !="") { %>\
        \t\t<p>'+gettext('Published by')+': <%- aBook.metadata.publisher %></p>\
    <% } %>\
    \t\t<p>'+gettext('Last Updated')+': <%= aBook.updated %></p>\
    \t\t<p>'+gettext('Created')+': <%= aBook.added %></p>\
    \t\t<p>'+gettext('Language')+': <%= language %></p>\
    \t\t<p>'+gettext('Created by')+': <%= creator %></p>\
    \t</body>\n\
    </html>');
/** A template to create the book index item. */
var tmp_html_book_index_item = _.template('\t\t\t\t<li><a href="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.html#<% print(item.id); } %>"><%= item.title %></a>\
    <% if (item.subItems.length > 0) { %>\
        <ol>\
            <% _.each(item.subItems,function(item){ %>\
                <%= tmp_html_book_index_item({"item":item})%>\
            <% }); %>\
        </ol>\
    <% } %>\
</li>\n');
/** A template to create the latex book index. */
var tmp_latex_book_index = _.template('\
    <%= latexStart %>\
    <% _.each(aBook.chapters,function(chapter){ %>\
        <%= tmp_latex_book_index_item({chapter:chapter})%>\
    <% }); %>\
    <%= latexEnd %>\
');
/** A template to create latex book index items. */
var tmp_latex_book_index_item = _.template('\
<% if(chapter.part && chapter.part != "") { %>\
    \n\t\\part{<%= chapter.part %>}\
 <% } %>\
\n\t\\include{chapter-<%= chapter.number%>}\
');
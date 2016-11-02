/** A template for the initial pages of a book before the contents begin. */
export let bookPrintStartTemplate = _.template('\
    <h1 id="document-title"><%= theBook.title %></h1>\
    <% if (theBook.metadata.subtitle && theBook.metadata.subtitle != "" ) { %>\
        <h2 id="metadata-subtitle"><%= theBook.metadata.subtitle %></h2>\
    <% } %>\
    <% if (theBook.metadata.author && theBook.metadata.author != "" ) { %>\
        <h3><%= theBook.metadata.author %></h3>\
    <% } %>\
<div class="pagination-pagebreak"></div>\
    <% if (theBook.metadata.publisher && theBook.metadata.publisher != "" ) { %>\
        <div class="publisher"><%= theBook.metadata.publisher %></div>\
    <% } %>\
    <% if (theBook.metadata.copyright && theBook.metadata.copyright != "" ) { %>\
        <div class="copyright"><%= theBook.metadata.copyright %></div>\
    <% } %>\
<div class="pagination-pagebreak">\
')

/** A template for the print view of a book. */
export let bookPrintTemplate = _.template('\
<% _.each(theBook.chapters, function (chapter) { %>\
    <% var tempNode; %>\
    <% if (chapter.part && chapter.part != "") { %>\
        <div class="part">\
            <h1><%= chapter.part %></h1>\
        </div>\
    <% } %>\
    <div class="chapter">\
        <h1 class="title"><%= chapter.title %></h1>\
        <% if (chapter.metadata.subtitle) { %>\
            <h2 class="metadata-subtitle"><%= chapter.metadata.subtitle %></h2>\
        <% } %>\
        <% if (chapter.metadata.abstract ) { %>\
            <div class="metadata-abstract"><%= chapter.metadata.abstract %></div>\
        <% } %>\
        <%= docSchema.nodeFromJSON(_.findWhere(chapter.contents.content,{type:"body"})).toDOM().innerHTML %>\
    </div>\
<% }); %>\
')

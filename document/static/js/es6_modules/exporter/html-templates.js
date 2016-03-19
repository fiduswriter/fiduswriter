/** A template for HTML export of a document. */
export let htmlExportTemplate = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% var tempNode; %>\
        <% _.each(styleSheets, function(item){ %>\
            \t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />\
        <% }); %>\
        </head><body>\
        <% if (part && part !="") { %>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <%= contents %></body></html>')

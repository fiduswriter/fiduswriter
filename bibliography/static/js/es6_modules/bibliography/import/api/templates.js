export let searchApiTemplate = _.template('\
<div id="import-api-search" title="' + gettext("Link") + '">\
        <p>\
            <input id="bibimport-search-text" class="linktitle" type="text" value="" placeholder="' + gettext("Title, Author, DOI, etc.") + '"/>\
            <button id="bibimport-search-button" type="button">search</button>\
        </p>\
        <div id="bibimport-search-header"></div>\
        <div id="bibimport-search-result-sowiport" class="bibimport-search-result"></div>\
        <div id="bibimport-search-result-datacite" class="bibimport-search-result"></div>\
        <div id="bibimport-search-result-crossref" class="bibimport-search-result"></div>\
        <div id="bibimport-search-result-worldcat" class="bibimport-search-result"></div>\
    </div>\
')


export let searchApiResultSowiportTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <h3><a class="title api-import"   data-id="<%= item.id %>"><%= item.title %></a></h3>\
        <% if (item.doi) { %><p><b>DOI: <%= item.doi %></p><% } %>\
        <% if (item.description) { %><p><b>Description: </b><%= item.description %></p><% } %>\
        <button type="button" class="api-import" data-id="<%= item.id %>">Import</button>\
    </div>\
   <% })  %> \
')

export let searchApiResultDataciteTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <h3><a class="title api-import"   data-id="<%= item.id %>" ><%= item.attributes.title %></a></h3>\
        <% if (item.attributes.doi) { %><p><b>DOI: <%= item.attributes.doi %></p><% } %>\
        <% if (item.description) { %><p><b>Description: </b><%= item.description %></p><% } %>\
        <button type="button" class="api-import" data-id="<%= item.id %>" data-doi="<%=item.attributes.doi%>">Import</button>\
    </div>\
   <% })  %> \
')

export let searchApiResultCrossrefTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <h3><a class="title api-import"   data-doi="<%= item.doi %>" ><%= item.title %></a></h3>\
        <% if (item.doi) { %><p><b>DOI: <%= item.doi %></p><% } %>\
        <% if (item.description) { %><p><b>Description: </b><%= item.description %></p><% } %>\
        <button type="button" class="api-import"  data-doi="<%=item.doi%>">Import</button>\
    </div>\
   <% })  %> \
')


export let searchApiResultWorldCatTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <h3><a class="title api-import" data-id="<%= item.id %>"><%= _.values(item.title) %></a></h3>\
        <button type="button" class="api-import"   author=<%= _.values(item.author.name) %> data-isbn=<%= (_.values(_.first(item.dcIdentifier))) %>>Import</button>\
    </div>\
   <% })  %> \
')

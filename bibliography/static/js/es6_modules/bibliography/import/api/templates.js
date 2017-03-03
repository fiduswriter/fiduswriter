export let searchApiTemplate = _.template('\
<div id="bibimport-api-search" title="' + gettext("Search bibliography databases") + '">\
        <p>\
            <input id="bibimport-search-text" class="linktitle" type="text" value="" placeholder="' + gettext("Title, Author, DOI, etc.") + '"/>\
            <button id="bibimport-search-button" class="fw-button fw-dark" type="button">' + gettext("search") + '</button>\
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
        <button type="button" class="api-import fw-button fw-orange fw-small" data-id="<%= item.id %>">' + gettext('Import') + '</button>\
        <h3>\
            <%= item.title %>\
        </h3>\
        <% if (item.doi) { %><p><b>DOI:</b> <%= item.doi %></p><% } %>\
        <% if (item.description) { %><p><%= item.description %></p><% } %>\
    </div>\
   <% })  %> \
')

export let searchApiResultDataciteTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <button type="button" class="api-import fw-button fw-orange fw-small" data-id="<%= item.id %>" data-doi="<%=item.attributes.doi%>">' + gettext('Import') + '</button>\
        <h3>\
            <%= item.attributes.title %>\
        </h3>\
        <% if (item.attributes.doi) { %><p><b>DOI:</b> <%= item.attributes.doi %></p><% } %>\
        <% if (item.description) { %><p><%= item.description %></p><% } %>\
    </div>\
   <% })  %> \
')

export let searchApiResultCrossrefTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <button type="button" class="api-import fw-button fw-orange fw-small" data-doi="<%=item.doi%>">' + gettext('Import') + '</button>\
        <h3>\
            <%= item.fullCitation ? item.fullCitation : item.title + " " + item.year %>\
        </h3>\
        <% if (item.doi) { %><p><b>DOI:</b> <%= item.doi %></p><% } %>\
        <% if (item.description) { %><p><%= item.description %></p><% } %>\
    </div>\
   <% })  %> \
')


export let searchApiResultWorldCatTemplate = _.template('\
    <%  _.each(items, function(item) {%>\
    <div class="item">\
        <button type="button" class="api-import fw-button fw-orange fw-small" data-isbn=<%= (_.values(_.first(item.dcIdentifier))) %>>' + gettext('Import') + '</button>\
        <h3>\
            <%= _.values(item.title) %>\
        </h3>\
    </div>\
   <% })  %> \
')

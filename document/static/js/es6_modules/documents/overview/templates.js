export let documentsListTemplate = _.template('\
<% _.each(documentList,function(aDocument,key,list){%><%= documentsListItemTemplate({aDocument:aDocument, user:user, localizeDate:localizeDate})%><% }); %>')

/** A template for each document overview list item. */
export let documentsListItemTemplate = _.template('\
 <% var documentTitle; if (0===aDocument.title.length) {documentTitle="'+gettext('Untitled')+'";} else {documentTitle=aDocument.title;} %>\
 <tr id="Text_<%- aDocument.id %>" <% if (user.id == aDocument.owner.id) { %>class="owned-by-user"<% } %> >\
                <td width="20">\
                    <span class="fw-inline">\
                        <input type="checkbox" class="entry-select"\
                            data-id="<%- aDocument.id %>"\
                            data-owner="<%- aDocument.owner.id %>"/>\
                    </span>\
                </td>\
                <td width="220">\
                    <span class="fw-document-table-title fw-inline">\
                        <i class="icon-doc"></i>\
                        <a class="doc-title fw-link-text fw-searchable" href="/document/<%- aDocument.id %>/">\
                            <%- documentTitle %>\
                        </a>\
                    </span>\
                </td>\
                <td width="80" class="td-icon">\
                    <% if (aDocument.revisions.length > 0) { %>\
                        <span class="fw-inline revisions" data-id="<%- aDocument.id %>">\
                            <i class="icon-clock"></i>\
                        </span>\
                    <% } %>\
                </td>\
                <td width="80">\
                    <span class="fw-inline"><%- localizeDate(aDocument.added*1000, true) %></span>\
                </td>\
                <td width="80">\
                    <span class="fw-inline"><%- localizeDate(aDocument.updated*1000, true) %></span>\
                </td>\
                <td width="170">\
                    <span>\
                        <img class="fw-avatar" src="<%- aDocument.owner.avatar %>" />\
                    </span>\
                    <span class="fw-inline fw-searchable"><%- aDocument.owner.name %></span>\
                </td>\
                <td width="60"  class="td-icon">\
                    <span class="rights fw-inline" data-id="<%- aDocument.id %>">\
                        <i data-id="<%- aDocument.id %>" class="icon-access-right icon-access-<%- aDocument.rights %>"></i>\
                    </span>\
                </td>\
                 <td width="40"  class="td-icon">\
                    <span class="delete-document fw-inline fw-link-text" data-id="<%- aDocument.id %>" data-title="<%- aDocument.title %>">\
                        <% if (user.id === aDocument.owner.id) { %><i class="icon-trash"></i><% } %>\
                    </span>\
                </td>\
            </tr>\
')

/** A template for the Fidus Writer document import dialog */
export let importFidusTemplate = _.template('<div id="importfidus" title="' + gettext('Import a Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" accept=".fidus" required />\
            <button id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</button>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>')

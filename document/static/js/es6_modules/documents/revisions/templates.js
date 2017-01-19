/** A template for listing the templates of a certain document */
export let documentrevisionsTemplate = _.template('\
<div id="revisions-dialog" title="' + gettext('Saved revisions of') + ' <%= doc.title%>">\
<table class="fw-document-table" style="width:342px;">\
    <thead class="fw-document-table-header">\
        <th width="80">' + gettext('Time') + '</th>\
        <th width="300">' + gettext('Description') + '</th>\
        <th width="50">' + gettext('Recreate') + '</th>\
        <th width="50">' + gettext('Download') + '</th>\
        <% if (doc.is_owner) {%>\
            <th width="50">' + gettext('Delete') + '</th>\
        <% } %>\
    </thead>\
    <tbody class="fw-document-table-body fw-middle">\
        <%_.each(_.sortBy(doc.revisions, function(revision){return 0-revision.date;}), function(revision) { %>\
            <tr class="revision-<%- revision.pk%>" data-document="<%= doc.id %>">\
                <td width="80"><span class="fw-inline"><%- localizeDate(revision.date*1000) %></span></td>\
                <td width="300"><span class="fw-inline"><%- revision.note %></span></td>\
                <td width="50"><span class="fw-inline recreate-revision" data-id="<%- revision.pk%>"><i class="icon-download"></i></span></td>\
                <td width="50"><span class="fw-inline download-revision" data-id="<%- revision.pk%>" data-filename="<%- revision.file_name %>"><i class="icon-download"></i></span></td>\
                <% if (doc.is_owner) {%>\
                    <td width="50">\
                        <span class="fw-inline delete-revision" data-id="<%- revision.pk%>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                <% } %>\
            </tr>\
        <% }); %>\
    </tbody>\
</table>\
</div>\
')

export let documentrevisionsConfirmDeleteTemplate = _.template('\
<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '">\
    <p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
    gettext('Do you really want to delete the revision?') + '</p></div>')

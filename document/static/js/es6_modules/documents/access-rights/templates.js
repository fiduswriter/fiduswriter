/** The access rights dialogue template */
export let accessRightOverviewTemplate = _.template('\
    <div id="access-rights-dialog" title="<%- dialogHeader %>">\
        <div id="my-contacts" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My contacts") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="337">' + gettext("Contacts") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= contacts %></tbody>\
            </table>\
        </div>\
        <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
        <div id="share-member" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My collaborators") + '</h3>\
            <table class="fw-document-table tablesorter">\
                <thead class="fw-document-table-header"><tr>\
                        <th width="217">' + gettext("Collaborators") + '</th>\
                        <th width="50" align="center">' + gettext("Rights") + '</th>\
                        <th width="50" align="center">' + gettext("Delete") + '</th>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= collaborators %></tbody>\
            </table>\
        </div>\
    </div>')

/** The template for an individual row in the right hand side list of users (all contacts) of the access rights dialogue. */
export let accessRightTrTemplate = _.template('<% _.each(contacts, function(contact) { %>\
        <tr>\
            <td width="337" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                <span class="fw-inline"><%= contact.name %></span>\
            </td>\
        </tr>\
    <% }) %>')

/** The template for an individual row in the left hand side list of users (the collaborators of the current document) of the access rights dialogue. */
export let collaboratorsTemplate = _.template('<% _.each(collaborators, function(collaborator) { %>\
        <tr id="collaborator-<%- collaborator.user_id %>" data-id="<%- collaborator.user_id %>"\
        class="collaborator-tr <%- collaborator.rights %>" data-right="<%- collaborator.rights %>">\
            <td width="215">\
                <span><img class="fw-avatar" src="<%- collaborator.avatar %>" /></span>\
                <span class="fw-inline"><%= collaborator.user_name %></span>\
            </td>\
            <td width="50" align="center">\
                <div class="fw-inline edit-right-wrapper">\
                    <i class="icon-access-right"></i>\
                    <i class="icon-down-dir edit-right"></i>\
                    <div class="fw-pulldown fw-left">\
                        <ul>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="w">\
                                    <i class="icon-pencil" >' + gettext("Editor") + '</i>\
                                </span>\
                            </li>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="r">\
                                    <i class="icon-eye">' + gettext("Read only") + '</i>\
                                </span>\
                            </li>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="o">\
                                    <i class="icon-comment-only">' + gettext("Comment only") + '</i>\
                                </span>\
                            </li>\
                        </ul>\
                    </div>\
                </div>\
            </td>\
            <td width="50" align="center">\
                <span class="delete-collaborator fw-inline" data-right="d">\
                    <i class="icon-trash fw-link-text"></i>\
                </span>\
            </td>\
        </tr>\
    <% }) %>')

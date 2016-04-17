//template for the list of teammembers
export let teammemberTemplate = _.template('<% _.each(members, function(member) { %>\
    <tr id="user-<%= member.id %>">\
        <td width="30">\
            <span class="fw-inline"><input type="checkbox" class="entry-select" data-id="<%= member.id %>"/></span>\
        </td>\
        <td width="350">\
            <span><img class="fw-avatar" src="<%= member.avatar %>" /></span>\
            <span class="fw-inline"><%- member.name %></span>\
        </td>\
        <td width="350">\
            <span class="fw-inline"><%- member.email %></span>\
        </td>\
        <td width="50" align="center">\
            <span class="fw-link-text delete-single-member fw-inline" data-id="<%= member.id %>">\
                <i class="icon-trash"></i>\
            </span>\
        </td>\
    </tr><% }) %>')

//template for member adding dialog
export let addTeammemberTemplate = _.template('\
    <div id="add-new-member" title="<%- dialogHeader %>">\
        <table class="ui-dialog-content-table"><tbody><tr><td>\
            <input type="text" name="user_string" id="new-member-user-string" placeholder="' + gettext('E-mail address or username') + '" />\
        </td></tr></tbody></table>\
    </div>')

/** The template for an individual row in the left hand side list of users (the collaborators of the current document) of the access rights dialogue. */
let collaboratorsTemplate = _.template('<% _.each(collaborators, function(collaborator) { %>\
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

/** The template for an individual row in the right hand side list of users (all contacts) of the access rights dialogue. */
export let accessRightTrTemplate = _.template('<% _.each(contacts, function(contact) { %>\
        <tr>\
            <td width="337" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                <span class="fw-inline"><%= contact.name %></span>\
            </td>\
        </tr>\
    <% }) %>')

/** A template for the bibliography item edit dialog. */
export let bibDialog = _.template('\
    <div id="bib-dialog" title="<%- dialogHeader %>">\
        <div class="select-container">\
            <select id="select-bibtype" class="fw-button fw-white fw-large" required>\
                <% if (bib_type===false) { %>\
                    <option class="placeholder" selected disabled value="">' + gettext('Select source type') + '</option>\
                <% } %>\
                <% Object.keys(BibTypes).forEach(function(key) { %>\
                    <option value="<%- key %>" <%= key === bib_type ? "selected" : "" %>><%= BibTypeTitles[key] %></option>\
                <% }) %>\
            </select>\
            <div class="select-arrow icon-down-dir"></div>\
        </div>\
        <div id="bib-dialog-tabs">\
            <ul>\
                <li><a href="#req-fields-tab" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#opt-fields-tab" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#categories-tab" class="fw-button fw-large">' + gettext('Categories') + '</a></li>\
            </ul>\
            <div id="req-fields-tab">\
                <table class="fw-dialog-table"><tbody id="eo-fields"></tbody></table>\
                <table class="fw-dialog-table"><tbody id="req-fields"></tbody></table>\
            </div>\
            <div id="opt-fields-tab"><table class="fw-dialog-table"><tbody id="opt-fields"></tbody></table></div>\
            <div id="categories-tab"><table class="fw-dialog-table">\
                <tbody>\
                    <tr><th><h4 class="fw-tablerow-title">' + gettext('Categories') + '</h4></th><td id="categories-field"></td></tr>\
                </tbody>\
            </table></div>\
        </div>\
    </div>')

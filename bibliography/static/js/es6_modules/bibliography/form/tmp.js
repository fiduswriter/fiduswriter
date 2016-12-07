/** A template for the bibliography item edit dialog. */
export let bibDialog = _.template('\
    <div id="bib-dialog" title="<%- dialogHeader %>">\
        <div id="source-type-selection" class="fw-button fw-white fw-large">\
            <span id="selected-source-type-title"><%= sourceTitle %></span>\
            <span class="icon-down-dir"></span>\
            <div class="fw-pulldown fw-center">\
                <ul><% Object.keys(BibTypes).forEach(function(key) { %>\
                    <li>\
                        <span class="fw-pulldown-item" data-value="<%- key %>"><%= BibTypeTitles[key] %></span>\
                    </li>\
                <% }) %></ul>\
            </div>\
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
            <div id="categories-tab"><table class="fw-dialog-table"><tbody id="categories-field"></tbody></table></div>\
        </div>\
    </div>')

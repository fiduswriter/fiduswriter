/** A template for the bibliography item edit dialog. */
export let bibDialog = _.template('\
    <div id="bib-dialog" title="<%- dialogHeader %>">\
        <%= bibType %>\
        <div id="bib-dialog-tabs">\
            <ul>\
                <li><a href="#req-fields-tab" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#opt-fields-tab" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#extra-fields-tab" class="fw-button fw-large">' + gettext('Extras') + '</a></li>\
            </ul>\
            <div id="req-fields-tab">\
                <table class="fw-dialog-table"><tbody id="eo-fields"></tbody></table>\
                <table class="fw-dialog-table"><tbody id="req-fields"></tbody></table>\
            </div>\
            <div id="opt-fields-tab"><table class="fw-dialog-table"><tbody id="opt-fields"></tbody></table></div>\
            <div id="extra-fields-tab"><table class="fw-dialog-table"><tbody id="extra-fields"></tbody></table></div>\
        </div>\
    </div>')

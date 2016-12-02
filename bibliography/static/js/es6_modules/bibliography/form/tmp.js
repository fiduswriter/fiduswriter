/** A template for the bibliography item edit dialog. */
export let bibDialog = _.template('\
    <div id="bibDialog" title="<%- dialogHeader %>">\
        <%= bibType %>\
        <div id="bibDialogTabs">\
            <ul>\
                <li><a href="#reqFieldsTab" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#optFieldsTab" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#extraFieldsTab" class="fw-button fw-large">' + gettext('Extras') + '</a></li>\
            </ul>\
            <div id="reqFieldsTab">\
                <table class="fw-dialog-table"><tbody id="eoFields"></tbody></table>\
                <table class="fw-dialog-table"><tbody id="reqFields"></tbody></table>\
            </div>\
            <div id="optFieldsTab"><table class="fw-dialog-table"><tbody id="optFields"></tbody></table></div>\
            <div id="extraFieldsTab"><table class="fw-dialog-table"><tbody id="extraFields"></tbody></table></div>\
        </div>\
    </div>')

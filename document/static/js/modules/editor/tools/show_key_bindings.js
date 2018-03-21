import {showKeyBindingsTemplate} from "./show_key_bindings_templates"

/* This is an adaptation of question.mark for Fidus Writer http://fiduswriter.org
* originally by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
*/

export class ModToolsShowKeyBindings {
    constructor(mod) {
        mod.showKeyBindings = this
        this.mod = mod
    }

    show() {
        let buttons = [
            {
                text: gettext("Close"),
                class: "fw-button fw-orange",
                click: function () {jQuery(this).dialog("close")}
            }
        ]
        jQuery(showKeyBindingsTemplate()).dialog({
            autoOpen: true,
            height: 500,
            width: 800,
            modal: true,
            buttons
        })
    }
}

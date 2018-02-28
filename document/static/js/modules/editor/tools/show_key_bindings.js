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
        let diaButtons = {}
        diaButtons[gettext("Close")] = function () {
            jQuery(this).dialog("close")
        }
        jQuery(showKeyBindingsTemplate()).dialog({
            autoOpen: true,
            height: 500,
            width: 800,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            }
        })
    }
}

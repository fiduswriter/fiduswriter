import {showKeyBindingsTemplate} from "./show_key_bindings_templates"
import {Dialog} from "../../common"
/* This is an adaptation of question.mark for Fidus Writer http://fiduswriter.org
* originally by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
*/

export class ModToolsShowKeyBindings {
    constructor(mod) {
        mod.showKeyBindings = this
        this.mod = mod
    }

    show() {
        const dialog = new Dialog({
            title: gettext('Keyboard Shortcuts'),
            body: showKeyBindingsTemplate(),
            height: 500,
            width: 800,
            buttons: [{type: 'close'}]
        })
        dialog.open()
    }
}

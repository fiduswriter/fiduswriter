import {ModMenusToolbar} from "./toolbar"
import {ModMenusUpdateUI} from "./update-ui"

/* Bindings for menus. */

export class ModMenus {
    constructor(editor) {
        editor.mod.menus = this
        this.editor = editor
        //new ModMenusToolbar(this)
        //new ModMenusUpdateUI(this)
    }

}

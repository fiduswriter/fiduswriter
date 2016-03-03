import {ModMenusHeader} from "./header"
import {ModMenusToolbar} from "./toolbar"

/* Bindings for menus. */

export class ModMenus {
    constructor(editor) {
        editor.mod.menus = this
        this.editor = editor
        new ModMenusHeader(this)
        new ModMenusToolbar(this)
    }

}

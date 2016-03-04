import {ModMenusHeader} from "./header"
import {ModMenusToolbar} from "./toolbar"
import {ModMenusCitation} from "./citation"

/* Bindings for menus. */

export class ModMenus {
    constructor(editor) {
        editor.mod.menus = this
        this.editor = editor
        new ModMenusHeader(this)
        new ModMenusToolbar(this)
        new ModMenusCitation(this)
    }

}

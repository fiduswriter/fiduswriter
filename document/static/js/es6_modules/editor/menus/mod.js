import {ModMenusHeader} from "./header"
import {ModMenusToolbar} from "./toolbar"
import {ModMenusCitation} from "./citation"
import {ModMenusKeyBindings} from "./key-bindings"
import {ModMenusActions} from "./actions"

/* Bindings for menus. */

export class ModMenus {
    constructor(editor) {
        editor.mod.menus = this
        this.editor = editor
        new ModMenusHeader(this)
        new ModMenusToolbar(this)
        new ModMenusCitation(this)
        new ModMenusActions(this)
        new ModMenusKeyBindings(this)
    }

}

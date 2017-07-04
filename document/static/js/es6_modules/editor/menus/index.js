import {ModMenusHeader} from "./header"
import {ModMenusToolbar} from "./toolbar"
import {ModMenusActions} from "./actions"
import {ModMenusUpdateUI} from "./update-ui"

/* Bindings for menus. */

export class ModMenus {
    constructor(editor) {
        editor.mod.menus = this
        this.editor = editor
        //new ModMenusHeader(this)
        new ModMenusToolbar(this)
        new ModMenusActions(this)
        //new ModMenusUpdateUI(this)
    }

}

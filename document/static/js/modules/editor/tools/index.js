import {ModToolsWordCount} from "./word-count"
import {ModToolsPrint} from "./print"
import {ModToolsShowKeyBindings} from "./show-key-bindings"

export class ModTools {
    constructor(editor) {
        editor.mod.tools = this
        this.editor = editor
        new ModToolsWordCount(this)
        new ModToolsPrint(this)
        new ModToolsShowKeyBindings(this)
    }

}

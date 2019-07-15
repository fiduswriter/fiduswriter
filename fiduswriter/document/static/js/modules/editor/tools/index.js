import {ModToolsWordCount} from "./word_count"
import {ModToolsShowKeyBindings} from "./show_key_bindings"

export class ModTools {
    constructor(editor) {
        editor.mod.tools = this
        this.editor = editor
        new ModToolsWordCount(this)
        new ModToolsShowKeyBindings(this)
    }

}

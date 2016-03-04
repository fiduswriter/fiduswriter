import {ModToolsWordCount} from "./word-count"
import {ModToolsPrint} from "./print"

export class ModTools {
    constructor(editor) {
        editor.mod.tools = this
        this.editor = editor
        new ModToolsWordCount(this)
        new ModToolsPrint(this)
    }

}

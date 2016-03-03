import {ModToolsWordCount} from "./word-count"

export class ModTools {
    constructor(editor) {
        editor.mod.tools = this
        this.editor = editor
        new ModToolsWordCount(this)
    }

}

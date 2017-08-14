import {ModImageDB} from "./images"
import {ModBibliographyDB} from "./bibliography"

export class ModDB {
    constructor(editor) {
        editor.mod.db = this
        this.editor = editor
        new ModImageDB(this)
        new ModBibliographyDB(this)
    }
}

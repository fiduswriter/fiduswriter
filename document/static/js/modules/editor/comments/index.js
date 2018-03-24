import {ModCommentStore} from "./store"
import {ModCommentInteractions} from "./interactions"

export class ModComments {
    constructor(editor) {
        editor.mod.comments = this
        this.editor = editor
        new ModCommentStore(this)
        new ModCommentInteractions(this)
    }
}

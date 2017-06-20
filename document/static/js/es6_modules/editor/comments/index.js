import {ModCommentStore} from "./store"
import {ModCommentLayout} from "./layout"
import {ModCommentInteractions} from "./interactions"

export class ModComments {
    constructor(editor) {
        editor.mod.comments = this
        this.editor = editor
        new ModCommentStore(this)
        new ModCommentLayout(this)
        new ModCommentInteractions(this)
    }
}

import {ModCollabDocChanges} from "./doc-changes"

export class ModCollab {
    constructor(editor) {
        editor.mod.collab = this
        this.editor = editor
        new ModCollabDocChanges(this)
    }
}

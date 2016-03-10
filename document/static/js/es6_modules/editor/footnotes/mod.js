import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "../schema"
import "prosemirror/dist/collab"

import {ModFootnoteEditor} from "./editor"
import {ModFootnoteMarkers} from "./markers"

export class ModFootnotes {
    constructor(editor) {
        editor.mod.footnotes = this
        this.editor = editor
        this.footnotes = []
        this.init()
        new ModFootnoteEditor(this)
        new ModFootnoteMarkers(this)
    }

    init() {
        this.fnPm = new ProseMirror({
            place: document.getElementById('footnote-box-container'),
            schema: fidusFnSchema,
            collab: {
                version: 0
            } // Version number does not matter much, as we do not verify it between users.
        })
    }
}

import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "../schema"
import "prosemirror/dist/collab"

import {ModFootnoteEditor} from "./editor"
import {ModFootnoteMarkers} from "./markers"
import {ModFootnoteLayout} from "./layout"

export class ModFootnotes {
    constructor(editor) {
        editor.mod.footnotes = this
        this.editor = editor
        this.schema = fidusFnSchema
        this.footnotes = []
        this.init()
        this.bindEvents()
        new ModFootnoteEditor(this)
        new ModFootnoteMarkers(this)
        new ModFootnoteLayout(this)
    }

    init() {
        this.fnPm = new ProseMirror({
            place: document.getElementById('footnote-box-container'),
            schema: this.schema,
            collab: {
                version: 0
            } // Version number does not matter much, as we do not verify it between users.
        })
    }

    bindEvents() {
        let that = this
        // Set the current editor depending on where the focus currently is.
        this.fnPm.on("focus", function(){that.editor.currentPm = that.fnPm})
        this.editor.pm.on("focus", function(){that.editor.currentPm = that.editor.pm})
    }
}

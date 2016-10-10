import {ProseMirror} from "prosemirror/dist/edit/main"
import {fnSchema} from "../../schema/footnotes"
import {collabEditing} from "prosemirror/dist/collab"
import {elt} from "prosemirror/dist/util/dom"

import {ModFootnoteEditor} from "./editor"
import {ModFootnoteMarkers} from "./markers"
import {ModFootnoteLayout} from "./layout"

export class ModFootnotes {
    constructor(editor) {
        editor.mod.footnotes = this
        this.editor = editor
        this.schema = fnSchema
        this.footnotes = []
        this.init()
        this.bindEvents()
        new ModFootnoteEditor(this)
        new ModFootnoteMarkers(this)
        new ModFootnoteLayout(this)
    }

    init() {
        let that = this
        this.fnPm = new ProseMirror({
            place: document.getElementById('footnote-box-container'),
            schema: this.schema,
            doc: this.schema.nodeFromJSON({"type":"doc","content":[{"type": "footnote_end"}]}),
            plugins: [collabEditing.config({version: 0})] // Version doesn't matter, as we don't track it
        })
        // TODO: get rid of footnote_end once Pm doesn't have a bug that requires it.

        // add mod to give us simple access to internals removed in PM 0.8.0
        this.fnPm.mod = {}
        this.fnPm.mod.collab = collabEditing.get(this.fnPm)
        // Ignore setDoc
        this.fnPm.on.beforeSetDoc.remove(this.fnPm.mod.collab.onSetDoc)
        this.fnPm.mod.collab.onSetDoc = function (){}
        // Trigger reset on setDoc
    }

    bindEvents() {
        let that = this
        // Set the current editor depending on where the focus currently is.
        this.fnPm.on.focus.add(function(){
            that.editor.currentPm = that.fnPm
        })
        this.editor.pm.on.focus.add(function(){
            that.editor.currentPm = that.editor.pm
        })
    }
}

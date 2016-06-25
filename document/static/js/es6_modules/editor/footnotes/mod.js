import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "./schema"
import {collabEditing} from "prosemirror/dist/collab"
import {elt} from "prosemirror/dist/util/dom"

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
            plugins: [collabEditing.config({version: 0})] // Version doesn't matter, as we don't track it
        })
        this.fnPmCollab = collabEditing.get(this.fnPm)
        // TODO: get rid of stopped once Pm doesn't have a bug that requires it.
        //let stopper = elt('div')
        //stopper.appendChild(elt('hr'))

        //this.fnPm.setContent('<div><hr></div>', 'html')
        //this.fnPm.setOption("collab", {
        //    version: 0 // Version number does not matter much, as we do not verify it between users.
        //})
    }

    bindEvents() {
        let that = this
        // Set the current editor depending on where the focus currently is.
        this.fnPm.on.focus.add(function(){
            that.editor.currentPm = that.fnPm
            that.editor.currentPmCollab = that.fnPmCollab
        })
        this.editor.pm.on.focus.add(function(){
            that.editor.currentPm = that.editor.pm
            that.editor.currentPmCollab = that.editor.pmCollab
        })
    }
}

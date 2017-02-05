import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {fnSchema} from "../../schema/footnotes"
import {collabEditing} from "prosemirror-old/dist/collab"
import {elt} from "prosemirror-old/dist/util/dom"
import {buildKeymap} from "prosemirror-old/dist/example-setup"

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
        new ModFootnoteEditor(this)
        new ModFootnoteMarkers(this)
        new ModFootnoteLayout(this)
        this.bindEvents()
    }

    init() {
        this.fnPm = new ProseMirror({
            place: document.getElementById('footnote-box-container'),
            schema: this.schema,
            doc: this.schema.nodeFromJSON({"type":"doc","content":[{"type": "footnote_end"}]})//,
            //plugins: [collabEditing.config({version: 0})] // Version doesn't matter, as we don't track it
        })

        //this.fnPmCollab = collabEditing.get(this.fnPm)
        this.fnPm.addKeymap(buildKeymap(this.schema))

        // TODO: get rid of footnote_end once Pm doesn't have a bug that requires it.

    }

    bindEvents() {
        this.attachCollab()
        // Set the current editor depending on where the focus currently is.
        this.fnPm.on.focus.add(() => {
            this.editor.currentPm = this.fnPm
        })
        this.editor.pm.on.focus.add(() => {
            this.editor.currentPm = this.editor.pm
        })
    }

    attachCollab() {
        if (this.fnPmCollab) {
            // plugin already present
            return
        }
        // Attach collaboration module
        // Version doesn't matter, as we don't track it
        this.fnPmCollab = collabEditing.config({version: 0}).attach(this.fnPm)
        this.fnPmCollab.mustSend.add(() => {
            this.fnEditor.footnoteEdit()
        })
    }

    detachCollab() {
        if (this.fnPmCollab) {
            collabEditing.detach(this.fnPm)
            delete this.fnPmCollab
        }
    }
}

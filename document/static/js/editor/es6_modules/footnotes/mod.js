import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "../schema"
import "prosemirror/dist/collab"

import {ModFootnoteEditor} from "./editor"
import {ModFootnoteMarkers} from "./markers"

export class ModFootnotes {
  constructor(pm) {
    pm.mod.footnotes = this
    this.pm = pm
    this.init()
    this.footnotes = []
    new ModFootnoteEditor(this)
    new ModFootnoteMarkers(this)
  }

  init() {
      this.fnPm = new ProseMirror({
        place: document.getElementById('footnote-box-container'),
        schema: fidusFnSchema,
        collab: {version: 0} // Version numberdoes not matter much, as we do not verify it between users.
      })
  }
}

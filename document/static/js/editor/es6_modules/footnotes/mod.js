import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "../schema"
import "prosemirror/dist/collab"

import {ModFootnoteLayout} from "./layout"
import {ModFootnoteChanges} from "./changes"

export class ModFootnotes {
  constructor(pm) {
    pm.mod.footnotes = this
    this.pm = pm
    this.init()
    new ModFootnoteChanges(this)
    new ModFootnoteLayout(this)
  }

  init() {
      this.fnPm = new ProseMirror({
        place: document.getElementById('footnote-box-container'),
        schema: fidusFnSchema,
        collab: {version: 0} // Version numberdoes not matter much, as we do not verify it between users.
      })
  }
}

import {ProseMirror} from "prosemirror/dist/edit/main"
import {fidusFnSchema} from "../schema"

import {ModFootnoteLayout} from "./layout"

export class ModFootnotes {
  constructor(pm) {
    pm.mod.footnotes = this
    this.pm = pm
    this.init()
    new ModFootnoteLayout(this)
  }

  init() {
      this.fnPm = new ProseMirror({
        place: document.getElementById('footnote-box-container'),
        schema: fidusFnSchema
      })
  }
}

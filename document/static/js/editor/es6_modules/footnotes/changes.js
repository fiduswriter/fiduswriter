
import {Pos} from "prosemirror/dist/model"
import {fromHTML, toHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import {fidusFnSchema, Footnote} from "../schema"

/* Functions related to changes of footnotes */
export class ModFootnoteChanges {
    constructor(mod) {
        mod.changes = this
        this.mod = mod
        this.updating = false

        this.bindEvents()
    }

    bindEvents () {
      let that = this

      this.mod.fnPm.mod.collab.on("mustSend", function() {
          console.log('footnote update')
          let length = that.mod.fnPm.mod.collab.unconfirmedSteps.length
          let lastStep = that.mod.fnPm.mod.collab.unconfirmedSteps[length -1]
          if (lastStep.from && lastStep.from.path && lastStep.from.path.length > 0) {
              // We find the num,ber of the last footnote that was updated by
              // looking at the last step and seeing what path that change referred to.
              let updatedFootnote = lastStep.from.path[0]
              that.updateFootnote(updatedFootnote)
          } else {
              // TODO: Figure out if there are cases where this is really needed.
          }
      })

    }

    updateFootnote(index) {
        this.updating = true
        let footnoteContents = toHTML(this.mod.fnPm.doc.child(index))
        let footnote = this.mod.footnotes[index]
        let node = this.mod.pm.doc.nodeAfter(footnote.from)
        this.mod.pm.tr.setNodeType(footnote.from, node.type, {contents: footnoteContents}).apply()
        this.updating = false
    }

    applyDiffs(diffs) {
        this.mod.fnPm.mod.collab.receive(diffs.map(j => Step.fromJSON(fidusFnSchema, j)))
    }

}

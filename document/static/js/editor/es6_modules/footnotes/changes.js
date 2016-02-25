
import {Pos} from "prosemirror/dist/model"
import {fromHTML, toHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import {fidusFnSchema} from "../schema"

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
          console.log('update 2')
          let length = that.mod.fnPm.mod.collab.unconfirmedSteps.length
          let lastStep = that.mod.fnPm.mod.collab.unconfirmedSteps[length -1]
          if (lastStep.from && lastStep.from.path && lastStep.from.path.length > 0) {
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
        let replacement = footnote.node.type.create({
                contents: footnoteContents
            }, null, footnote.node.styles)
        let path = footnote.range.from.path, start = footnote.range.from.offset, end = footnote.range.to.offset

        this.mod.pm.tr.replaceWith(footnote.range.from, footnote.range.to, replacement).apply()
        footnote.node = replacement
        footnote.range = this.mod.pm.markRange(new Pos(path, start), new Pos(path, end))
        this.updating = false
    }

    applyDiffs(diffs) {
        console.log(diffs)
        this.mod.fnPm.mod.collab.receive(diffs.map(j => Step.fromJSON(fidusFnSchema, j)))
    }

}


import {Pos} from "prosemirror/dist/model"
import {fromHTML, toHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import {fidusFnSchema, Footnote} from "../schema"

/* Functions related to changes of footnotes */
export class ModFootnoteChanges {
    constructor(mod) {
        mod.changes = this
        this.mod = mod
        this.lastFootnotes = []
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

    getNodePos(rootNode, searchedNode) {
        let foundNode = false
        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode === searchedNode) {
                foundNode = {
                    from: new Pos(path, start),
                    to: new Pos(path, end)
                }
            }
        })

        return foundNode
    }

    updateFootnote(index) {
        this.updating = true
        let footnoteContents = toHTML(this.mod.fnPm.doc.child(index))
        let oldFootnote = this.lastFootnotes[index]
        console.log(Footnote)
        let replacement = oldFootnote.type.create({
                contents: footnoteContents
            }, null, oldFootnote.styles)
        let nodePos = this.getNodePos(this.mod.pm.doc, oldFootnote)
        this.lastFootnotes[index] = replacement
        this.mod.pm.tr.replaceWith(nodePos.from, nodePos.to, replacement).apply()
        this.updating = false
    }

    applyDiffs(diffs) {
        console.log(diffs)
        this.mod.fnPm.mod.collab.receive(diffs.map(j => Step.fromJSON(fidusFnSchema, j)))
    }

}

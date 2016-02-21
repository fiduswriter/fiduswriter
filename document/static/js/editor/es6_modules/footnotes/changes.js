
import {Pos} from "prosemirror/dist/model"
import {fromHTML, toHTML} from "prosemirror/dist/format"
import {Step} from "prosemirror/dist/transform"
import {fidusFnSchema} from "../schema"

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
              that.updateFootnotes()
          }
      })

    }

    getNodePos(rootNode, searchedNode) {//, searchedNumber) {
        //let hits = 0
        let foundNode = false
        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode === searchedNode) {
                //if (searchedNumber === hits) {
                    foundNode = {
                        from: new Pos(path, start),
                        to: new Pos(path, end)
                    }
                //} else {
                //    hits++
                //}
            }
        })

        return foundNode
    }

    updateFootnotes() {
        this.updating = true
        let currentFootnotesElement = this.mod.fnPm.getContent('dom')
        let footnotes = [].slice.call(currentFootnotesElement.querySelectorAll('.footnote-container'))
        footnotes.forEach((footnote, index) => {
            if (footnote.innerHTML != this.lastFootnotes[index].attrs.contents) {
                let oldFootnote = this.lastFootnotes[index]
                let replacement = oldFootnote.type.create({
                        contents: footnote.innerHTML
                    }, null, footnote.styles)
                    // The editor.doc may sometimes contain the same node several times.
                    // This happens after copying, for example. We therefore need to check
                    // how many times the same footnote node shows up before the current
                    // footnote.
                /*let previousInstances = 0
                for (let i = 0; i < index; i++) {
                    if (this.lastFootnotes[i] === this.lastFootnotes[index]) {
                        previousInstances++
                    }
                }*/
                let nodePos = this.getNodePos(this.mod.pm.doc, oldFootnote)//, previousInstances)
                this.lastFootnotes[index] = replacement
                this.mod.pm.tr.replaceWith(nodePos.from, nodePos.to, replacement).apply()
            }
        })
        this.updating = false
    }

    updateFootnote(index) {
        this.updating = true
        let footnoteContents = toHTML(this.mod.fnPm.doc.child(index))
        let oldFootnote = this.lastFootnotes[index]
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

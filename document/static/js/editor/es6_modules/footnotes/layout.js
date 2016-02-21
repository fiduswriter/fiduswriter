
import {Pos} from "prosemirror/dist/model"
import {fromHTML} from "prosemirror/dist/format"
import {fidusFnSchema} from "../schema"

/* Functions related to layouting of footnotes */
export class ModFootnoteLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.lastFootnotes = []
        this.bindEvents()
    }

    bindEvents () {
      let that = this
      this.mod.pm.on('setDoc', function(){that.renderFootnotes()})
//      this.mod.pm.on('change', function(){that.renderFootnotes()})
      /* 'Change' means this happens in all connected editors, transform would be
      only the one who made the change. 'change' is working, but not a good idea
      overall, because it means only one person can be editing the footnote at a
      time.*/

      /* TODO: Make multiple users be able to edit the footnotes simultaneously.*/

      this.mod.pm.on('transform', function(transform, object) {
        console.log('update 1')
        console.log('transform')
        console.log([transform,object])
        if (transform.steps.some(function(step) {
                return step.type === "replace"
            })) {
            console.log('rerendering footnotes')
            that.renderFootnotes()
        }
      })
      this.mod.fnPm.on('transform', function(transform, object) {
          console.log('update 2')
          that.updateFootnotes()
      })

    }
    findFootnotes(rootNode) {
        var footnotes = []

        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode.type.name === 'footnote') {
                footnotes.push(inlineNode)
            }
        })

        return footnotes
    }

    getNodePos(rootNode, searchedNode, searchedNumber) {
        let hits = 0
        let foundNode = false

        rootNode.inlineNodesBetween(null, null, function(inlineNode, path, start, end, parent) {
            if (inlineNode === searchedNode) {
                if (searchedNumber === hits) {
                    foundNode = {
                        from: new Pos(path, start),
                        to: new Pos(path, end)
                    }
                } else {
                    hits++
                }
            }
        })

        return foundNode
    }

    sameArrayContents(arrayOne, arrayTwo) {
        if (arrayOne.length != arrayTwo.length) {
            return false
        }
        return arrayOne.every(function(element, index) {
            return element === arrayTwo[index]
        })
    }

    renderFootnotes() {
        let currentFootnotes = this.findFootnotes(this.mod.pm.doc)
        if (this.sameArrayContents(currentFootnotes, this.lastFootnotes)) {
            return true
        }
        let footnotesHTML = ''
        console.log('redrawing footnotes')
        currentFootnotes.forEach(footnote => {
            footnotesHTML += "<div class='footnote-container'>" + footnote.attrs.contents + "</div>"
        })
        console.log(footnotesHTML)
        this.mod.fnPm.setContent(fromHTML(fidusFnSchema, footnotesHTML, {preserveWhitespace: true}))

        this.lastFootnotes = currentFootnotes
    }

    updateFootnotes() {
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
                let previousInstances = 0
                for (let i = 0; i < index; i++) {
                    if (this.lastFootnotes[i] === this.lastFootnotes[index]) {
                        previousInstances++
                    }
                }
                let nodePos = this.getNodePos(this.mod.pm.doc, oldFootnote, previousInstances)
                this.lastFootnotes[index] = replacement
                this.mod.pm.tr.replaceWith(nodePos.from, nodePos.to, replacement).apply()
            }
        })
    }

}

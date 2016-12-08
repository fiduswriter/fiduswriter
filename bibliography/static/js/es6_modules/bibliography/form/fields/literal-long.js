import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema} from "prosemirror-old/dist/model"
import Keymap from "browserkeymap"

export class LiteralLongFieldForm{
    constructor(dom, initialValue = []) {
        this.dom = dom
        this.initialValue = initialValue
    }

    init() {
        let that = this
        this.pm = new ProseMirror({
            place: this.dom,
            schema: longLitSchema
        })
        this.pm.addKeymap(buildKeymap(longLitSchema), 0)
        this.pm.addKeymap(new Keymap({
            'Enter': function(pm, apply) {
                  if (apply !== false) pm.tr.typeText("\n").applyAndScroll()
                  return true
            }
        }), 1)
        let pmDoc = longLitSchema.nodeFromJSON({
            type: 'doc',
            content:[{
                type: 'longliteral',
                content: this.initialValue
            }]
        })
        this.pm.setDoc(pmDoc)
    }

    get value() {
        let literalContents = this.pm.doc.firstChild.content.toJSON()
        return literalContents && literalContents.length ? literalContents : false
    }

    check() {
        return true
    }

}

class LongLiteral extends Block {
    get matchDOMTag() {
        return {"pre.long-literal": null}
    }
    toDOM(node) {
        return ["pre", {
            class: 'long-literal'
        }, 0]
    }
}

export const longLitSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "longliteral"},
    longliteral: {type: LongLiteral, content: "text<_>*"},
    text: {type: Text, group: "inline"},
  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark
  }
})

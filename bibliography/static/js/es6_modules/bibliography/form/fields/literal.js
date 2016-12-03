import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema} from "prosemirror-old/dist/model"

export class LiteralFieldForm{
    constructor(dom, initialValue) {
        this.initialValue = initialValue
        this.dom = dom
    }

    init() {
        this.pm = new ProseMirror({
            place: this.dom,
            schema: litSchema
        })
        this.pm.addKeymap(buildKeymap(litSchema))
        if (this.initialValue) {
            let pmDoc = litSchema.nodeFromJSON({
                type: 'doc',
                content:[{
                    type: 'literal',
                    content: this.initialValue
                }]
            })
            this.pm.setDoc(pmDoc)
        }
    }

    get value() {
        return this.pm.doc.firstChild.content.toJSON()
    }
}

class Literal extends Block {
    get matchDOMTag() {
        return {"div.literal": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'literal'
        }, 0]
    }
}

export const litSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "literal"},
    literal: {type: Literal, content: "text<_>*"},
    text: {type: Text, group: "inline"},
  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark
  }
})

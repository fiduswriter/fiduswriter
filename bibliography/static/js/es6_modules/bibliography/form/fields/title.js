import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema, MarkType} from "prosemirror-old/dist/model"

export class TitleFieldForm{
    constructor(dom, initialValue) {
        this.initialValue = initialValue
        this.dom = dom
    }

    init() {
        this.pm = new ProseMirror({
            place: this.dom,
            schema: titleSchema
        })
        this.pm.addKeymap(buildKeymap(titleSchema))
        if (this.initialValue) {
            let pmDoc = titleSchema.nodeFromJSON({
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
        let titleContents = this.pm.doc.firstChild.content.toJSON()
        return titleContents ? titleContents : []
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

class CaseProtectMark extends MarkType { // Protects against case changes
    get matchDOMTag() {
        return {"span.nocase": null}
    }
    toDOM(node) {
        return ['span', {class: 'nocase'}]
    }
}

export const titleSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "literal"},
    literal: {type: Literal, content: "text<_>*"},
    text: {type: Text, group: "inline"},
  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    nocase: CaseProtectMark
  }
})

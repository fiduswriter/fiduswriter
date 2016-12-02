import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Schema} from "prosemirror-old/dist/model"
export class LitFieldForm{
    constructor(fieldName, initialValue, dom) {
        this.fieldName = fieldName
        this.initialValue = initialValue
        this.dom = dom
    }

    init() {
        this.pm = new ProseMirror({
            place: this.dom,
            schema: litSchema
        })
        let km = buildKeymap(litSchema)
        console.log(km)
        this.pm.addKeymap(km)
        if (this.initialValue) {
            let pmDoc = litSchema.nodeFromJSON({type:'doc',content:this.initialValue})
            this.pm.setDoc(pmDoc)
        }
    }

    get value() {
        return this.pm.doc.content.toJSON()
    }
}

export const litSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "text*"},
    text: {type: Text, group: "inline"},
  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark
  }
})

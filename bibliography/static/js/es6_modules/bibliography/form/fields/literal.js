import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema} from "prosemirror-old/dist/model"

export class LiteralFieldForm{
    constructor(dom, initialValue = [], placeHolder = false) {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
        this.placeHolderSet = false
    }

    init() {
        let that = this
        this.pm = new ProseMirror({
            place: this.dom,
            schema: litSchema
        })
        this.pm.addKeymap(buildKeymap(litSchema))
        let pmDoc = litSchema.nodeFromJSON({
            type: 'doc',
            content:[{
                type: 'literal',
                content: this.initialValue
            }]
        })
        this.pm.setDoc(pmDoc)
        if (this.placeHolder) {
            this.renderPlaceholder()
            this.pm.on.change.add(function(){that.renderPlaceholder()})
            this.pm.on.blur.add(function(){that.renderPlaceholder(false)})
            this.pm.on.focus.add(function(){that.renderPlaceholder(true)})
        }
    }

    get value() {
        let literalContents = this.pm.doc.firstChild.content.toJSON()
        return literalContents && literalContents.length ? literalContents : false
    }

    check() {
        return true
    }

    renderPlaceholder(hasFocus = this.pm.hasFocus()) {
        let value = this.value
        if (value === false && !this.placeHolderSet && !hasFocus) {
            this.dom.querySelector('div.literal').setAttribute('data-placeholder', this.placeHolder)
            this.placeHolderSet = true
        } else if ((this.placeHolderSet && hasFocus) || value !== false) {
            this.dom.querySelector('div.literal').removeAttribute('data-placeholder')
            this.placeHolderSet = false
        }
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

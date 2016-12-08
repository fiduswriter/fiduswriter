import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema, MarkType} from "prosemirror-old/dist/model"
import {commands} from "prosemirror-old/dist/edit/commands"

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
        this.pm.on.blur.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
        })
        this.pm.on.focus.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').removeClass('disabled')
            jQuery('.ui-dialog-buttonset .fw-nocase').addClass('disabled')
        })
        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps']
        supportedMarks.forEach(mark =>{
            this.linkMarkButton(mark)
        })
    }

    linkMarkButton(mark) {
        jQuery(`.ui-dialog-buttonset .fw-${mark}`).on("mousedown", (event)=>{
            event.preventDefault()
            event.stopPropagation()
            if (!this.pm.hasFocus()) {
                return
            }
            let sMark = this.pm.schema.marks[mark]
            let command = commands.toggleMark(sMark)
            command(this.pm, true)
        })
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

class SupMark extends MarkType {
  get matchDOMTag() { return {"sup": null} }
  toDOM() { return ["sup"] }
}

class SubMark extends MarkType {
  get matchDOMTag() { return {"sub": null} }
  toDOM() { return ["sub"] }
}

class SmallCapsMark extends MarkType {
  get matchDOMTag() { return {"span.smallcaps": null} }
  toDOM() { return ["span",{class:"smallcaps"}] }
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
    sup: SupMark,
    sub: SubMark,
    smallcaps: SmallCapsMark
  }
})

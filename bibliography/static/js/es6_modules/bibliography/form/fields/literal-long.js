import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema, MarkType, Inline, Attribute} from "prosemirror-old/dist/model"
import {commands} from "prosemirror-old/dist/edit/commands"
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

//Currently unsupported

class UrlMark extends MarkType {
    get matchDOMTag() { return {"span.url": null} }
    toDOM() { return ["span",{class:"url"}] }
}

class EnquoteMark extends MarkType {
    get matchDOMTag() { return {"span.enquote": null} }
    toDOM() { return ["span",{class:"enquote"}] }
}

class Variable extends Inline {
    get attrs() {
        return {
            variable: new Attribute({default: ""}),
        }
    }
    get matchDOMTag() {
        return {"span[data-variable]": dom => ({
            variable: dom.getAttribute("data-variable"),
        })}
    }
    toDOM(node) { return ["span", {'data-variable':node.attrs.variable}, node.attrs.variable] }
}

export const longLitSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "longliteral"},
    longliteral: {type: LongLiteral, content: "inline<_>*"},
    text: {type: Text, group: "inline"},
    variable: {type: Variable, group: "inline"}
  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    sup: SupMark,
    sub: SubMark,
    smallcaps: SmallCapsMark,
    url: UrlMark,
    enquote: EnquoteMark
  }
})

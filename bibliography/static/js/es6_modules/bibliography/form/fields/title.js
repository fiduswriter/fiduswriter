import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Doc, Text, EmMark, LinkMark, StrongMark} from "prosemirror-old/dist/schema-basic"
import {buildKeymap} from "prosemirror-old/dist/example-setup"
import {Block, Schema, MarkType, Inline, Attribute} from "prosemirror-old/dist/model"
import {commands} from "prosemirror-old/dist/edit/commands"

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
        this.pm.on.blur.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').addClass('disabled')
        })
        this.pm.on.focus.add(function(){
            jQuery('.ui-dialog-buttonset .fw-edit').removeClass('disabled')
        })
        let supportedMarks = ['em', 'strong', 'sub', 'sup', 'smallcaps', 'nocase']
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
        let titleContents = this.pm.doc.firstChild.content.toJSON()
        return titleContents && titleContents.length ? titleContents : false
    }

    check() {
        return true
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

class NoCaseMark extends MarkType {
    get matchDOMTag() { return {"span.nocase": null} }
    toDOM() { return ["span",{class:"nocase"}] }
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

export const titleSchema = new Schema({
    nodes: {
        doc: {type: Doc, content: "literal"},
        literal: {type: Literal, content: "inline<_>*"},
        text: {type: Text, group: "inline"},
        variable: {type: Variable, group: "inline"}
    },
    marks: {
        em: EmMark,
        strong: StrongMark,
        sup: SupMark,
        sub: SubMark,
        smallcaps: SmallCapsMark,
        nocase: NoCaseMark,
        url: UrlMark,
        enquote: EnquoteMark
    }
})

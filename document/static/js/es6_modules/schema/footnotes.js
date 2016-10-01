import {Doc, BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror/dist/schema-basic"

import {Schema, Block, Inline, Text, Attribute, MarkType} from "prosemirror/dist/model"

import {Figure, Citation, Equation} from "./document"

class FootnoteContainer extends Block {
    get matchDOMTag() {
        return {"div.footnote-container": null}
    }
    toDOM(node) {
        return ['div',{class: 'footnote-container'}, 0]
    }
}


export const fidusFnSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "part+"},

    footnote_end: {type: HorizontalRule, group: "part"},
    footnotecontainer: {type: FootnoteContainer, content: "block+", group: "part"},

    paragraph: {type: Paragraph, content: "inline<_>*", group: "block"},
    heading: {type: Heading, content: "inline<_>*", group: "block"},
    code_block: {type: CodeBlock, content: "text*", group: "block"},

    blockquote: {type: BlockQuote, content: "block+", group: "block"},
    ordered_list: {type: OrderedList, content: "list_item+", group: "block"},
    bullet_list: {type: BulletList, content: "list_item+", group: "block"},
    list_item: {type: ListItem, content: "block+", group: "block"},
    horizontal_rule: {type: HorizontalRule, group: "block"},
    figure: {type: Figure, group: "block"},

    text: {type: Text, group: "inline"},
    hard_break: {type: HardBreak, group: "inline"},
    citation: {type: Citation, group: "inline"},
    equation: {type: Equation, group: "inline"}
  },

  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark
  }
})

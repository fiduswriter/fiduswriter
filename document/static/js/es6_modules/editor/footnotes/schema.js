import {Schema, Block, Text, Doc, BlockQuote, OrderedList, BulletList, ListItem,
        HorizontalRule, Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark,
        EmMark, StrongMark, LinkMark} from "prosemirror/dist/model"

import {Figure, Citation, Equation} from "../schema"

class FootnoteContainer extends Block {
}

FootnoteContainer.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (!dom.classList.contains('footnote-container')) return false
        state.wrapIn(dom, this)
    }
})

FootnoteContainer.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        class: 'footnote-container'
    })

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

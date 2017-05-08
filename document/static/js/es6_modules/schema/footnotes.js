import {Doc, BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror-old/dist/schema-basic"
import {Table, TableRow, TableCell} from "prosemirror-old/dist/schema-table"

import {Schema, Block, Inline, Text, Attribute, MarkType} from "prosemirror-old/dist/model"

import {Figure, Citation, Equation, Heading} from "./common"


class FootnoteContainer extends Block {
    get matchDOMTag() {
        return {"div.footnote-container": null}
    }
    toDOM(node) {
        return ['div',{class: 'footnote-container'}, 0]
    }
}


export const fnSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "part+"},

    footnote_end: {type: HorizontalRule, group: "part"},
    footnotecontainer: {type: FootnoteContainer, content: "(block|table_block)+", group: "part"},

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
    equation: {type: Equation, group: "inline"},

    table: {type: Table, content: "table_row[columns=.columns]+", group:  "table_block"},
    table_row: {type: TableRow, content: "table_cell{.columns}"},
    table_cell: {type: TableCell, content: "block+"}
  },

  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark
  }
})

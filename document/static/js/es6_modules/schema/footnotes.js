import {from} from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {tableNodes} from "prosemirror-tables"

import {figure, citation, equation, heading, anchor} from "./common"

let footnotecontainer = {
    group: "part",
    content: "(block|table_block)* (paragraph | heading | blockquote | ordered_list | bullet_list)",
    parseDOM: [{tag: "div.footnote-container"}],
    toDOM(node) {
        return ['div',{class: 'footnote-container'}, 0]
    }
}

let doc = {
    content: "part*"
}

let spec = {
  nodes: from({
    doc,
    footnotecontainer,

    paragraph: nodes.paragraph,
    heading,
    blockquote: nodes.blockquote,
    horizontal_rule: nodes.horizontal_rule,
    figure,
    text: nodes.text,
    hard_break: nodes.hard_break,
    citation,
    equation
}),

  marks: from({
      em: marks.em,
      strong: marks.strong,
      link: marks.link,
      code: marks.code,
      anchor
  })
}

spec.nodes = addListNodes(spec.nodes, "block+", "block")

spec.nodes = spec.nodes.append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

export const fnSchema = new Schema(spec)

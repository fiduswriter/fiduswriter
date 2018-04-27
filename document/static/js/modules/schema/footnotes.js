import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {tableNodes} from "prosemirror-tables"

import {figure, citation, equation, heading, anchor, paragraph, blockquote, horizontal_rule, ordered_list, bullet_list, list_item, deletion, insertion} from "./common"

let footnotecontainer = {
    group: "part",
    selectable: false,
    content: "(block|table_block)+",
    parseDOM: [{tag: "div.footnote-container"}],
    toDOM(node) {
        return ['div',{class: 'footnote-container'}, 0]
    }
}

let doc = {
    content: "part*",
    selectable: false
}

let spec = {
  nodes: OrderedMap.from({
    doc,
    footnotecontainer,
    paragraph,
    heading,
    blockquote,
    horizontal_rule,
    figure,
    text: nodes.text,
    hard_break: nodes.hard_break,
    citation,
    equation,
    ordered_list,
    bullet_list,
    list_item
  }),
  marks: OrderedMap.from({
      em: marks.em,
      strong: marks.strong,
      link: marks.link,
      code: marks.code,
      anchor,
      deletion,
      insertion
  })
}

spec.nodes = spec.nodes.append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

spec.nodes = spec.nodes.update(
    "table",
    Object.assign(
        {},
        spec.nodes.get("table"),
        {
            attrs: {
                track: {default: []}
            },
            parseDOM: [{tag: "table", getAttrs(dom) {
                return {
                    track: dom.dataset.track ? JSON.parse(dom.dataset.track) : []
                }
            }}],
            toDOM(node) {
                let attrs = {}
                if (node.attrs.track.length) {
                    attrs['data-track'] = JSON.stringify(node.attrs.track)
                }
                return ["table", attrs, ["tbody", 0]]
            }
        }
    )
)

export const fnSchema = new Schema(spec)

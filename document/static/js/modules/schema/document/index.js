import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {tableNodes} from "prosemirror-tables"
import {nodes, marks} from "prosemirror-schema-basic"
import {
    figure,
    citation,
    equation,
    heading1,
    heading2,
    heading3,
    heading4,
    heading5,
    heading6,
    anchor,
    paragraph,
    blockquote,
    horizontal_rule,
    ordered_list,
    bullet_list,
    list_item,
    deletion,
    insertion,
    format_change,
    parseTracks,
    comment,
    annotation_tag
} from "../common"
import {
    contributor,
    tag,
    code_block,
    footnote
} from "./content"
import {
    doc,
    title,
    article,
    richtext_part,
    heading_part,
    contributors_part,
    tags_part,
    table_part
} from "./structure"


let specNodes = OrderedMap.from({
    doc,
    article,
    richtext_part,
    heading_part,
    contributors_part,
    tags_part,
    table_part,
    title,
    contributor,
    tag,
    paragraph,
    blockquote,
    horizontal_rule,
    figure,
    heading1,
    heading2,
    heading3,
    heading4,
    heading5,
    heading6,
    code_block,
    text: nodes.text,
    hard_break: nodes.hard_break,
    citation,
    equation,
    footnote,
    ordered_list,
    bullet_list,
    list_item
}).append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

specNodes = specNodes.update(
    "table_cell",
    Object.assign({marks: "annotation"}, specNodes.get("table_cell"))
).update(
    "table",
    Object.assign(
        {},
        specNodes.get("table"),
        {
            attrs: {
                track: {default: []}
            },
            parseDOM: [{tag: "table", getAttrs(dom) {
                return {
                    track: parseTracks(dom.dataset.track)
                }
            }}],
            toDOM(node) {
                const attrs = {}
                if (node.attrs.track.length) {
                    attrs['data-track'] = JSON.stringify(node.attrs.track)
                }
                return ["table", attrs, ["tbody", 0]]
            }
        }
    )
)

const spec = {
    nodes: specNodes,
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link: marks.link,
        code: marks.code,
        comment,
        annotation_tag,
        anchor,
        deletion,
        insertion,
        format_change
    })
}

export const docSchema = new Schema(spec)

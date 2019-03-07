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
    underline,
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
    table_part,
    table_of_contents,
    separator_part
} from "./structure"


let specNodes = OrderedMap.from({
    doc,
    article,
    richtext_part,
    heading_part,
    contributors_part,
    tags_part,
    table_part,
    table_of_contents,
    separator_part,
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
    tableGroup: "block",
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
                track: {default: []},
                width: {default: '100'},
                aligned: {default: 'center'},
                layout: {default: 'fixed'}
            },
            parseDOM: [{tag: "table", getAttrs(dom) {
                const track = parseTracks(dom.dataset.track),
                    width = dom.dataset.width,
                    aligned = width === '100' ? 'center' : dom.dataset.aligned,
                    layout = dom.dataset.layout
                return {
                    track,
                    width,
                    aligned,
                    layout
                }
            }}],
            toDOM(node) {
                const attrs = {}
                if (node.attrs.track.length) {
                    attrs['data-track'] = JSON.stringify(node.attrs.track)
                }
                attrs['data-width'] = node.attrs.width
                attrs['data-aligned'] = node.attrs.aligned
                attrs['data-layout'] = node.attrs.layout
                attrs['class'] = `table-${node.attrs.width} table-${node.attrs.aligned} table-${node.attrs.layout}`
                return ["table", attrs, ["tbody", 0]]
            }
        }
    )
).update('table_row', {
    content: "(table_cell | table_header)+",
    tableRole: "row",
    parseDOM: [{tag: "tr"}],
    toDOM() { return ["tr", 0] }
})

const spec = {
    nodes: specNodes,
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link: marks.link,
        code: marks.code,
        underline,
        comment,
        annotation_tag,
        anchor,
        deletion,
        insertion,
        format_change
    })
}

export const docSchema = new Schema(spec)

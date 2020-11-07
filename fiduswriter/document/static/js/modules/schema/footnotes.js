import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {tableNodes} from "prosemirror-tables"
import {
    figure,
    image,
    figure_equation,
    figure_caption,
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
    comment,
    annotation_tag,
    cross_reference,
    link
} from "./common"

const footnotecontainer = {
    group: "part",
    selectable: false,
    content: "(block|table_block)+",
    marks: "annotation",
    parseDOM: [{tag: "div.footnote-container"}],
    toDOM(_node) {
        return ['div', {class: 'footnote-container'}, 0]
    }
}

const doc = {
    content: "part*",
    selectable: false
}

const spec = {
    nodes: OrderedMap.from({
        doc,
        footnotecontainer,
        paragraph,
        heading1,
        heading2,
        heading3,
        heading4,
        heading5,
        heading6,
        blockquote,
        horizontal_rule,
        figure,
        image,
        figure_equation,
        figure_caption,
        text: nodes.text,
        hard_break: nodes.hard_break,
        citation,
        equation,
        cross_reference,
        ordered_list,
        bullet_list,
        list_item
    }),
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link,
        underline,
        anchor,
        comment,
        annotation_tag,
        deletion,
        insertion,
        format_change
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
                const attrs = {}
                if (node.attrs.track.length) {
                    attrs['data-track'] = JSON.stringify(node.attrs.track)
                }
                return ["table", attrs, ["tbody", 0]]
            }
        }
    )
)

export const fnSchema = new Schema(spec)

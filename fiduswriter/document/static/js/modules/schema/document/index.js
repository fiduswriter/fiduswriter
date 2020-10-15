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
    annotation_tag,
    cross_reference,
    link
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
import {
    captionSchema,
    captionSerializer
} from "../captions"


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
    cross_reference,
    footnote,
    ordered_list,
    bullet_list,
    list_item
}).append(tableNodes({
    tableGroup: "block",
    cellContent: "block+"
}))

export function randomTableId() {
    return 'T' + Math.round(Math.random() * 10000000) + 1
}

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
                id: {default: false},
                track: {default: []},
                width: {default: '100'},
                aligned: {default: 'center'},
                layout: {default: 'fixed'},
                category: {default: "none"},
                caption: {default: []},
            },
            parseDOM: [{tag: "table", getAttrs(dom) {
                const track = parseTracks(dom.dataset.track),
                    width = dom.dataset.width,
                    aligned = width === '100' ? 'center' : dom.dataset.aligned,
                    layout = dom.dataset.layout,
                    id = dom.id || dom.dataset.id
                return {
                    track,
                    width,
                    aligned,
                    layout,
                    id,
                    category: dom.dataset.category,
                    caption: dom.dataset.caption
                }
            }}],
            toDOM(node) {
                const dom = document.createElement('table')
                if (node.attrs.track.length) {
                    dom.dataset.track = JSON.stringify(node.attrs.track)
                }
                dom.id = node.attrs.id
                dom.dataset.width = node.attrs.width
                dom.dataset.aligned = node.attrs.aligned
                dom.dataset.layout = node.attrs.layout
                dom.class = `table-${node.attrs.width} table-${node.attrs.aligned} table-${node.attrs.layout}`
                dom.dataset.category = node.attrs.category
                dom.dataset.caption = node.attrs.caption
                if (node.attrs.caption.length || node.attrs.category !== 'none') {
                    const captionNode = document.createElement("caption")
                    if (node.attrs.category !== 'none') {
                        const tableCatNode = document.createElement('span')
                        tableCatNode.classList.add(`cat-${node.attrs.category}`)
                        tableCatNode.setAttribute('data-category', node.attrs.category)
                        captionNode.appendChild(tableCatNode)
                    }
                    if (node.attrs.caption.length) {
                        const captionTextNode = captionSerializer.serializeNode(captionSchema.nodeFromJSON({type: 'caption', content: node.attrs.caption}))
                        captionNode.appendChild(captionTextNode)
                    }
                    dom.appendChild(captionNode)
                }
                const contentDOM = document.createElement('tbody')
                dom.appendChild(contentDOM)
                return {dom, contentDOM}
            }
        }
    )
).update('table_row', {
    content: "(table_cell | table_header)+",
    tableRole: "row",
    parseDOM: [{tag: "tr"}],
    toDOM() {
        return ["tr", 0]
    }
})

const spec = {
    nodes: specNodes,
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link,
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

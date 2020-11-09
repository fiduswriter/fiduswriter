import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
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
    link,
    table,
    table_caption,
    table_body,
    table_row,
    table_cell,
    table_header
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

const specNodes = OrderedMap.from({
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
    image,
    figure_equation,
    figure_caption,
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
    list_item,
    table,
    table_caption,
    table_body,
    table_row,
    table_cell,
    table_header
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

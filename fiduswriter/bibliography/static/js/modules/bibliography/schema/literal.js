import {
    url,
    enquote,
    literal,
    smallcaps,
    sub,
    sup,
    text,
    variable
} from "@fiduswriter/document/bibliography/common"
import {Schema} from "prosemirror-model"
import {marks} from "prosemirror-schema-basic"

const doc = {
    content: "literal"
}

export const litSchema = new Schema({
    nodes: {
        doc,
        literal,
        text,
        variable
    },
    marks: {
        em: marks.em,
        enquote,
        smallcaps,
        strong: marks.strong,
        sup,
        sub,
        url
    }
})

import {enquote, literal, sup, sub, smallcaps, url, variable, text} from "./common"
import {marks} from "prosemirror-schema-basic"
import {Schema} from "prosemirror-model"

const doc = {
    content: 'literal'
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

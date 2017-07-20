import {enquote, sup, sub, smallcaps, url, text, variable} from "./common"
import {marks} from "prosemirror-schema-basic"
import {Schema} from "prosemirror-model"

let longliteral = {
    content: 'inline<_>*',
    code: true,
    defining: true,
    parseDOM: [{tag: 'pre.long-literal'}],
    toDOM(node) {
        return ["pre", {
            class: 'long-literal'
        }, 0]
    }
}

let doc = {
    content: 'longliteral'
}

export const longLitSchema = new Schema({
    nodes: {
        doc,
        longliteral,
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

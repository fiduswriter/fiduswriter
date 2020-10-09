import {DOMSerializer, Schema} from "prosemirror-model"
import {nodes} from "prosemirror-schema-basic"

import {equation} from "./common/equation"

const doc = {
    content: "caption",
    selectable: false
}

const caption = {
    content: "inline*",
    parseDOM: [{tag: 'span.caption'}],
    toDOM() {
        return ["span", {
            class: 'caption'
        }, 0]
    }
}

const spec = {
    nodes: {
        doc,
        caption,
        text: nodes.text,
        equation
    },
    marks: {}
}

export const captionSchema = new Schema(spec)

export const captionSerializer = DOMSerializer.fromSchema(captionSchema)

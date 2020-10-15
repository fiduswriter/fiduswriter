import {DOMSerializer, Schema} from "prosemirror-model"
import {nodes} from "prosemirror-schema-basic"

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
        text: nodes.text
    },
    marks: {}
}

export const captionSchema = new Schema(spec)

export const captionSerializer = DOMSerializer.fromSchema(captionSchema)

import {marks, nodes} from "prosemirror-schema-basic"
import {Schema, DOMSerializer} from "prosemirror-model"

let doc = {
    content: 'block+',
    toDOM(node) {
        return ["div", 0]
    }
}

export const commentSchema = new Schema({
    nodes: {
        doc,
        paragraph: nodes.paragraph,
        text: nodes.text
    },
    marks: {}
})

export let getCommentHTML = content => {
    let pmNode = commentSchema.nodeFromJSON({type: 'doc', content}),
        serializer = DOMSerializer.fromSchema(commentSchema)
    return serializer.serializeNode(pmNode).innerHTML
}

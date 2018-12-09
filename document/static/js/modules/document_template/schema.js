import {schema} from "prosemirror-schema-basic"
import {Schema, DOMSerializer} from "prosemirror-model"

import {docSchema} from "../schema/document"

const doc = {
    content: 'block+',
    toDOM(node) {
        return ["div", 0]
    }
}

export const helpSchema = new Schema({
    nodes: schema.spec.nodes.remove('code_block').remove('image').remove('heading').remove('horizontal_rule').update('doc', doc),
    marks: schema.spec.marks.remove('code')
})

const helpSerializer = DOMSerializer.fromSchema(helpSchema)

export const serializeHelp = content => {
    const doc = {type: 'doc', content},
        pmNode = helpSchema.nodeFromJSON(doc),
        dom = helpSerializer.serializeNode(pmNode)
    return dom.innerHTML
}


export const richtextPartSchema = new Schema({
    nodes: docSchema.spec.nodes.update('doc', docSchema.spec.nodes.get('richtext_part')),
    marks: docSchema.spec.marks
})

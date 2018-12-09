import {schema} from "prosemirror-schema-basic"
import {Schema, DOMSerializer} from "prosemirror-model"
import {blockTypeItem} from "prosemirror-menu"
import {buildMenuItems} from "prosemirror-example-setup"

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

export const richtextMenuContent = buildMenuItems(richtextPartSchema).fullMenu
const typeMenu = richtextMenuContent[1][1].content

for (let i = 1; i <= 6; i++) {
    let type = richtextPartSchema.nodes[`heading${i}`]
    typeMenu.push(blockTypeItem(type, {
        title: "Change to heading " + i,
        label: "Heading level " + i
    }))
}

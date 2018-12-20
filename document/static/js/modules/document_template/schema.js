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

export const helpMenuContent = buildMenuItems(helpSchema).fullMenu
helpMenuContent.splice(1, 1) // full menu minus drop downs

const helpSerializer = DOMSerializer.fromSchema(helpSchema)

export const serializeHelp = content => {
    const doc = {type: 'doc', content},
        pmNode = helpSchema.nodeFromJSON(doc),
        dom = helpSerializer.serializeNode(pmNode)
    return dom.innerHTML
}

export const richtextPartSchema = new Schema({
    nodes: docSchema.spec.nodes.update('doc', {content: 'richtext_part'}),
    marks: docSchema.spec.marks
})

export const richtextMenuContent = buildMenuItems(richtextPartSchema).fullMenu
for (let i = 1; i <= 6; i++) {
    let type = richtextPartSchema.nodes[`heading${i}`]
    richtextMenuContent[1][1].content.push(blockTypeItem(type, {
        title: "Change to heading " + i,
        label: "Heading level " + i
    }))
}

export const headingPartSchema = new Schema({
    nodes: docSchema.spec.nodes.update('doc', {content: 'heading_part'}).remove('horizontal_rule').remove('paragraph').remove('code_block'),
    marks: docSchema.spec.marks
})

export const headingMenuContent = buildMenuItems(headingPartSchema).fullMenu
for (let i = 1; i <= 6; i++) {
    let type = headingPartSchema.nodes[`heading${i}`]
    headingMenuContent[1][1].content.push(blockTypeItem(type, {
        title: "Change to heading " + i,
        label: "Heading level " + i
    }))
}

export const tagsPartSchema = new Schema({
    nodes: {
        doc: {content: "tags_part"},
        tags_part: docSchema.spec.nodes.get('tags_part'),
        tag: docSchema.spec.nodes.get('tag'),
        text: docSchema.spec.nodes.get('text')
    },
    marks: docSchema.spec.marks
})

import {schema} from "prosemirror-schema-basic"
import {Schema, DOMSerializer} from "prosemirror-model"
import {article} from "../schema/document/structure"

export function templateToDoc(template) {

    const articleContent = template.map(part => {
        const node = {
            type: `${part.type}_part`,
            attrs: {
                id: part.id,
                title: part.title,
                locking: part.locking,
                language: part.language,
                optional: part.optional,
                help: part.help,
                hidden: part.optional === 'true_off' ? true : false
            }
        }
        if (part.attrs) {
            Object.entries(part.attrs).forEach(([key, value]) => {
                node.attrs[key] = value
            })
        }
        if (part.type==='richtext') {
            let defaultElement = part.attrs.elements.split(' ')[0]
            if (defaultElement==='heading') {
                defaultElement = 'heading1'
            }
            node.content = [{type: defaultElement, attrs:{track:[]}}]
        }
        return node
    })

    articleContent.unshift({type: 'title'}, {type: 'subtitle'})

    const articleAttrs = {}

    Object.entries(article.attrs).forEach(([key, value]) => {
        articleAttrs[key] = value.default
    })

    const doc = {type: 'article', attrs: articleAttrs, content: articleContent}
    return doc

}

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

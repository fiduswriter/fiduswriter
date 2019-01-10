import {article} from "../schema/document/structure"

export function templateToDoc(template) {
    const structureTemplate = template.structure || [],
        articleContent = structureTemplate.map(part => {
            const node = {
                type: `${part.type}_part`,
                attrs: {
                    id: part.id,
                    title: part.title,
                    locking: part.locking || false,
                    language: part.language || false,
                    optional: part.optional || false,
                    help: part.help,
                    hidden: part.optional === 'hidden' ? true : false
                }
            }
            if (part.attrs) {
                Object.entries(part.attrs).forEach(([key, value]) => {
                    node.attrs[key] = value
                })
            }
            if (part.initial) {
                node.content = part.initial
            } else if (['richtext', 'heading'].includes(part.type)) {
                let defaultElement = part.attrs.elements[0]
                if (defaultElement==='heading') {
                    defaultElement = 'heading1'
                }
                node.content = [{type: defaultElement, attrs:{track:[]}}]
            }
            return node
        })

    articleContent.unshift({type: 'title'})

    const articleAttrs = {}

    Object.entries(article.attrs).forEach(([key, value]) => {
        articleAttrs[key] = value.default
    })

    const doc = {type: 'article', attrs: articleAttrs, content: articleContent}
    return doc

}

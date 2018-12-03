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
    console.log({doc, jdoc: JSON.stringify(doc)})
    return doc

}

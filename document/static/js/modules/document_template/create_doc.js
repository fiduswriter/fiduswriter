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
                const defaultElement = part.attrs.elements[0]
                node.content = [{type: defaultElement, attrs:{track:[]}}]
            }
            return node
        })

    articleContent.unshift({type: 'title'})

    const articleAttrs = {}

    Object.entries(article.attrs).forEach(([key, value]) => {
        articleAttrs[key] = value.default
    })

    if (template.footnote.marks.length) {
        articleAttrs.footnoteMarks = template.footnote.marks
    }
    if (template.footnote.elements.length) {
        articleAttrs.footnoteElements = template.footnote.elements
    }
    if (template.languages.length) {
        articleAttrs.allowedLanguages = template.languages
    }
    if (template.papersizes.length) {
        articleAttrs.allowedPapersizes = template.papersizes
    }

    articleAttrs.language = navigator.languages.find(
        lang => articleAttrs.allowedLanguages.includes(lang)
    ) || articleAttrs.allowedLanguages[0]

    if (!articleAttrs.allowedPapersizes.includes(articleAttrs.papersize)) {
        articleAttrs.papersize = articleAttrs.allowedPapersizes[0]
    }

    const doc = {type: 'article', attrs: articleAttrs, content: articleContent}
    return doc

}

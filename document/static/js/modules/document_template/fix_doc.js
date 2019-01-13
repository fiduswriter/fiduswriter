import {article} from "../schema/document/structure"

function cleanFootnotes(node, elements, marks) {
    if (node.attrs && node.attrs.footnote) {
        // We remove forbidden block nodes
        node.attrs.footnote = node.attrs.footnote.filter(node => !elements.includes(node.type))
        // We remove forbidden marks + inline nodes
        node.attrs.footnote.forEach(subNode => cleanNode(subNode, elements, marks))
    }
    if (node.content) {
        node.content.forEach(subNode => cleanFootnotes(subNode, elements, marks))
    }
}

function cleanNode(node, elements, marks) {
    if (node.marks) {
        // remove forbidden marks
        node.marks = node.marks.filter(mark => !marks.includes(mark.type))
        if (!node.marks.length) {
            delete node.marks
        }
    }
    if (node.content) {
        // remove forbidden elements
        node.content = node.content.filter(node => !elements.includes(node.type))
        node.content.forEach(subNode => cleanNode(subNode, elements, marks))
        if (!node.content.length) {
            delete node.content
        }
    }
}

export function adjustDocToTemplate(oldDoc, template) {
    const doc = JSON.parse(JSON.stringify(oldDoc)), // We avoid destroying the original object
        attrs = ['footnoteMarks', 'footnoteElements', 'allowedLanguages', 'allowedPapersizes']
    attrs.forEach(attr => doc.attrs[attr] = article.attrs[attr].default)

    if (template.footnote.marks.length) {
        doc.attrs.footnoteMarks = template.footnote.marks
    }
    if (template.footnote.elements.length) {
        doc.attrs.footnoteElements = template.footnote.elements
    }
    if (template.languages.length) {
        doc.attrs.allowedLanguages = template.languages
    }
    if (template.papersizes.length) {
        doc.attrs.allowedPapersizes = template.papersizes
    }

    if(!doc.attrs.allowedLanguages.includes(doc.attrs.language)) {
        doc.attrs.language = doc.attrs.allowedLanguages[0]
    }

    if (!doc.attrs.allowedPapersizes.includes(doc.attrs.papersize)) {
        doc.attrs.papersize = doc.attrs.allowedPapersizes[0]
    }

    const removedFootnoteElements = oldDoc.attrs.footnoteElements.filter(element => !doc.attrs.footnoteElements.includes(element))
    const removedFootnoteMarks = oldDoc.attrs.footnoteMarks.filter(mark => !doc.attrs.footnoteMarks.includes(mark))

    if (removedFootnoteMarks.length || removedFootnoteElements.length) {
        cleanFootnotes(doc, removedFootnoteElements, removedFootnoteMarks)
    }

    const oldContent = doc.content
    doc.content = [
        oldContent.shift() // The title
    ]

    let movedParts = []

    template.structure.forEach(part => {
        let oldNode = oldContent.find(
            oldContentNode => oldContentNode.type === `${part.type}_part` && oldContentNode.attrs.id === part.id
        )
        if (oldNode) {
            while (oldNode !== oldContent[0]) {
                const firstOldContent = oldContent.shift(),
                    inTemplate = !!template.structure.find(part => `${part.type}_part` === firstOldContent.type && part.id === firstOldContent.attrs.id)
                if (inTemplate) {
                    movedParts.push(firstOldContent)
                } else if (
                    firstOldContent.content &&
                    !firstOldContent.attrs.hidden &&
                    firstOldContent.attrs.locking !== 'fixed' &&
                    !(
                        // table with just first row, which is fixed.
                        firstOldContent.attrs.locking === 'header' &&
                        firstOldContent.content.length === 1
                    ) &&
                    !(
                        // heading/richtext with just the default contents
                        firstOldContent.attrs.elements &&
                        firstOldContent.content.length === 1 &&
                        firstOldContent.content[0].type === firstOldContent.attrs.elements[0] &&
                        !firstOldContent.content[0].content
                    )
                ){
                    firstOldContent.attrs.deleted = true
                    doc.content.push(firstOldContent)
                }
            }
            oldContent.shift()
        } else {
            oldNode = movedParts.find(
                oldContentNode => oldContentNode.type === `${part.type}_part` && oldContentNode.attrs.id === part.id
            )
            if (oldNode) {
                movedParts = movedParts.filter(oldContentNode => oldContentNode !== oldNode)
            }
        }

        if (oldNode) {
            const oldElements = oldNode.attrs.elements,
                oldMarks = oldNode.attrs.marks,
                newNode = Object.assign(
                    {},
                    oldNode,
                    {
                        attrs: {
                            id: part.id,
                            title: part.title,
                            locking: part.locking || false,
                            language: part.language || false,
                            optional: part.optional || false,
                            help: part.help,
                            hidden: part.optional ? oldNode.attrs.hidden : false
                        }
                    }
                )

            if (part.attrs) {
                Object.entries(part.attrs).forEach(([key, value]) => {
                    newNode.attrs[key] = value
                })
            }
            if (oldElements) { // parts that define elements also define marks.
                const removedElements = oldElements.filter(element => !newNode.attrs.elements.includes(element))
                const removedMarks = oldMarks.filter(mark => !newNode.attrs.marks.includes(mark))
                if (removedElements.length || removedMarks.length) {
                    cleanNode(newNode, removedElements, removedMarks)
                    if (!newNode.content && ['richtext', 'heading'].includes(part.type)) {
                        const defaultElement = part.attrs.elements[0]
                        newNode.content = [{type: defaultElement, attrs:{track:[]}}]
                    }
                }
            }

            doc.content.push(newNode)

        } else {
            // The node is new and didn't exist in the old document.
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
            doc.content.push(node)
        }

    })

    // move remaining oldContent items that were not in template.
    while(oldContent.length) {
        const newNode = oldContent.shift()
        newNode.attrs.deleted = true
        doc.content.push(newNode)
    }

    return doc

}

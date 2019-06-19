import hash from "object-hash"

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

export function adjustDocToTemplate(doc, template, documentStyles, citationStyles, schema) {
    if (!doc.attrs) {
        doc.attrs = {}
    }
    const removedFootnoteElements = 'footnote_elements' in doc.attrs ? doc.attrs.footnote_elements.filter(
            element => !template.attrs.footnote_elements.includes(element)
        ) : [],
        removedFootnoteMarks = 'footnote_marks' in doc.attrs ? doc.attrs.footnote_marks.filter(
            mark => !template.attrs.footnote_marks.includes(mark)
        ) : [],
        attrs = ['footnote_marks', 'footnote_elements', 'languages', 'papersizes', 'template']
    attrs.forEach(attr => doc.attrs[attr] = attr in template.attrs ? template.attrs[attr] : schema.nodes['article'].attrs[attr].default)

    const docLanguages = 'languages' in doc.attrs ? doc.attrs.languages : schema.nodes['article'].attrs.languages.default
    const docLanguage = 'language' in doc.attrs ? doc.attrs.language : schema.nodes['article'].attrs.language.default
    if (!docLanguages.includes(docLanguage)) {
        if (!docLanguages.length) {
            throw new Error('Document template allows no languages.')
        }
        doc.attrs.language = docLanguages[0]
    }


    const docPapersizes = 'papersizes' in doc.attrs ? doc.attrs.papersizes : schema.nodes['article'].attrs.papersizes.default
    const docPapersize = 'papersize' in doc.attrs ? doc.attrs.papersize : schema.nodes['article'].attrs.papersize.default
    if (!docPapersizes.includes(docPapersize)) {
        if (!docPapersizes.length) {
            throw new Error('Document template allows no paper sizes.')
        }
        doc.attrs.papersize = docPapersizes[0]
    }

    const docDocumentstyle = 'documentstyle' in doc.attrs ? doc.attrs.documentstyle : schema.nodes['article'].attrs.documentstyle.default
    if (!documentStyles.map(style => style.filename).includes(docDocumentstyle)) {
        if (!documentStyles.length) {
            throw new Error('No document styles have been defined for document template.')
        }
        doc.attrs.documentstyle = documentStyles[0].filename
    }

    const docCitationstyle = 'citationstyle' in doc.attrs ? doc.attrs.citationstyle : schema.nodes['article'].attrs.citationstyle.default
    if (!citationStyles.map(style => style.short_title).includes(docCitationstyle)) {
        if (!citationStyles.length) {
            throw new Error('No citation styles have been defined for document template.')
        }
        doc.attrs.citationstyle = citationStyles[0].short_title
    }


    if (removedFootnoteMarks.length || removedFootnoteElements.length) {
        cleanFootnotes(doc, removedFootnoteElements, removedFootnoteMarks)
    }

    const oldContent = doc.content
    doc.content = [
        oldContent.shift() // The title
    ]

    let movedParts = []

    template.content.slice(1).forEach(part => {
        let oldNode = oldContent.find(
            oldContentNode =>
                oldContentNode.type === part.type &&
                oldContentNode.attrs.id === part.attrs.id
        )
        if (oldNode) {
            while (oldNode !== oldContent[0]) {
                const firstOldContent = oldContent.shift(),
                    inTemplate = !!template.content.find(
                        part =>
                            part.type === firstOldContent.type &&
                            part.attrs.id === firstOldContent.attrs.id
                    )
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
                ) {
                    firstOldContent.attrs.deleted = true
                    doc.content.push(firstOldContent)
                }
            }
            oldContent.shift()
        } else {
            oldNode = movedParts.find(
                oldContentNode =>
                    oldContentNode.type === part.type &&
                    oldContentNode.attrs.id === part.attrs.id
            )
            if (oldNode) {
                movedParts = movedParts.filter(oldContentNode => oldContentNode !== oldNode)
            }
        }
        if (oldNode) {
            const newNode = Object.assign(
                    {},
                    oldNode,
                    {
                        attrs: {}
                    }
                )
            Object.entries(part.attrs).forEach(([key, value]) => {
                newNode.attrs[key] = value
            })
            if (newNode.attrs.optional) {
                newNode.attrs.hidden = oldNode.attrs.hidden
            }
            if (
                (newNode.attrs.initial || oldNode.attrs.initial) &&
                (
                    oldNode.attrs.locking === 'fixed' ||

                    hash(oldNode.attrs.initial || {}) === hash(oldNode.content || {})
                )
            ) {
                if (newNode.attrs.initial) {
                    newNode.content = newNode.attrs.initial
                } else {
                    delete newNode.content
                }
            }

            if (oldNode.attrs.elements || schema.nodes[oldNode.type].attrs.elements) { // parts that define elements also define marks.
                const oldElements = oldNode.attrs.elements || schema.nodes[oldNode.type].attrs.elements.default
                const newElements = newNode.attrs.elements || schema.nodes[newNode.type].attrs.elements.default
                const removedElements = oldElements.filter(
                    element => !newElements.includes(element)
                )

                const oldMarks = oldNode.attrs.marks || schema.nodes[oldNode.type].attrs.marks.default
                const newMarks = newNode.attrs.marks || schema.nodes[newNode.type].attrs.marks.default
                const removedMarks = oldMarks.filter(
                    mark => !newMarks.includes(mark)
                )
                if (removedElements.length || removedMarks.length) {
                    cleanNode(newNode, removedElements, removedMarks)
                    if (!newNode.content && ['richtext_part', 'heading_part'].includes(part.type)) {
                        newNode.content = [{type: part.attrs.elements[0]}]
                    } else if (!newNode.content && part.type === 'table_part') {
                        newNode.content = [
                            {type: 'table', content: [
                                {type: 'table_row', content: [
                                    {type: 'table_cell', content: [{type: 'paragraph'}]}
                                ]}
                            ]}
                        ]
                    }
                }
            }
            doc.content.push(newNode)

        } else {
            // The node is new and didn't exist in the old document.
            doc.content.push(JSON.parse(JSON.stringify(part)))
        }

    })

    // move remaining oldContent items that were not in template.
    while (oldContent.length) {
        const newNode = oldContent.shift()
        if (newNode.attrs.hasOwnProperty('deleted')) {
            newNode.attrs.deleted = true
            doc.content.push(newNode)
        }
    }
    return doc

}

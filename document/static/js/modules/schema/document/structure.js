export const doc = {
    content: "article", // Transformations don't work well on the top most element
    selectable: false
}

export const article = {
    defining: true,
    content: 'title part*',
    selectable: false,
    allowGapCursor: false,
    attrs: {
        papersize: {
            default: 'A4'
        },
        citationstyle: {
            default: ''
        },
        documentstyle: {
            default: ''
        },
        language: {
            default: 'en-US'
        },
        tracked: {
            default: false
        },
        languages: { // Available languages
            default: ['en-US']
        },
        papersizes: { // Available paper sizes
            default: ['A4']
        },
        footnote_marks: {
            default: ['strong', 'em']
        },
        footnote_elements: {
            default: ['paragraph']
        },
        template: {
            default: ''
        }
    },
    parseDOM: [{
        tag: "div.article",
        getAttrs(dom) {
            return {
                papersize: dom.dataset.papersize,
                citationstyle: dom.dataset.citationstyle,
                documentstyle: dom.dataset.documentstyle
            }
        }
    }],
    toDOM(node) {
        return ["div", {
            class: 'article',
            'data-papersize': node.attrs.papersize,
            'data-citationstyle': node.attrs.citationstyle,
            'data-documentstyle': node.attrs.documentstyle
        }, 0]
    }
}

const partSpec = (type, content, attrs = {}) => ({
    content,
    group: 'part',
    marks: "annotation track",
    defining: true,
    attrs: Object.assign({
        title: {
            default: ''
        },
        id: {
            default: ''
        },
        locking: {
            default: false
        },
        language: {
            default: false
        },
        optional: {
            default: false
        },
        hidden: {
            default: false
        },
        help: {
            default: false
        },
        deleted: { // used when a part is present in a document but not part of the document template due to template changes
            default: false
        }
    }, attrs),
    parseDOM: [{
        tag: `div.article-${type}`,
        getAttrs(dom) {
            return {
                hidden: dom.dataset.hidden === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: `article-part article-${type} article-${node.attrs.id}`
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        if (node.attrs.deleted) {
            attrs.class += ' article-deleted'
        }
        return ["div", attrs, 0]
    }
})

export const richtext_part = partSpec('richtext', 'block+', {
    elements: {
        default: []
    },
    marks: {
        default: []
    }
})
export const heading_part = partSpec('heading', 'heading', {
    elements: {
        default: []
    },
    marks: {
        default: []
    }
})
export const contributors_part = partSpec('contributors', 'contributor*', {
    item_title: {
        default: gettext('Contributor')
    }
})
export const tags_part = partSpec('tags', 'tag*', {
    item_title: {
        default: gettext('Tag')
    }
})
export const table_part = partSpec('table', 'table', {
    elements: {
        default: []
    },
    marks: {
        default: []
    }
})

export const title = {
    content: "text*",
    marks: "annotation track",
    group: "fixedpart",
    defining: true,
    attrs : {
        title: {
            default: gettext('Title')
        },
        id: {
            default: 'title'
        }
    },
    parseDOM: [{
        tag: "div.article-title"
    }],
    toDOM(node) {
        return ["div", {
            class: 'article-part article-title'
        }, 0]
    }
}

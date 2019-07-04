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
            default: ["af-ZA", "sq-AL", "ar", "ast", "be", "br", "bg", "ca", "ca-ES-Valencia", "zh-CN", "da", "nl", "en-AU", "en-CA", "en-NZ", "en-ZA", "en-GB", "en-US", "eo", "fr", "gl", "de-DE", "de-AU", "de-CH", "el", "he", "is", "it", "ja", "km", "lt", "ml", "nb-NO", "nn-NO", "fa", "pl", "pt-BR", "pt-PT", "ro", "ru", "tr", "sr-SP-Cy", "sr-SP-Lt", "sk", "sl", "es", "sv", "ta", "tl", "uk"]
        },
        papersizes: { // Available paper sizes
            default: ["A4", "US Letter"]
        },
        footnote_marks: {
            default: ['strong', 'em', 'link', 'anchor']
        },
        footnote_elements: {
            default: ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "blockquote", "table"]
        },
        bibliography_header: {
            default: {}
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
    isolating: true,
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
        initial: {
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
        default: ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "blockquote", "footnote", "table"]
    },
    marks: {
        default: ['strong', 'em', 'link', 'anchor']
    },
    metadata: {
        default: false
    }
})
export const heading_part = partSpec('heading', 'heading', {
    elements: {
        default: ["heading1"]
    },
    marks: {
        default: ['strong', 'em', 'link', 'anchor']
    },
    metadata: {
        default: false
    }
})
export const contributors_part = partSpec('contributors', 'contributor*', {
    item_title: {
        default: gettext('Contributor')
    },
    metadata: {
        default: false
    }
})
export const tags_part = partSpec('tags', 'tag*', {
    item_title: {
        default: gettext('Tag')
    },
    metadata: {
        default: false
    }
})
export const table_part = partSpec('table', 'table', {
    elements: {
        default: ["paragraph", "heading1", "heading2", "heading3", "heading4", "heading5", "heading6", "figure", "ordered_list", "bullet_list", "horizontal_rule", "equation", "citation", "blockquote", "footnote"]
    },
    marks: {
        default: ['strong', 'em', 'link', 'anchor']
    }
})

export const table_of_contents = {
    group: "part",
    marks: "annotation track",
    defining: true,
    parseDOM: [{
        tag: "div.table-of-contents"
    }],
    attrs: {
        title: {
            default: gettext('Table of Contents')
        },
        id: {
            default: 'toc'
        },
        optional: {
            default: false
        },
        hidden: {
            default: false
        }
    },
    toDOM(node) {
        const dom = document.createElement('div')
        dom.classList.add('article-part', 'table-of-contents')
        if (node.attrs.hidden) {
            dom.dataset.hidden = 'true'
        }
        dom.innerHTML = `<h1 class="toc">${node.attrs.title}</h1>`
        return dom
    }

}

export const separator_part = {
    marks: "annotation track",
    group: "part",
    defining: true,
    attrs : {
        id: {
            default: 'separator'
        }
    },
    parseDOM: [{
        tag: "hr.article-separator_part"
    }],
    toDOM(node) {
        const dom = document.createElement('hr')
        dom.classList.add('article-separator_part')
        dom.classList.add(`article-${node.attrs.id}`)
        return dom
    }
}

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
    toDOM(_node) {
        return ["div", {
            class: 'article-part article-title'
        }, 0]
    }
}

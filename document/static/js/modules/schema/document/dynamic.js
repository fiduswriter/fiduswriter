export const articleSpec = (content, template) => ({
    defining: true,
    content: `title subtitle ${content}`,
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
        template: {
            default: template
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
})

export const partSpec = ({id, type, title}, content) => ({
    content,
    group: `part ${type}`,
    marks: "annotation track",
    defining: true,
    title,
    parseDOM: [{
        tag: `div.article-${id}`
    }],
    toDOM(node) {
        return ["div", {
            class: `article-part article-${id}`
        }, 0]
    }
})

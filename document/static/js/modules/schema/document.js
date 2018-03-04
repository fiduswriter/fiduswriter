import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {addListNodes} from "prosemirror-schema-list"
import {tableNodes} from "prosemirror-tables"
import {htmlToFnNode, fnNodeToHtml} from "./footnotes_convert"
import {figure, citation, equation, heading, anchor, deletion, insertion} from "./common"


let article = {
    defining: true,
    content: "title subtitle authors abstract keywords body",
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
        }
    },
    parseDOM: [{
        tag: "div.article",
        getAttrs(dom) {
            return {
                papersize: dom.getAttribute('data-papersize'),
                citationstyle: dom.getAttribute('data-citationstyle'),
                documentstyle: dom.getAttribute('data-documentstyle')
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

let title = {
    content: "text*",
    marks: "annotation",
    group: "part",
    defining: true,
    parseDOM: [{
        tag: "div.article-title"
    }],
    toDOM(node) {
        return ["div", {
            class: 'article-part article-title'
        }, 0]
    }
}

let subtitle = {
    content: "text*",
    marks: "annotation",
    group: "part",
    defining: true,
    isMetadata() {
        return true
    },
    attrs: {
        hidden: {
            default: true
        }
    },
    parseDOM: [{
        tag: "div.article-subtitle",
        getAttrs(dom) {
            return {
                hidden: dom.getAttribute('data-hidden') === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        let attrs = {
            class: 'article-part metadata article-subtitle'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

let author = {
    inline: true,
    draggable: true,
    attrs: {
        firstname: {default: false},
        lastname: {default: false},
        email: {default: false},
        institution: {default: false}
    },
    parseDOM: [{
        tag: 'span.author',
        getAttrs(dom) {
            return {
                firstname: dom.getAttribute('data-firstname'),
                lastname: dom.getAttribute('data-lastname'),
                email: dom.getAttribute('data-email'),
                institution: dom.getAttribute('data-institution')
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement('span')
        dom.classList.add('author')
        dom.setAttribute('data-firstname', node.attrs.firstname)
        dom.setAttribute('data-lastname', node.attrs.lastname)
        dom.setAttribute('data-email', node.attrs.email)
        dom.setAttribute('data-institution', node.attrs.institution)
        let content = []
        if (node.attrs.firstname) {
            content.push(node.attrs.firstname)
        }
        if (node.attrs.lastname) {
            content.push(node.attrs.lastname)
        }
        if (node.attrs.email) {
            content.push(`<i>${gettext('Email')}: ${node.attrs.email}</i>`)
        }
        if (node.attrs.institution) {
            content.push(`(${node.attrs.institution})`)
        }

        dom.innerHTML = content.join(' ')

        return dom
    }
}

let authors = {
    content: "author*",
    marks: "annotation",
    group: "part",
    defining: true,
    isMetadata() {
        return true
    },
    attrs: {
        hidden: {
            default: true
        }
    },
    parseDOM: [{
        tag: "div.article-authors",
        getAttrs(dom) {
            return {
                hidden: dom.getAttribute('data-hidden') === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        let attrs = {
            class: 'article-part metadata article-authors'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

let abstract = {
    content: "(block | table_block)+",
    group: "part",
    marks: "annotation",
    defining: true,
    isMetadata() {
        return true
    },
    attrs: {
        hidden: {
            default: true
        }
    },
    parseDOM: [{
        tag: "div.article-abstract",
        getAttrs(dom) {
            return {
                hidden: dom.getAttribute('data-hidden') === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        let attrs = {
            class: 'article-part metadata article-abstract'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

let keyword = {
    inline: true,
    draggable: true,
    attrs: {
        keyword: {
            default: ''
        }
    },
    parseDOM: [{
        tag: 'span.keyword',
        getAttrs(dom) {
            return {
                keyword: dom.innerText
            }
        }
    }],
    toDOM(node) {
        return ["span", {class: 'keyword'}, node.attrs.keyword]
    }
}

let keywords = {
    content: "keyword*",
    marks: "annotation",
    group: "part",
    defining: true,
    isMetadata() {
        return true
    },
    attrs: {
        hidden: {
            default: true
        }
    },
    parseDOM: [{
        tag: "div.article-keywords",
        getAttrs(dom) {
            return {
                hidden: dom.getAttribute('data-hidden') === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        let attrs = {
            class: 'article-part metadata article-keywords'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

let body = {
    content: "(block | table_block)+",
    group: "part",
    marks: "annotation",
    defining: true,
    isMetadata() {
        return true
    },
    parseDOM: [{
        tag: "div.article-body"
    }],
    toDOM(node) {
        return ["div", {
            class: 'article-part article-body'
        }, 0]
    }
}

let footnote = {
    inline: true,
    group: "inline",
    attrs: {
        footnote: {
            default: [{
                type: 'paragraph'
            }]
        }
    },
    parseDOM: [{
        tag: "span.footnote-marker[data-footnote]",
        getAttrs(dom) {
            return {
                footnote: htmlToFnNode(dom.getAttribute('data-footnote'))
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement("span")
        dom.classList.add("footnote-marker")
        dom.setAttribute("data-footnote", fnNodeToHtml(node.attrs.footnote))
        dom.innerHTML = '&nbsp;'
        return dom
    }
}

let code_block = {
    content: "text*",
    marks: "annotation",
    group: "block",
    code: true,
    defining: true,
    parseDOM: [{
        tag: "pre",
        preserveWhitespace: "full"
    }],
    toDOM() {
        return ["pre", ["code", 0]]
    }
}


let comment = {
    attrs: {
        id: {}
    },
    inclusive: false,
    excludes: "",
    group: "annotation",
    parseDOM: [{
        tag: "span.comment[data-id]",
        getAttrs(dom) {
            return {
                id: parseInt(dom.getAttribute("data-id"))
            }
        }
    }],
    toDOM(node) {
        return ['span', {
            class: 'comment',
            'data-id': node.attrs.id
        }]
    }
}

let doc = {
    content: "article", // Transformations don't work well on the top most element
    selectable: false
}


let spec = {
    nodes: OrderedMap.from({
        doc,
        article,
        title,
        subtitle,
        authors,
        author,
        abstract,
        keywords,
        keyword,
        body,
        paragraph: nodes.paragraph, // default textblock
        blockquote: nodes.blockquote,
        horizontal_rule: nodes.horizontal_rule,
        figure,
        heading,
        code_block,
        text: nodes.text,
        hard_break: nodes.hard_break,
        citation,
        equation,
        footnote
    }),
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link: marks.link,
        code: marks.code,
        comment,
        anchor,
        deletion,
        insertion
    })
}

spec.nodes = addListNodes(spec.nodes, "block+", "block")

spec.nodes = spec.nodes.append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

export const docSchema = new Schema(spec)

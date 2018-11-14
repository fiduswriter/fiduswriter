import {escapeText} from "../common"
import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {tableNodes} from "prosemirror-tables"
import {htmlToFnNode, fnNodeToHtml} from "./footnotes_convert"
import {
    figure,
    citation,
    equation,
    heading,
    anchor,
    paragraph,
    blockquote,
    horizontal_rule,
    ordered_list,
    bullet_list,
    list_item,
    deletion,
    insertion,
    format_change,
    parseTracks,
    comment,
    annotation_tag
} from "./common"

const article = {
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
        },
        tracked: {
            default: false
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

const title = {
    content: "text*",
    marks: "annotation track",
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

const subtitle = {
    content: "text*",
    marks: "annotation track",
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
                hidden: dom.dataset.hidden === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: 'article-part metadata article-subtitle'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

const author = {
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
                firstname: dom.dataset.firstname,
                lastname: dom.dataset.lastname,
                email: dom.dataset.email,
                institution: dom.dataset.institution
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('span')
        dom.classList.add('author')
        dom.dataset.firstname = node.attrs.firstname
        dom.dataset.lastname = node.attrs.lastname
        dom.dataset.email = node.attrs.email
        dom.dataset.institution = node.attrs.institution
        const content = []
        if (node.attrs.firstname) {
            content.push(escapeText(node.attrs.firstname))
        }
        if (node.attrs.lastname) {
            content.push(escapeText(node.attrs.lastname))
        }
        if (node.attrs.email) {
            content.push(`<i>${gettext('Email')}: ${escapeText(node.attrs.email)}</i>`)
        }
        if (node.attrs.institution) {
            content.push(`(${escapeText(node.attrs.institution)})`)
        }

        dom.innerHTML = content.join(' ')

        return dom
    }
}

const authors = {
    content: "author*",
    marks: "annotation track",
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
                hidden: dom.dataset.hidden === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: 'article-part metadata article-authors'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

const abstract = {
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
                hidden: dom.dataset.hidden === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: 'article-part metadata article-abstract'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

const keyword = {
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

const keywords = {
    content: "keyword*",
    marks: "annotation track",
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
                hidden: dom.dataset.hidden === "true" ? true : false
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: 'article-part metadata article-keywords'
        }
        if (node.attrs.hidden) {
            attrs['data-hidden'] = 'true'
        }
        return ["div", attrs, 0]
    }
}

const body = {
    content: "(block | table_block)+",
    group: "part",
    marks: "annotation track",
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

const footnote = {
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
                footnote: htmlToFnNode(dom.dataset.footnote)
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement("span")
        dom.classList.add("footnote-marker")
        dom.dataset.footnote = fnNodeToHtml(node.attrs.footnote)
        dom.innerHTML = '&nbsp;'
        return dom
    }
}

const code_block = {
    content: "text*",
    marks: "annotation track",
    group: "block",
    code: true,
    defining: true,
    attrs: {
        track: {
            default: []
        }
    },
    parseDOM: [{
        tag: "pre",
        preserveWhitespace: "full",
        getAttrs(dom) {return {
            track: parseTracks(dom.dataset.track)
        }}
    }],
    toDOM(node) {
        const attrs = node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ["pre", attrs, ["code", 0]]
    }
}

const doc = {
    content: "article", // Transformations don't work well on the top most element
    selectable: false
}


const spec = {
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
        paragraph,
        blockquote,
        horizontal_rule,
        figure,
        heading,
        code_block,
        text: nodes.text,
        hard_break: nodes.hard_break,
        citation,
        equation,
        footnote,
        ordered_list,
        bullet_list,
        list_item
    }),
    marks: OrderedMap.from({
        em: marks.em,
        strong: marks.strong,
        link: marks.link,
        code: marks.code,
        comment,
        annotation_tag,
        anchor,
        deletion,
        insertion,
        format_change
    })
}

spec.nodes = spec.nodes.append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

spec.nodes = spec.nodes.update("table_cell", Object.assign({marks: "annotation"}, spec.nodes.get("table_cell")))

spec.nodes = spec.nodes.update(
    "table",
    Object.assign(
        {},
        spec.nodes.get("table"),
        {
            attrs: {
                track: {default: []}
            },
            parseDOM: [{tag: "table", getAttrs(dom) {
                return {
                    track: parseTracks(dom.dataset.track)
                }
            }}],
            toDOM(node) {
                const attrs = {}
                if (node.attrs.track.length) {
                    attrs['data-track'] = JSON.stringify(node.attrs.track)
                }
                return ["table", attrs, ["tbody", 0]]
            }
        }
    )
)

export const docSchema = new Schema(spec)

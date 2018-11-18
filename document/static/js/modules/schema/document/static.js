import {escapeText} from "../../common"
import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {nodes, marks} from "prosemirror-schema-basic"
import {tableNodes} from "prosemirror-tables"
import {htmlToFnNode, fnNodeToHtml} from "../footnotes_convert"
import {
    figure,
    citation,
    equation,
    heading1,
    heading2,
    heading3,
    heading4,
    heading5,
    heading6,
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
} from "../common"

const title = {
    title: gettext('Title'),
    content: "text*",
    marks: "annotation track",
    group: "fixedpart",
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
    title: gettext('Subtitle'),
    content: "text*",
    marks: "annotation track",
    group: "fixedpart",
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

const contributor = {
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


const tag = {
    inline: true,
    draggable: true,
    attrs: {
        tag: {
            default: ''
        }
    },
    parseDOM: [{
        tag: 'span.tag',
        getAttrs(dom) {
            return {
                tag: dom.innerText
            }
        }
    }],
    toDOM(node) {
        return ["span", {class: 'tag'}, node.attrs.tag]
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

let specNodes = OrderedMap.from({
    doc,
    title,
    subtitle,
    contributor,
    tag,
    paragraph,
    blockquote,
    horizontal_rule,
    figure,
    heading1,
    heading2,
    heading3,
    heading4,
    heading5,
    heading6,
    code_block,
    text: nodes.text,
    hard_break: nodes.hard_break,
    citation,
    equation,
    footnote,
    ordered_list,
    bullet_list,
    list_item
}).append(tableNodes({
    tableGroup: "table_block",
    cellContent: "block+"
}))

specNodes = specNodes.update(
    "table_cell",
    Object.assign({marks: "annotation"}, specNodes.get("table_cell"))
).update(
    "table",
    Object.assign(
        {},
        specNodes.get("table"),
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

export const spec = {
    nodes: specNodes,
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

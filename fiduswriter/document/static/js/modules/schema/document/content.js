import {escapeText} from "../../common"
import {parseTracks} from "../common"
import {fnNodeToHtml, htmlToFnNode} from "../footnotes_convert"

export const randomCodeBlockId = () => {
    return `C${Math.round(Math.random() * 10000000) + 1}`
}

export const contributor = {
    inline: true,
    draggable: true,
    attrs: {
        firstname: {default: false},
        lastname: {default: false},
        email: {default: false},
        institution: {default: false}
    },
    parseDOM: [
        {
            tag: "span.contributor",
            getAttrs(dom) {
                return {
                    firstname: dom.dataset.firstname,
                    lastname: dom.dataset.lastname,
                    email: dom.dataset.email,
                    institution: dom.dataset.institution
                }
            }
        }
    ],
    toDOM(node) {
        const dom = document.createElement("span")
        dom.classList.add("contributor")
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
            content.push(
                `<i>${gettext("Email")}: ${escapeText(node.attrs.email)}</i>`
            )
        }
        if (node.attrs.institution) {
            content.push(`(${escapeText(node.attrs.institution)})`)
        }

        dom.innerHTML = content.join(" ")

        return dom
    }
}

export const tag = {
    inline: true,
    draggable: true,
    attrs: {
        tag: {
            default: ""
        }
    },
    parseDOM: [
        {
            tag: "span.tag",
            getAttrs(dom) {
                return {
                    tag: dom.innerText
                }
            }
        }
    ],
    toDOM(node) {
        return ["span", {class: "tag"}, node.attrs.tag]
    }
}

export const footnote = {
    inline: true,
    group: "inline",
    attrs: {
        footnote: {
            default: [
                {
                    type: "paragraph"
                }
            ]
        }
    },
    parseDOM: [
        {
            tag: "span.footnote-marker[data-footnote]",
            getAttrs(dom) {
                return {
                    footnote: htmlToFnNode(dom.dataset.footnote)
                }
            }
        }
    ],
    toDOM(node) {
        const dom = document.createElement("span")
        dom.classList.add("footnote-marker")
        dom.dataset.footnote = fnNodeToHtml(node.attrs.footnote)
        dom.innerHTML = "&nbsp;"
        return dom
    }
}

export const code_block = {
    content: "text*",
    marks: "_",
    group: "block",
    code: true,
    defining: true,
    attrs: {
        track: {
            default: []
        },
        language: {
            default: ""
        },
        category: {
            default: ""
        },
        title: {
            default: ""
        },
        id: {
            default: ""
        }
    },
    parseDOM: [
        {
            tag: "pre",
            preserveWhitespace: "full",
            getAttrs(dom) {
                return {
                    track: parseTracks(dom.dataset.track),
                    language: dom.dataset.language || "",
                    category: dom.dataset.category || "",
                    title: dom.dataset.title || "",
                    id: dom.dataset.id || ""
                }
            }
        }
    ],
    toDOM(node) {
        const attrs = {}
        if (node.attrs.track.length) {
            attrs["data-track"] = JSON.stringify(node.attrs.track)
        }
        if (node.attrs.language) {
            attrs["data-language"] = node.attrs.language
        }
        if (node.attrs.category) {
            attrs["data-category"] = node.attrs.category
        }
        if (node.attrs.title) {
            attrs["data-title"] = node.attrs.title
        }
        if (node.attrs.id) {
            attrs["data-id"] = node.attrs.id
        }
        return ["pre", attrs, ["code", 0]]
    }
}

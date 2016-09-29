import {BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror/dist/schema-basic"

import {Schema, Block, Inline, Text, Attribute, MarkType} from "prosemirror/dist/model"

import {elt} from "prosemirror/dist/util/dom"

import {katexRender} from "../katex/katex"

class Doc extends Block {
    get matchDOMTag() {
        return {"div.ProseMirror-content": null}
    }
    toDOM(node) {
        return ["div", {class: 'ProseMirror-content'}, 0]
    }
}

class Title extends Block {
    get matchDOMTag() {
        return {"div[id='document-title']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-title'}, 0]
    }
}

class Subtitle extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-subtitle']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-subtitle'}, 0]
    }
}

class Authors extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-authors']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-authors'}, 0]
    }
}

class Abstract extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-abstract']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-abstract'}, 0]
    }
}

class Keywords extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-keywords']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-keywords'}, 0]
    }
}

class Body extends Block {
    get matchDOMTag() {
        return {"div[id='document-contents']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-contents'}, 0]
    }
}


class Footnote extends Inline {
    get attrs() {
        return {
            contents: new Attribute({
                default: ""
            }),
        }
    }
    get matchDOMTag() {
        return {
            "footnote": dom => ({ // TODO: really used??
                contents: dom.innerHTML
            }),
            "span.footnote-marker": dom => ({
                contents: dom.getAttribute('contents')
            })
        }
    }
    toDOM(node) {
        let dom = elt("span", {
            class: 'footnote-marker',
            contents: node.attrs.contents
        })
        dom.innerHTML = '&nbsp;'
        return dom
    }
}


export class Citation extends Inline {
    get attrs() {
        return {
            bibFormat: new Attribute({
                default: ""
            }),
            bibEntry: new Attribute(),
            bibBefore: new Attribute({
                default: ""
            }),
            bibPage: new Attribute({
                default: ""
            })
        }
    }
    get matchDOMTag() {
        return {
            "span.citation": dom => ({
                bibFormat: dom.getAttribute('data-bib-format') || '',
                bibEntry: dom.getAttribute('data-bib-entry') || '',
                bibBefore: dom.getAttribute('data-bib-before') || '',
                bibPage: dom.getAttribute('data-bib-page') || ''
            }),
            "cite": dom => ({
                bibFormat: dom.getAttribute('data-bib-format') || '',
                bibEntry: dom.getAttribute('data-bib-entry') || '',
                bibBefore: dom.getAttribute('data-bib-before') || '',
                bibPage: dom.getAttribute('data-bib-page') || ''
            })
        }
    }
    toDOM(node) {
        return ["span", {
            class: 'citation',
            'data-bib-format': node.attrs.bibFormat,
            'data-bib-entry': node.attrs.bibEntry,
            'data-bib-before': node.attrs.bibBefore,
            'data-bib-page': node.attrs.bibPage
        }]
        // TODO: Do the citation formatting here rather than centrally, maybe?
    }
}


export class Equation extends Inline {
    get attrs() {
        return {
            equation: new Attribute({
                default: ""
            })
        }
    }
    get matchDOMTag() {
        return {"span.equation": dom => ({
            equation: dom.getAttribute('data-equation')
        })}
    }
    toDOM(node) {
        let dom = elt('span', {
            class: 'equation',
            'data-equation': node.attrs.equation
        })
        katexRender(node.attrs.equation, dom, {throwOnError: false})
        dom.setAttribute('contenteditable', 'false')
        return dom
    }
}

export class Figure extends Block {
    get attrs() {
        return {
            equation: new Attribute({
                default: ""
            }),
            image: new Attribute({
                default: ""
            }),
            figureCategory: new Attribute({
                default: ""
            }),
            caption: new Attribute({
                default: ""
            })
        }
    }
    get matchDOMTag() {
        return {"figure": dom => ({
            equation: dom.getAttribute('data-equation'),
            image: dom.getAttribute('data-image'),
            figureCategory: dom.getAttribute('data-figure-category'),
            caption: dom.getAttribute('data-caption')
        })}
    }
    toDOM(node) {
        let dom = elt('figure', {
            'data-equation': node.attrs.equation,
            'data-image': node.attrs.image,
            'data-figure-category': node.attrs.figureCategory,
            'data-caption': node.attrs.caption
        })
        if (node.attrs.image) {
            dom.appendChild(elt("div"))
            if(node.type.schema.cached.imageDB) {
                if(node.type.schema.cached.imageDB.db[node.attrs.image] &&
                    node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                        let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                    dom.firstChild.appendChild(elt("img", {
                        "src": node.type.schema.cached.imageDB.db[node.attrs.image].image
                    }))
                    dom.setAttribute('data-image-src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
                } else {
                    /* The image was not present in the imageDB -- possibly because a collaborator just added ut.
                    Try to reload the imageDB, but only once. If the image cannot be found in the updated
                    imageDB, do not attempt at reloading the imageDB if an image cannot be
                    found. */
                    if (!imageDBBroken) {
                        node.type.schema.cached.imageDB.getDB(function() {
                            if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                                    node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                                let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                                dom.firstChild.appendChild(elt("img", {
                                    "src": imgSrc
                                }))
                                dom.setAttribute('data-image-src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
                            } else {
                                imageDBBroken = true
                            }
                        })
                    }
                }
            }
        } else {
            let domEquation = elt('div', {
                class: 'figure-equation',
                'data-equation': node.attrs.equation
            })

            katexRender(node.attrs.equation, domEquation, {
                displayMode: true,
                throwOnError: false
            })
            dom.appendChild(domEquation)
        }
        let captionNode = elt("figcaption")
        if (node.attrs.figureCategory !== 'none') {
            let figureCatNode = elt('span', {
                class: 'figure-cat-' + node.attrs.figureCategory,
                'data-figure-category': node.attrs.figureCategory
            })
            figureCatNode.innerHTML = node.attrs.figureCategory
            captionNode.appendChild(figureCatNode)
        }
        if (node.attrs.caption !== '') {
            let captionTextNode = elt("span", {
                'data-caption': node.attrs.caption
            })
            captionTextNode.innerHTML = node.attrs.caption

            captionNode.appendChild(captionTextNode)
        }
        // Add table captions above the table, other captions below.
        if (node.attrs.figureCategory === 'table') {
            dom.insertBefore(captionNode, dom.lastChild)
        } else {
            dom.appendChild(captionNode)
        }

        return dom
    }
}

let imageDBBroken = false


class CommentMark extends MarkType {
    get attrs() {
        return {
            id: new Attribute()
        }
    }
    get inclusiveRight() {
        return false
    }
    get matchDOMTag() {
        return {"span.comment[data-id]": dom => ({
            id: dom.getAttribute("data-id")
        })}
    }
    toDOM(node) {
        return ['span', {class: 'comment', 'data-id': node.attrs.id}]
    }
}

export const fidusSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "title subtitle authors abstract keywords body"},
    title: {type: Title, content: "text*", group: "part"},
    subtitle: {type: Subtitle, content: "text*", group: "part"},
    authors: {type: Authors, content: "text*", group: "part"},
    abstract: {type: Abstract, content: "block+", group: "part"},
    keywords: {type: Keywords, content: "text*", group: "part"},
    body: {type: Body, content: "block+", group: "part"},

    paragraph: {type: Paragraph, content: "inline<_>*", group: "block"},
    blockquote: {type: BlockQuote, content: "block+", group: "block"},
    ordered_list: {type: OrderedList, content: "list_item+", group: "block"},
    bullet_list: {type: BulletList, content: "list_item+", group: "block"},
    list_item: {type: ListItem, content: "block+", group: "block"},
    horizontal_rule: {type: HorizontalRule, group: "block"},
    figure: {type: Figure, group: "block"},

    heading: {type: Heading, content: "inline<_>*", group: "block"},
    code_block: {type: CodeBlock, content: "text*", group: "block"},

    text: {type: Text, group: "inline"},
    hard_break: {type: HardBreak, group: "inline"},
    citation: {type: Citation, group: "inline"},
    equation: {type: Equation, group: "inline"},
    footnote: {type: Footnote, group: "inline"}

  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark,
    comment: CommentMark
  }
})

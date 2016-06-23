import {Schema, Block, Textblock, Inline, Text, MarkType, Attribute,
        Doc, BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror/dist/model"
import {katexRender} from "../katex/katex"

class Title extends Textblock {
    get matchDOMTag() {
        return {"div[id='document-title']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-title'}]
    }
}

class Subtitle extends Textblock {
    get matchDOMTag() {
        return {"div[id='metadata-subtitle']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-subtitle'}]
    }
}

class Authors extends Textblock {
    get matchDOMTag() {
        return {"div[id='metadata-authors']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-authors'}]
    }
}

class Abstract extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-abstract']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-abstract'}]
    }
}

class Keywords extends Textblock {
    get matchDOMTag() {
        return {"div[id='metadata-keywords']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-keywords'}]
    }
}

class Body extends Block {
    get matchDOMTag() {
        return {"div[id='document-contents']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-contents'}]
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
        return ["span", {
            class: 'footnote-marker',
            contents: node.attrs.contents
        }, '&nbsp;']
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
        })l}
    }
    toDOM(node) {
        return ["span", {
            class: 'equation',
            'data-equation': node.attrs.equation
        }]
    }
}

Equation.prototype.serializeDOM = (node, serializer) => {
    let dom = serializer.renderAs(node, "span", {
        class: 'equation',

    })
    katexRender(node.attrs.equation, dom, {throwOnError: false})
    dom.setAttribute('contenteditable', 'false')
    return dom
}

Equation.register("command", "insert", {
    derive: {
        params: [{
            label: "Equation",
            type: "text",
            attr: "equation"
        }]
    },
    label: "Insert equation",
    menu: {
        group: "insert",
        rank: 33,
        display: {
            type: "label",
            label: "Equation"
        }
    }
})


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
}

Figure.register("parseDOM", "figure", {
    parse: function(dom, state) {
        state.insert(this, {
            equation: dom.getAttribute('data-equation'),
            image: dom.getAttribute('data-image'),
            figureCategory: dom.getAttribute('data-figure-category'),
            caption: dom.getAttribute('data-caption'),
        })
    }
})

let imageDBBroken = false

Figure.prototype.serializeDOM = (node, serializer) => {
    let dom = serializer.elt("figure", {
        'data-equation': node.attrs.equation,
        'data-image': node.attrs.image,
        'data-figure-category': node.attrs.figureCategory,
        'data-caption': node.attrs.caption
    })
    if (node.attrs.image) {
        dom.appendChild(serializer.elt("div"))
        if(node.type.schema.cached.imageDB) {
            if(node.type.schema.cached.imageDB.db[node.attrs.image] &&
                node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                dom.firstChild.appendChild(serializer.elt("img", {
                    "src": node.type.schema.cached.imageDB.db[node.attrs.image].image
                }))
            } else {
                /* The image was not present in the imageDB -- possibly because a collaborator just added ut.
                Try to reload the imageDB, but only once. If the image cannot be found in the updated
                imageDB, do not attempt at reloading the imageDB if an image cannot be
                found. */
                if (!imageDBBroken) {
                    node.type.schema.cached.imageDB.getDB(function() {
                        if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                                node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                            dom.firstChild.appendChild(serializer.elt("img", {
                                "src": node.type.schema.cached.imageDB.db[node.attrs.image].image
                            }))
                        } else {
                            imageDBBroken = true
                        }
                    })
                }
            }
        }
    } else {
        let domEquation = serializer.elt("div", {
            class: 'figure-equation',
            'data-equation': node.attrs.equation
        })
        katexRender(node.attrs.equation, domEquation, {
            displayMode: true,
            throwOnError: false
        })
        dom.appendChild(domEquation)
    }
    let captionNode = serializer.elt("figcaption")
    if (node.attrs.figureCategory !== 'none') {
        let figureCatNode = serializer.elt("span", {
            class: 'figure-cat-' + node.attrs.figureCategory,
            'data-figure-category': node.attrs.figureCategory
        })
        figureCatNode.innerHTML = node.attrs.figureCategory
        captionNode.appendChild(figureCatNode)
    }
    if (node.attrs.caption !== '') {
        let captionTextNode = serializer.elt("span", {
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

Figure.register("command", "insert", {
    derive: {
        params: [{
            label: "Equation",
            attr: "equation"
        }, {
            label: "Image PK",
            attr: "image"
        }, {
            label: "Category",
            attr: "figureCategory"
        }, {
            label: "Caption",
            attr: "caption"
        }]
    },
    label: "Insert figure",
    menu: {
        group: "insert",
        rank: 32,
        display: {
            type: "label",
            label: "Figure"
        }
    }
})


class CommentMark extends MarkType {
    get attrs() {
        return {
            id: new Attribute()
        }
    }
    get inclusiveRight() {
        return false
    }
}


CommentMark.register("parseDOM", "span", {
    parse: function(dom, state) {
        if (!dom.classList.contains('comment')) return false
        let id = dom.getAttribute("data-id")
        if (!id) return false
        state.wrapMark(dom, this.create({
            id
        }))
    }
})

CommentMark.prototype.serializeDOM = (mark, serializer) => {
    return serializer.elt("span", {
        class: 'comment',
        'data-id': mark.attrs.id
    })
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

import {Schema, Block, Textblock, Inline, Text, MarkType, Attribute, NodeKind,
        Doc, BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror/dist/model"
import {katexRender} from "../katex/katex"

class Title extends Textblock {
}

Title.register("parseDOM", "div", {
    rank: 26,
    parse: function(dom, state) {
        let id = dom.id
        if (!id || id !== 'document-title') return false
        state.wrapIn(dom, this)
    }
})


Title.prototype.serializeDOM = (node, serializer) => serializer.renderAs(node, "div", {
    id: 'document-title'
})

class Subtitle extends Textblock {
}

Subtitle.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-subtitle') return false
        state.wrapIn(dom, this)
    }
})

Subtitle.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-subtitle'
    })

class Authors extends Textblock {
}

Authors.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-authors') return false
        state.wrapIn(dom, this)
    }
})

Authors.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-authors'
    })

class Abstract extends Block {
}

Abstract.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-abstract') return false
        state.wrapIn(dom, this)
    }
})

Abstract.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-abstract'
    })

class Keywords extends Textblock {
}

Keywords.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-keywords') return false
        state.wrapIn(dom, this)
    }
})

Keywords.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-keywords'
    })

class Body extends Block {
}

Body.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'document-contents') return false
        state.wrapIn(dom, this)
    }
})

Body.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'document-contents'
    })


class Footnote extends Inline {
    get attrs() {
        return {
            contents: new Attribute({
                default: ""
            }),
        }
    }
}

Footnote.register("parseDOM", "footnote", {
    parse: function(dom, state) {
        state.insert(this, {
            contents: dom.innerHTML
        })
    }
})

Footnote.register("parseDOM", "span", {
    parse: function(dom, state) {
        if (!dom.classList.contains('footnote-marker')) return false
        state.insert(this, {
            contents: dom.getAttribute('contents')
        })
    }
})

Footnote.prototype.serializeDOM = (node, serializer) => {
    let dom = serializer.elt("span", {
        class: 'footnote-marker',
        contents: node.attrs.contents
    })
    dom.innerHTML = '&nbsp;' // Needed to make editing work correctly.
    return dom
}

Footnote.register("command", "insert", {
    derive: {
        params: [{
            label: "Contents",
            attr: "contents"
        }, ]
    },
    label: "Insert footnote",
    menu: {
        group: "insert",
        rank: 34,
        display: {
            type: "label",
            label: "Footnote"
        }
    }
})

class FootnoteContainer extends Block {
}

FootnoteContainer.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (!dom.classList.contains('footnote-container')) return false
        state.wrapIn(dom, this)
    }
})

FootnoteContainer.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        class: 'footnote-container'
    })

class Citation extends Inline {
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
}

Citation.register("parseDOM", "span", {
    parse: function(dom, state) {
        if (!dom.classList.contains('citation')) return false
        state.insert(this, {
            bibFormat: dom.getAttribute('data-bib-format') || '',
            bibEntry: dom.getAttribute('data-bib-entry') || '',
            bibBefore: dom.getAttribute('data-bib-before') || '',
            bibPage: dom.getAttribute('data-bib-page') || ''
        })
    }
})

Citation.register("parseDOM", "cite", {
    parse: function(dom, state) {
        state.insert(this, {
            bibFormat: dom.getAttribute('data-bib-format') || '',
            bibEntry: dom.getAttribute('data-bib-entry') || '',
            bibBefore: dom.getAttribute('data-bib-before') || '',
            bibPage: dom.getAttribute('data-bib-page') || ''
        })
    }
})

Citation.prototype.serializeDOM = (node, serializer) => {
    return serializer.elt("span", {
        class: "citation",
        'data-bib-format': node.attrs.bibFormat,
        'data-bib-entry': node.attrs.bibEntry,
        'data-bib-before': node.attrs.bibBefore,
        'data-bib-page': node.attrs.bibPage
    })
    // TODO: Do the citation formatting here rather than centrally, maybe?
}

Citation.register("command", "insert", {
    derive: {
        params: [{
            label: "Bibliography Format",
            attr: "bibFormat"
        }, {
            label: "Bibliography Entry",
            attr: "bibEntry"
        }, {
            label: "Text Before",
            attr: "bibBefore"
        }, {
            label: "Page number",
            attr: "bibPage"
        }]
    },
    label: "Insert citation",
    menu: {
        group: "insert",
        rank: 42,
        display: {
            type: "label",
            label: "Citation"
        }
    }
})

class Equation extends Inline {
    get attrs() {
        return {
            equation: new Attribute({
                default: ""
            })
        }
    }
}


Equation.register("parseDOM", "span", {
    parse: function(dom, state) {
        if (!dom.classList.contains('equation')) return false
        state.insert(this, {
            equation: dom.getAttribute('data-equation')
        })
    }
})

Equation.prototype.serializeDOM = (node, serializer) => {
    let dom = serializer.renderAs(node, "span", {
        class: 'equation',
        'data-equation': node.attrs.equation
    })
    window.katexRender = katexRender
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


class Figure extends Block {
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
    static get rank() {
        return 54
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

    title: {type: Title, content: "text*"},
    subtitle: {type: Subtitle, content: "text*"},
    authors: {type: Authors, content: "text*"},
    abstract: {type: Abstract, content: "block+"},
    keywords: {type: Keywords, content: "text*"},
    body: {type: Body, content: "block+"},

    blockquote: {type: BlockQuote, content: "block+"},
    ordered_list: {type: OrderedList, content: "list_item+"},
    bullet_list: {type: BulletList, content: "list_item+"},
    list_item: {type: ListItem, content: "block+"},
    horizontal_rule: {type: HorizontalRule},
    figure: {type: Figure},

    paragraph: {type: Paragraph, content: "inline[_]*"},
    heading: {type: Heading, content: "inline[_]*"},
    code_block: {type: CodeBlock, content: "text*"},

    text: {type: Text},
    hard_break: {type: HardBreak},
    footnote: {type: Footnote},
    citation: {type: Citation},
    equation: {type: Equation}
  },

  groups: {
    block: ["paragraph", "blockquote", "ordered_list", "bullet_list", "heading", "code_block", "horizontal_rule", "figure"],
    inline: ["text", "hard_break", "footnote", "citation", "equation"]
  },

  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark,
    comment: CommentMark
  }
})

export const fidusFnSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "footnotecontainer*"},

    footnotecontainer: {type: Title, content: "block+"},

    blockquote: {type: BlockQuote, content: "block+"},
    ordered_list: {type: OrderedList, content: "list_item+"},
    bullet_list: {type: BulletList, content: "list_item+"},
    list_item: {type: ListItem, content: "block+"},
    horizontal_rule: {type: HorizontalRule},
    figure: {type: Figure},

    paragraph: {type: Paragraph, content: "inline[_]*"},
    heading: {type: Heading, content: "inline[_]*"},
    code_block: {type: CodeBlock, content: "text*"},

    text: {type: Text},
    hard_break: {type: HardBreak},
    citation: {type: Citation},
    equation: {type: Equation}
  },

  groups: {
    block: ["paragraph", "blockquote", "ordered_list", "bullet_list", "heading", "code_block", "horizontal_rule", "figure"],
    inline: ["text", "hard_break", "citation", "equation"]
  },

  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark
  }
})

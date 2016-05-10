import {Schema, defaultSchema, Block, Textblock, Inline, Attribute, MarkType, NodeKind} from "prosemirror/dist/model"
import {render as katexRender} from "katex"

/*export class Doc extends Block {
    get kind() {
        return null
    }
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
}*/

class Title extends Textblock {
    get contains() {
        return NodeKind.text
    }
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

class MetaDataSubtitle extends Textblock {
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
    get contains() {
        return NodeKind.text
    }
}

MetaDataSubtitle.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-subtitle') return false
        state.wrapIn(dom, this)
    }
})

MetaDataSubtitle.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-subtitle'
    })

class MetaDataAuthors extends Textblock {
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
    get contains() {
        return NodeKind.text
    }
}

MetaDataAuthors.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-authors') return false
        state.wrapIn(dom, this)
    }
})

MetaDataAuthors.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-authors'
    })

class MetaDataAbstract extends Block {
    //  get locked() { return true }
    get selectable() {
        return false
    }
}

MetaDataAbstract.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-abstract') return false
        state.wrapIn(dom, this)
    }
})

MetaDataAbstract.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-abstract'
    })

class MetaDataKeywords extends Textblock {
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
    get contains() {
        return NodeKind.text
    }
}

MetaDataKeywords.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'metadata-keywords') return false
        state.wrapIn(dom, this)
    }
})

MetaDataKeywords.prototype.serializeDOM = (node, serializer) =>
    serializer.renderAs(node, "div", {
        id: 'metadata-keywords'
    })

class DocumentContents extends Block {
    //  get locked() { return true }
    get selectable() {
        return false
    }
}

DocumentContents.register("parseDOM", "div", {
    parse: function(dom, state) {
        if (dom.id !== 'document-contents') return false
        state.wrapIn(dom, this)
    }
})

DocumentContents.prototype.serializeDOM = (node, serializer) =>
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
    get locked() {
        return true
    }
    get selectable() {
        return false
    }
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
            bibEntry: new Attribute,
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
    katexRender(node.attrs.equation, dom)
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
    get contains() {
        return null
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
            if(node.type.schema.cached.imageDB.db[node.attrs.image]
                && node.type.schema.cached.imageDB.db[node.attrs.image].image) {
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
                        if (node.type.schema.cached.imageDB.db[node.attrs.image]
                                && node.type.schema.cached.imageDB.db[node.attrs.image].image) {
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
            displayMode: true
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
            id: new Attribute
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
/*
const commentIcon = {
    type: "icon", // TODO: use real comment icon
    width: 951,
    height: 1024,
    path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
}

CommentMark.register("command", "set", {
    derive: {
        inverseSelect: true,
        params: [{
            label: "ID",
            attr: "id"
        }]
    },
    label: "Add comment",
    menu: {
        group: "inline",
        rank: 35,
        display: commentIcon
    }
})

CommentMark.register("command", "unset", {
    derive: true,
    label: "Remove comment",
    menu: {
        group: "inline",
        rank: 35,
        display: commentIcon
    },
    active() {
        return true
    }
})
*/
export const fidusSchema = new Schema(defaultSchema.spec.update({
    title: Title,
    metadatasubtitle: MetaDataSubtitle,
    metadataauthors: MetaDataAuthors,
    metadataabstract: MetaDataAbstract,
    metadatakeywords: MetaDataKeywords,
    documentcontents: DocumentContents,
    footnote: Footnote,
    citation: Citation,
    equation: Equation,
    figure: Figure
}, {
    comment: CommentMark
}))

export const fidusFnSchema = new Schema(defaultSchema.spec.update({
    title: Title,
    metadatasubtitle: MetaDataSubtitle,
    metadataauthors: MetaDataAuthors,
    metadataabstract: MetaDataAbstract,
    metadatakeywords: MetaDataKeywords,
    documentcontents: DocumentContents,
    footnotecontainer: FootnoteContainer,
    citation: Citation,
    equation: Equation,
    figure: Figure
}, {
    comment: CommentMark
}))

import {Block, Inline, Text, Attribute} from "prosemirror-old/dist/model"
import {elt} from "prosemirror-old/dist/util/dom"
import {katexRender} from "../katex/katex"

export class Citation extends Inline {
    get attrs() {
        return {
            format: new Attribute({
                default: ""
            }),
            references: new Attribute({
                default: []
            })
        }
    }
    get matchDOMTag() {
        return {
            "span.citation": dom => ({
                format: dom.getAttribute('data-format') || '',
                references: JSON.parse(dom.getAttribute('data-references') || '[]')
            })
        }
    }
    toDOM(node) {
        return ["span", {
            class: 'citation',
            'data-format': node.attrs.format,
            'data-references': JSON.stringify(node.attrs.references)
        }]
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

let imageDBBroken = false

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
        if (node.attrs.image!=='false') {
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

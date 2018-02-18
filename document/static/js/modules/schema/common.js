import {katexRender} from "../katex"

export let citation = {
    inline: true,
    group: "inline",
    attrs: {
        format: {
            default: 'autocite' // "autocite" or "textcite"
        },
        references: {
            default: [] // array of {id[, locator][, prefix]}
        }
    },
    parseDOM: [{
        tag: 'span.citation',
        getAttrs(dom) {
            return {
                format: dom.getAttribute('data-format') || '',
                references: JSON.parse(dom.getAttribute('data-references') || '[]')
            }
        }
    }],
    toDOM(node) {
        return ["span", {
            class: 'citation',
            'data-format': node.attrs.format,
            'data-references': JSON.stringify(node.attrs.references)
        }]
    }
}


export let equation = {
    inline: true,
    group: "inline",
    attrs: {
        equation: {
            default: ""
        }
    },
    parseDOM: [{
        tag: 'span.equation',
        getAttrs(dom) {
            return {
                equation: dom.getAttribute('data-equation')
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement('span')
        dom.setAttribute('data-equation', node.attrs.equation)
        dom.classList.add('equation')
        katexRender(node.attrs.equation, dom, {
            throwOnError: false
        })
        dom.setAttribute('contenteditable', 'false')
        return dom
    }
}

export function randomFigureId() {
    return 'F' + Math.round(Math.random()*10000000) + 1
}

let imageDBBroken = false

export let figure = {
    group: "block",
    attrs: {
        equation: {default: ""},
        image: {default: false},
        figureCategory: {default: ""},
        caption: {default: ""},
        id: {default: false}
    },
    parseDOM: [{
        tag: 'figure',
        getAttrs(dom) {
            let image = parseInt(dom.getAttribute('data-image'))
            return {
                equation: dom.getAttribute('data-equation'),
                image: isNaN(image) ? false : image,
                figureCategory: dom.getAttribute('data-figure-category'),
                caption: dom.getAttribute('data-caption'),
                id: dom.getAttribute('id')
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement('figure')
        dom.setAttribute('data-equation', node.attrs.equation)
        dom.setAttribute('data-image', node.attrs.image)
        dom.setAttribute('data-figure-category', node.attrs.figureCategory)
        dom.setAttribute('data-caption', node.attrs.caption)
        dom.setAttribute('id', node.attrs.id)
        if (node.attrs.image !== false) {
            dom.appendChild(document.createElement("div"))
            if (node.type.schema.cached.imageDB) {
                if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                    node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                    let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                    let img = document.createElement("img")
                    img.setAttribute('src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
                    dom.firstChild.appendChild(img)
                    dom.setAttribute('data-image-src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
                } else {
                    /* The image was not present in the imageDB -- possibly because a collaborator just added ut.
                    Try to reload the imageDB, but only once. If the image cannot be found in the updated
                    imageDB, do not attempt at reloading the imageDB if an image cannot be
                    found. */
                    if (!imageDBBroken) {
                        node.type.schema.cached.imageDB.getDB().then(() => {
                            if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                                node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                                let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                                let img = document.createElement("img")
                                img.setAttribute('src', imgSrc)
                                dom.firstChild.appendChild(img)
                                dom.setAttribute('data-image-src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
                            } else {
                                imageDBBroken = true
                            }
                        })
                    }
                }
            }
        } else {
            let domEquation = document.createElement('div')
            domEquation.classList.add('figure-equation')
            domEquation.setAttribute('data-equation', node.attrs.equation)

            katexRender(node.attrs.equation, domEquation, {
                displayMode: true,
                throwOnError: false
            })
            dom.appendChild(domEquation)
        }
        let captionNode = document.createElement("figcaption")
        if (node.attrs.figureCategory !== 'none') {
            let figureCatNode = document.createElement('span')
            figureCatNode.classList.add(`figure-cat-${node.attrs.figureCategory}`)
            figureCatNode.setAttribute('data-figure-category', node.attrs.figureCategory)
            figureCatNode.innerHTML = node.attrs.figureCategory
            captionNode.appendChild(figureCatNode)
        }
        if (node.attrs.caption !== '') {
            let captionTextNode = document.createElement("span")
            captionTextNode.setAttribute('data-caption', node.attrs.caption)
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

export let randomHeadingId = () => {
    return `H${Math.round(Math.random()*10000000) + 1}`
}

export let heading = {
    group: "block",
    content: "inline*",
    marks: "_",
    defining: true,
    attrs: {
        level: {
            default: 1
        },
        id: {
            default: false
        }
    },
    parseDOM: [{tag: "h1", getAttrs(dom) {return {level: 1, id: dom.getAttribute('id')}}},
               {tag: "h2", getAttrs(dom) {return {level: 2, id: dom.getAttribute('id')}}},
               {tag: "h3", getAttrs(dom) {return {level: 3, id: dom.getAttribute('id')}}},
               {tag: "h4", getAttrs(dom) {return {level: 4, id: dom.getAttribute('id')}}},
               {tag: "h5", getAttrs(dom) {return {level: 5, id: dom.getAttribute('id')}}},
               {tag: "h6", getAttrs(dom) {return {level: 6, id: dom.getAttribute('id')}}},],
    toDOM(node) { return [`h${node.attrs.level}`, {id: node.attrs.id}, 0] }
}

export let randomAnchorId = () => {
    return `A${Math.round(Math.random()*10000000) + 1}`
}

export let anchor = {
    attrs: {
        id: {
            default: false
        }
    },
    inclusive: false,
    group: "annotation",
    parseDOM: [{
        tag: "span.anchor[data-id]",
        getAttrs(dom) {
            return {
                id: dom.getAttribute("data-id")
            }
        }
    }],
    toDOM(node) {
        return ['span', {
            class: 'anchor',
            'data-id': node.attrs.id
        }]
    }
}

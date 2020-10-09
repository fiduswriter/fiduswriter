import {captionSchema, captionSerializer} from "../captions"
import {parseTracks} from "./track"

export function randomFigureId() {
    return 'F' + Math.round(Math.random() * 10000000) + 1
}


let imageDBBroken = false

export const figure = {
    group: "block",
    attrs: {
        equation: {default: ""},
        image: {default: false},
        category: {default: ""},
        caption: {default: []},
        id: {default: false},
        track: {default: []},
        aligned: {default: 'center'},
        width: {default: "100"}
    },
    parseDOM: [{
        tag: 'figure',
        getAttrs(dom) {
            const image = parseInt(dom.dataset.image)
            return {
                equation: dom.dataset.equation,
                image: isNaN(image) ? false : image,
                category: dom.dataset.category,
                caption: dom.dataset.caption,
                id: dom.id,
                track: parseTracks(dom.dataset.track),
                aligned: dom.dataset.aligned,
                width: dom.dataset.width,
                diff: dom.dataset.diff
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('figure')
        dom.dataset.equation = node.attrs.equation
        dom.dataset.image = node.attrs.image
        dom.dataset.category = node.attrs.category
        dom.dataset.caption = node.attrs.caption
        dom.id = node.attrs.id
        dom.dataset.aligned = node.attrs.aligned
        dom.dataset.width = node.attrs.width

        switch (node.attrs.aligned) {
        case 'right':
            dom.classList.add('aligned-right')
            break
        case 'left':
            dom.classList.add('aligned-left')
            break
        case 'center':
            dom.classList.add('aligned-center')
            break
        default:
            dom.classList.add('aligned-center')
        }

        switch (node.attrs.width) {
        case '100':
            dom.classList.add('image-width-100')
            break
        case '75':
            dom.classList.add('image-width-75')
            break
        case '50':
            dom.classList.add('image-width-50')
            break
        default:
            dom.classList.add('image-width-25')
        }

        if (node.attrs.track?.length) {
            dom.dataset.track = JSON.stringify(node.attrs.track)
        }
        if (node.attrs.image !== false) {
            dom.appendChild(document.createElement("div"))
            if (node.type.schema.cached.imageDB) {
                if (node.type.schema.cached.imageDB.db[node.attrs.image]?.image) {
                    const imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                    const img = document.createElement("img")
                    img.setAttribute('src', imgSrc)
                    dom.firstChild.appendChild(img)
                    dom.dataset.imageSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                } else {
                    /* The image was not present in the imageDB -- possibly because a collaborator just added ut.
                    Try to reload the imageDB, but only once. If the image cannot be found in the updated
                    imageDB, do not attempt at reloading the imageDB if an image cannot be
                    found. */
                    if (!imageDBBroken) {
                        node.type.schema.cached.imageDB.getDB().then(() => {
                            if (node.type.schema.cached.imageDB.db[node.attrs.image]?.image) {
                                const imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                                const img = document.createElement("img")
                                img.setAttribute('src', imgSrc)
                                dom.firstChild.appendChild(img)
                                dom.dataset.imageSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                            } else {
                                imageDBBroken = true
                            }
                        })
                    }
                }
            }
        } else {
            const domEquation = document.createElement('div')
            domEquation.classList.add('figure-equation')
            domEquation.setAttribute('data-equation', node.attrs.equation)
            import("mathlive").then(MathLive => {
                domEquation.innerHTML = MathLive.latexToMarkup(node.attrs.equation, 'displaystyle')
            })
            dom.appendChild(domEquation)
        }
        const captionNode = document.createElement("figcaption")
        if (node.attrs.category !== 'none') {
            const figureCatNode = document.createElement('span')
            figureCatNode.classList.add(`figure-cat-${node.attrs.category}`)
            figureCatNode.setAttribute('data-category', node.attrs.category)
            captionNode.appendChild(figureCatNode)
        }
        if (node.attrs.caption.length) {
            const captionTextNode = captionSerializer.serializeNode(captionSchema.nodeFromJSON({type: 'caption', content: node.attrs.caption}))
            captionNode.appendChild(captionTextNode)
        }
        // Add table captions above the table, other captions below.
        if (node.attrs.category === 'table') {
            dom.insertBefore(captionNode, dom.lastChild)
        } else {
            dom.appendChild(captionNode)
        }

        return dom
    }
}

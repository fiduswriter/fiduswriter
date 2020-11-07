import {parseTracks} from "./track"

export function randomFigureId() {
    return 'F' + Math.round(Math.random() * 10000000) + 1
}


let imageDBBroken = false

export const figure = {
    allowGapCursor: false,
    selectable: true,
    group: "block",
    attrs: {
        category: {default: "none"},
        caption: {default: false},
        id: {default: false},
        track: {default: []},
        aligned: {default: "center"},
        width: {default: "100"}
    },
    content: "figure_caption image|figure_caption figure_equation|image figure_caption|figure_equation figure_caption",
    parseDOM: [{
        tag: 'figure',
        getAttrs(dom) {
            return {
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
        dom.dataset.category = node.attrs.category

        return dom
    }
}


export const image = {
    attrs: {
        image: {default: false},
    },
    parseDOM: [{
        tag: 'img',
        getAttrs(dom) {
            const image = parseInt(dom.dataset.image)
            return {
                image: isNaN(image) ? false : image,
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('img')
        if (node.attrs.image !== false) {
            dom.dataset.image = node.attrs.image
            if (node.type.schema.cached.imageDB) {
                if (node.type.schema.cached.imageDB.db[node.attrs.image]?.image) {
                    const imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                    dom.setAttribute('src', imgSrc)
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
                                dom.setAttribute('src', imgSrc)
                                dom.dataset.imageSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                            } else {
                                imageDBBroken = true
                            }
                        })
                    }
                }
            }
        }
        return dom
    }
}

export const figure_equation = {
    selectable: false,
    draggable: false,
    attrs: {
        equation: {
            default: false
        }
    },
    parseDOM: [{
        tag: 'div.equation[data-equation]',
        getAttrs(dom) {
            return {
                equation: dom.dataset.equation
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('div')
        dom.dataset.equation = node.attrs.equation
        dom.classList.add('equation')
        if (node.attrs.equation !== false) {
            import("mathlive").then(MathLive => {
                dom.innerHTML = MathLive.latexToMarkup(node.attrs.equation, 'displaystyle')
            })
        }
        return dom
    }
}

export const figure_caption = {
    isolating: true,
    defining: true,
    content: "inline*",
    parseDOM: [{tag: "figcaption"}],
    toDOM() {
        return ["figcaption", 0]
    }
}

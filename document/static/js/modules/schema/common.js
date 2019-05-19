function parseReferences(str) {
    if (!str) {
        return []
    }
    let references
    try {
        references = JSON.parse(str)
    } catch (error) {
       return []
   }
   if (!Array.isArray(references)) {
       return []
   }
   return references.filter(
       ref => ref.hasOwnProperty('id') // ensure there is an id.
   ).map(
       ref => {
           const mRef = {id:ref.id}
           if (ref.locator) {
               mRef.locator = ref.locator
           }
           if (ref.prefix) {
               mRef.prefix = ref.prefix
           }
           return mRef
       }
   )
}

export const citation = {
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
                format: dom.dataset.format || '',
                references: parseReferences(dom.dataset.references)
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


export const equation = {
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
                equation: dom.dataset.equation
            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('span')
        dom.dataset.equation = node.attrs.equation
        dom.classList.add('equation')
        import("mathlive").then(MathLive => {
            dom.innerHTML = MathLive.latexToMarkup(node.attrs.equation, 'textstyle')
        })
        dom.setAttribute('contenteditable', 'false')
        return dom
    }
}

export function randomFigureId() {
    return 'F' + Math.round(Math.random()*10000000) + 1
}

export const FIG_CATS = {
    'none': gettext('None'),
    'figure': gettext('Figure'),
    'table': gettext('Table'),
    'photo': gettext('Photo')
}


export function parseTracks(str) {
    if (!str) {
        return []
    }
    let tracks
    try {
        tracks = JSON.parse(str)
    } catch (error) {
        return []
    }
    if (!Array.isArray(tracks)) {
        return []
    }
    return tracks.filter(track => // ensure required fields are present
        track.hasOwnProperty('user') &&
        track.hasOwnProperty('username') &&
        track.hasOwnProperty('date')
    )
}

function addTracks(node, attrs) {
    if (node.attrs.track && node.attrs.track.length) {
        attrs['data-track'] = JSON.stringify(node.attrs.track)
    }
}

let imageDBBroken = false

export const figure = {
    group: "block",
    attrs: {
        equation: {default: ""},
        image: {default: false},
        figureCategory: {default: ""},
        caption: {default: ""},
        id: {default: false},
        track: {default: []},
        aligned: {default: 'center'},
        width:{default:"100"},
        //height: {default:"50"},
    },
    parseDOM: [{
        tag: 'figure',
        getAttrs(dom) {
            const image = parseInt(dom.dataset.image)
            return {
                equation: dom.dataset.equation,
                image: isNaN(image) ? false : image,
                figureCategory: dom.dataset.figureCategory,
                caption: dom.dataset.caption,
                id: dom.dataset.id,
                track: parseTracks(dom.dataset.track),
                aligned: dom.dataset.aligned,
                width: dom.dataset.width,

            }
        }
    }],
    toDOM(node) {
        const dom = document.createElement('figure')
        dom.dataset.equation = node.attrs.equation
        dom.dataset.image = node.attrs.image
        dom.dataset.figureCategory = node.attrs.figureCategory
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

        if (node.attrs.track && node.attrs.track.length) {
            dom.dataset.track = JSON.stringify(node.attrs.track)
        }
        if (node.attrs.image !== false) {
            dom.appendChild(document.createElement("div"))
            if (node.type.schema.cached.imageDB) {
                if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                    node.type.schema.cached.imageDB.db[node.attrs.image].image) {
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
                            if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                                node.type.schema.cached.imageDB.db[node.attrs.image].image) {
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
        if (node.attrs.figureCategory !== 'none') {
            const figureCatNode = document.createElement('span')
            figureCatNode.classList.add(`figure-cat-${node.attrs.figureCategory}`)
            figureCatNode.setAttribute('data-figure-category', node.attrs.figureCategory)
            figureCatNode.innerHTML = FIG_CATS[node.attrs.figureCategory]
            captionNode.appendChild(figureCatNode)
        }
        if (node.attrs.caption !== '') {
            const captionTextNode = document.createElement("span")
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

export const randomHeadingId = () => {
    return `H${Math.round(Math.random()*10000000) + 1}`
}


const createHeading = level => ({
    group: "block heading",
    content: "inline*",
    marks: "_",
    defining: true,
    attrs: {
        id: {
            default: false
        },
        track: {
            default: []
        }
    },
    parseDOM: [
        {
            tag: `h${level}`,
            getAttrs(dom) {
                return {
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        }
    ],
    toDOM(node) {
        const attrs = {id: node.attrs.id}
        addTracks(node, attrs)
        return [`h${level}`, attrs, 0]
    }
})

export const heading1 = createHeading(1)
export const heading2 = createHeading(2)
export const heading3 = createHeading(3)
export const heading4 = createHeading(4)
export const heading5 = createHeading(5)
export const heading6 = createHeading(6)

export const comment = {
    attrs: {
        id: {}
    },
    inclusive: false,
    excludes: "",
    group: "annotation",
    parseDOM: [{
        tag: "span.comment[data-id]",
        getAttrs(dom) {
            return {
                id: parseInt(dom.dataset.id)
            }
        }
    }],
    toDOM(node) {
        return ['span', {
            class: 'comment',
            'data-id': node.attrs.id
        }]
    }
}

// Annotation tag is not used by the core Fidus Writer editor, but can be used by plugins that need to add annotation capability.
export const annotation_tag = {
    attrs: {
        type: {
            default: '' // Make this a string unique to your plugin so that you avoid handling tags of other plugins. For example 'rdfa' for an rdfa-tagging plugin.
        },
        key: {
            default: '' // key or variable/tag name
        },
        value: {
            default: '' // value of variable/tag
        }
    },
    inclusive: false,
    excludes: "", // allows several tags on the same content.
    group: "annotation",
    parseDOM: [{
        tag: "span.annotation-tag[data-type]",
        getAttrs(dom) {
            return {
                type: dom.dataset.type,
                key: dom.dataset.key ? dom.dataset.key : '',
                value: dom.dataset.value ? dom.dataset.value : ''
            }
        }
    }],
    toDOM(node) {
        const attrs = {
            class: 'annotation-tag',
            'data-type': node.attrs.type
        }
        if (node.attrs.key && node.attrs.key.length) {
            attrs['data-key'] = node.attrs.key
        }
        if (node.attrs.value && node.attrs.value.length) {
            attrs['data-value'] = node.attrs.value
        }
        return ['span', attrs]
    }
}

// :: NodeSpec A plain paragraph textblock. Represented in the DOM
  // as a `<p>` element.
export const paragraph = {
    group: "block",
    content: "inline*",
    attrs: {
        track: {
            default: []
        }
    },
    parseDOM: [{tag: "p", getAttrs(dom) {return {
        track: parseTracks(dom.dataset.track)
    }}}],
    toDOM(node) {
        const attrs = node.attrs.track && node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ['p', attrs, 0]
    }
}

// :: NodeSpec A blockquote (`<blockquote>`) wrapping one or more blocks.
export const blockquote = {
    content: "block+",
    group: "block",
    attrs: {
        track: {
            default: []
        }
    },
    marks: "annotation",
    defining: true,
    parseDOM: [{tag: "blockquote", getAttrs(dom) {return {
        track: parseTracks(dom.dataset.track)
    }}}],
    toDOM(node) {
        const attrs = node.attrs.track && node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ["blockquote", attrs, 0]
    }
}

// :: NodeSpec A horizontal rule (`<hr>`).
export const horizontal_rule = {
    group: "block",
    attrs: {
        track: {
            default: []
        }
    },
    parseDOM: [{tag: "hr", getAttrs(dom) {return {
        track: parseTracks(dom.dataset.track)
    }}}],
    toDOM(node) {
        const attrs = node.attrs.track && node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ["hr", attrs]
    }
}

export const randomAnchorId = () => {
    return `A${Math.round(Math.random()*10000000) + 1}`
}

export const anchor = {
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
                id: dom.dataset.id
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

// :: NodeSpec
// An ordered list [node spec](#model.NodeSpec). Has a single
// attribute, `order`, which determines the number at which the list
// starts counting, and defaults to 1. Represented as an `<ol>`
// element.
export const ordered_list = {
    group: "block",
    content: "list_item+",
    attrs: {
        order: {default: 1},
        track: {default: []}
    },
    parseDOM: [{tag: "ol", getAttrs(dom) {
        return {
            order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1,
            track: parseTracks(dom.dataset.track)
        }
    }}],
    toDOM(node) {
        const attrs = {}
        if (node.attrs.order !== 1) {
            attrs.start = node.attrs.order
        }
        addTracks(node, attrs)
        return ["ol", attrs, 0]
    }
}

// :: NodeSpec
// A bullet list node spec, represented in the DOM as `<ul>`.
export const bullet_list = {
    group: "block",
    content: "list_item+",
    attrs: {
        track: {default: []}
    },
    parseDOM: [{tag: "ul", getAttrs(dom) {
        return {
            track: parseTracks(dom.dataset.track)
        }
    }}],
    toDOM(node) {
        const attrs = {}
        addTracks(node, attrs)
        return ["ul", attrs, 0]
    }
}

// :: NodeSpec
// A list item (`<li>`) spec.
export const list_item = {
    content: "block+",
    marks: "annotation",
    attrs: {
        track: {default: []}
    },
    parseDOM: [{tag: "li", getAttrs(dom) {
        return {
            track: parseTracks(dom.dataset.track)
        }
    }}],
    toDOM(node) {
        const attrs = {}
        addTracks(node, attrs)
        return ["li", attrs, 0]
    },
    defining: true
}


export const underline = {
    parseDOM: [{tag: "span.underline"}],
    toDOM() {
        return ["span", {class: 'underline'}, 0]
    }
}

export const deletion = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ''
        },
        date: {
            default: 0
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.deletion",
            getAttrs(dom) {
                return {
                    user: parseInt(dom.dataset.user),
                    username: dom.dataset.username,
                    date: parseInt(dom.dataset.date)
                }
            }
        }
    ],
    toDOM(node) {
        return ['span', {
            class: `deletion user-${node.attrs.user}`,
            'data-user': node.attrs.user,
            'data-username': node.attrs.username,
            'data-date': node.attrs.date
        }]
    }
}

function parseFormatList(str) {
    if (!str) {
        return []
    }
    let formatList
    try {
        formatList = JSON.parse(str)
    } catch (error) {
       return []
   }
   if (!Array.isArray(formatList)) {
       return []
   }
   return formatList.filter(format => typeof(format)==='string') // ensure there are only strings in list
}

export const format_change = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ''
        },
        date: {
            default: 0
        },
        before: {
            default: []
        },
        after: {
            default: []
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.format-change",
            getAttrs(dom) {
                return {
                    user: parseInt(dom.dataset.user),
                    username: dom.dataset.username,
                    date: parseInt(dom.dataset.date),
                    before: parseFormatList(dom.dataset.before),
                    after: parseFormatList(dom.dataset.after)
                }
            }
        }
    ],
    toDOM(node) {
        return ['span', {
            class: `format-change user-${node.attrs.user}`,
            'data-user': node.attrs.user,
            'data-username': node.attrs.username,
            'data-date': node.attrs.date,
            'data-before': JSON.stringify(node.attrs.before),
            'data-after': JSON.stringify(node.attrs.after)
        }]
    }
}

export const insertion = {
    attrs: {
        user: {
            default: 0
        },
        username: {
            default: ''
        },
        date: {
            default: 0
        },
        approved: {
            default: true
        }
    },
    inclusive: false,
    group: "track",
    parseDOM: [
        {
            tag: "span.insertion",
            getAttrs(dom) {
                return {
                    user: parseInt(dom.dataset.user),
                    username: dom.dataset.username,
                    date: parseInt(dom.dataset.date),
                    inline: true,
                    approved: false
                }
            }
        },
        {
            tag: "span.approved-insertion",
            getAttrs(dom) {
                return {
                    user: parseInt(dom.dataset.user),
                    username: dom.dataset.username,
                    date: parseInt(dom.dataset.date),
                    inline: true,
                    approved: true
                }
            }
        }
    ],
    toDOM(node) {
        return ['span', {
            class: node.attrs.approved ? 'approved-insertion' : `insertion user-${node.attrs.user}`,
            'data-user': node.attrs.user,
            'data-username': node.attrs.username,
            'data-date': node.attrs.date
        }]
    }
}

import {katexRender} from "../katex"

function parseReferences(str) {
    if (!str) {
        return []
    }
    let references
    try {
        references = JSON.parse(str)
    } catch(error) {
       return []
   }
   if (!Array.isArray(references)) {
       return []
   }
   return references.filter(
       ref => ref.hasOwnProperty('id') // ensure there is an id.
   ).map(
       ref => {
           let mRef = {id:ref.id}
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
                format: dom.dataset.format || '',
                references: parseReferences(dom.dataset.references)
            }
        }
    }],
    toDOM(node) {
        let bibDB = node.type.schema.cached.bibDB,
            bibs = {}
            node.attrs.references.forEach(ref => bibs[ref.id] = bibDB.db[ref.id])
        return ["span", {
            class: 'citation',
            'data-format': node.attrs.format,
            'data-references': JSON.stringify(node.attrs.references),
            'data-bibs': JSON.stringify(bibs)
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
                equation: dom.dataset.equation
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement('span')
        dom.dataset.equation = node.attrs.equation
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

export function parseTracks(str) {
    if (!str) {
        return []
    }
    let tracks
    try {
        tracks = JSON.parse(str)
    } catch(error) {
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

let imageDBBroken = false

export let figure = {
    group: "block",
    attrs: {
        equation: {default: ""},
        image: {default: false},
        figureCategory: {default: ""},
        caption: {default: ""},
        id: {default: false},
        track: {default: []}
    },
    parseDOM: [{
        tag: 'figure',
        getAttrs(dom) {
            let image = parseInt(dom.dataset.image)
            return {
                equation: dom.dataset.equation,
                image: isNaN(image) ? false : image,
                figureCategory: dom.dataset.figureCategory,
                caption: dom.dataset.caption,
                id: dom.dataset.id,
                track: parseTracks(dom.dataset.track)
            }
        }
    }],
    toDOM(node) {
        let dom = document.createElement('figure')
        dom.dataset.equation = node.attrs.equation
        dom.dataset.image = node.attrs.image
        dom.dataset.figureCategory = node.attrs.figureCategory
        dom.dataset.caption = node.attrs.caption
        dom.id = node.attrs.id
        if(node.attrs.track.length) {
            dom.dataset.track = JSON.stringify(node.attrs.track)
        }
        if (node.attrs.image !== false) {
            dom.appendChild(document.createElement("div"))
            if (node.type.schema.cached.imageDB) {
                if (node.type.schema.cached.imageDB.db[node.attrs.image] &&
                    node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                    let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                    let img = document.createElement("img")
                    img.setAttribute('src', node.type.schema.cached.imageDB.db[node.attrs.image].image)
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
                                let imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                                let img = document.createElement("img")
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
        },
        track: {
            default: []
        }
    },
    parseDOM: [
        {
            tag: "h1",
            getAttrs(dom) {
                return {
                    level: 1,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        },
        {
            tag: "h2",
            getAttrs(dom) {
                return {
                    level: 2,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
             }
        },
        {
            tag: "h3",
            getAttrs(dom) {
                return {
                    level: 3,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        },
        {
            tag: "h4",
            getAttrs(dom) {
                return {
                    level: 4,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        },
        {
            tag: "h5",
            getAttrs(dom) {
                return {
                    level: 5,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        },
        {
            tag: "h6",
            getAttrs(dom) {
                return {
                    level: 6,
                    id: dom.id,
                    track: parseTracks(dom.dataset.track)
                }
            }
        }
    ],
    toDOM(node) {
        let attrs = {id: node.attrs.id}
        if (node.attrs.track.length) {
            attrs['data-track'] = JSON.stringify(node.attrs.track)
        }
        return [`h${node.attrs.level}`, attrs, 0]
    }
}

export let comment = {
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
export let annotation_tag = {
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
        let attrs = {
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
export let paragraph = {
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
        let attrs = node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ['p', attrs, 0]
    }
}

// :: NodeSpec A blockquote (`<blockquote>`) wrapping one or more blocks.
export let blockquote = {
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
        let attrs = node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ["blockquote", attrs, 0]
    }
}

// :: NodeSpec A horizontal rule (`<hr>`).
export let horizontal_rule = {
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
        let attrs = node.attrs.track.length ? {'data-track': JSON.stringify(node.attrs.track)} : {}
        return ["hr", attrs]
    }
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
        let attrs = {}
        if (node.attrs.order !== 1) {
            attrs.start = node.attrs.order
        }
        if (node.attrs.track.length) {
            attrs['data-track'] = JSON.stringify(node.attrs.track)
        }
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
        let attrs = {}
        if (node.attrs.track.length) {
            attrs['data-track'] = JSON.stringify(node.attrs.track)
        }
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
        let attrs = {}
        if (node.attrs.track.length) {
            attrs['data-track'] = JSON.stringify(node.attrs.track)
        }
        return ["li", attrs, 0]
    },
    defining: true
}

export let deletion = {
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
    } catch(error) {
       return []
   }
   if (!Array.isArray(formatList)) {
       return []
   }
   return formatList.filter(format => typeof(format)==='string') // ensure there are only strings in list
}

export let format_change = {
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

export let insertion = {
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

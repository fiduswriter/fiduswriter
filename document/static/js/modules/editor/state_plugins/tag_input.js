import {Schema} from "prosemirror-model"
import {EditorState, Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"


const key = new PluginKey('tagInput')

const doc = {content: 'tag'},
    tag = {
        content: 'inline*',
        parseDOM: [{tag: 'div.tag-input-editor'}],
        toDOM() {
            return ["div", {
                class: 'tag-input-editor'
            }, 0]
        }
    },
    text = {group: 'inline'}

const schema = new Schema({
    nodes: {doc, tag, text},
    marks: {}
})


const placeholderPlugin = function(nodeTitle) {
    return new Plugin({
        props: {
            decorations: (state) => {
                const doc = state.doc
                if (
                    doc.childCount === 1 &&
                    doc.firstChild.isTextblock &&
                    doc.firstChild.content.size === 0
                ) {
                    const placeHolder = document.createElement('span')
                    placeHolder.classList.add('placeholder')
                    // There is only one field, so we know the selection is there
                    placeHolder.classList.add('selected')
                    placeHolder.setAttribute('data-placeholder', `${nodeTitle}...`)
                    return DecorationSet.create(doc, [Decoration.widget(1, placeHolder)])
                }
            }
        }
    })
}

const pastePlugin = view => {

    const submitTags = tags => {
        const eState = view.state,
            {decos} = key.getState(eState),
            deco = decos.find()[0],
            pos = deco.from,
            nodes = tags.map(tag => eState.schema.nodes.tag.create({tag}))
        view.dispatch(
            view.state.tr.insert(pos, nodes)
        )
    }


    return new Plugin({
        props: {
            transformPastedHTML: inHTML => {
                const dom = document.createElement('div')
                dom.innerHTML = inHTML
                const tags = dom.innerText.split(/[,;]+/).filter(tag => tag.length)
                if (tags.length) {
                    const lastTag = tags.pop()
                    submitTags(tags)
                    return lastTag
                } else {
                    return inHTML
                }
            },
            transformPastedText: inText => {
                const tags = inText.split(/[,;]+/).filter(tag => tag.length)
                if (tags.length) {
                    const lastTag = tags.pop()
                    submitTags(tags)
                    return lastTag
                } else {
                    return inText
                }
            }
        }
    })
}

const submitTag = (tagState, dispatch, tagInputView, view, getPos) => {
    const tag = tagState.doc.textContent
    if (tag.length) {
        const eState = view.state,
            startPos = getPos(),
            pos = startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
            node = eState.schema.nodes.tag.create({tag})
        view.dispatch(
            view.state.tr.insert(pos, node)
        )
        tagInputView.dispatch(
            tagState.tr.delete(1, tagState.doc.nodeSize - 3)
        )
    }
    return true
}


const createTagInputEditor = (view, getPos, node) => {
    const dom = document.createElement('div')
    dom.classList.add('tag-input')
    dom.setAttribute('contenteditable', false)
    console.log({node})
    const tagInputView = new EditorView(dom, {
        state: EditorState.create({
            schema,
            doc: schema.nodeFromJSON({
                type: 'doc',
                content:[{
                    type: 'tag',
                    content: []
                }]
            }),
            plugins: [
                history(),
                placeholderPlugin(node.type.spec.title),
                pastePlugin(view),
                keymap({
                    "Mod-z": undo,
                    "Mod-shift-z": undo,
                    "Mod-y": redo,
                    "Enter": (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos),
                    ",": (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos),
                    ";": (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos)
                })
            ]
        }),
        handleDOMEvents: {
            blur: (tagInputView, event) => {
                event.preventDefault()
                // Set a timeout so that change of focus can take place first
                window.setTimeout(() => {
                    submitTag(tagInputView.state, undefined, tagInputView, view, getPos)
                }, 1)
            },
            focus: (tagInputView, event) => {
                tagInputView.focus()
            }
        },
        dispatchTransaction: tr => {
            const newState = tagInputView.state.apply(tr)
            tagInputView.updateState(newState)
        }
    })
    return [dom, tagInputView]
}

class TagsView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.classList.add(`article-${this.node.type.name}`)
        this.node.type.groups.forEach(group => this.dom.classList.add(`article-${group}`))
        const [tagInputDOM, tagInputView] = createTagInputEditor(view, getPos, node)
        this.tagInputView = tagInputView
        this.contentDOM = document.createElement('span')
        this.contentDOM.classList.add('tags-inner')
        this.dom.appendChild(this.contentDOM)
        this.dom.appendChild(tagInputDOM)
    }

    stopEvent(event) {
        if (
            event.type==='keydown' &&
            event.key==='ArrowRight' &&
            this.tagInputView.state.selection.from ===
                this.tagInputView.state.doc.nodeSize-3
        ) {
            this.view.focus()
            const startPos = this.getPos(),
                pos = startPos + this.view.state.doc.nodeAt(startPos).nodeSize,
                $pos = this.view.state.doc.resolve(pos)
            this.view.dispatch(
                this.view.state.tr.setSelection(new TextSelection($pos))
            )
            return false
        } else if (
            event.type==='keydown' &&
            event.key==='ArrowLeft' &&
            this.tagInputView.state.selection.to === 1
        ) {
            this.view.focus()
            const startPos = this.getPos(),
                pos = startPos + this.view.state.doc.nodeAt(startPos).nodeSize - 1,
                $pos = this.view.state.doc.resolve(pos)
            this.view.dispatch(
                this.view.state.tr.setSelection(new TextSelection($pos))
            )
            return false
        }
        return true
    }

    ignoreMutation(record) {
        return true
    }


}

export const tagInputPlugin = function(options) {

    return new Plugin({
        key,
        state: {
            init(config, state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    const tagsNodeNames = Object.values(state.schema.nodes).filter(
                        node => node.groups.includes('tags')
                    ).map(node => node.name)
                    tagsNodeNames.forEach(
                        nodeName => this.spec.props.nodeViews[nodeName] =
                            (node, view, getPos) => new TagsView(node, view, getPos)
                    )
                }
                return {}
            },
            apply(tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })
}

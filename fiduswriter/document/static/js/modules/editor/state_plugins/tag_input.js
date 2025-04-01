import {GapCursor} from "prosemirror-gapcursor"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {Schema} from "prosemirror-model"
import {EditorState, Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet, EditorView} from "prosemirror-view"

import {addDeletedPartWidget} from "./document_template"

const key = new PluginKey("tagInput")

const doc = {content: "tag"},
    tag = {
        content: "inline*",
        parseDOM: [{tag: "div.tag-input-editor"}],
        toDOM() {
            return [
                "div",
                {
                    class: "tag-input-editor"
                },
                0
            ]
        }
    },
    text = {group: "inline"}

const schema = new Schema({
    nodes: {doc, tag, text},
    marks: {}
})

const placeholderPlugin = nodeTitle =>
    new Plugin({
        props: {
            decorations: state => {
                const doc = state.doc
                if (
                    doc.childCount === 1 &&
                    doc.firstChild.isTextblock &&
                    doc.firstChild.content.size === 0
                ) {
                    const placeHolder = document.createElement("span")
                    placeHolder.classList.add("placeholder")
                    // There is only one field, so we know the selection is there
                    placeHolder.classList.add("selected")
                    placeHolder.setAttribute(
                        "data-placeholder",
                        `${gettext("Add")} ${nodeTitle.toLowerCase()}...`
                    )
                    return DecorationSet.create(doc, [
                        Decoration.widget(1, placeHolder)
                    ])
                }
            }
        }
    })

const pastePlugin = view => {
    const submitTags = tags => {
        const eState = view.state,
            pos = view.state.selection.from || view.state.doc.nodeSize - 1,
            nodes = tags.map(tag => eState.schema.nodes.tag.create({tag}))
        view.dispatch(view.state.tr.insert(pos, nodes))
    }

    return new Plugin({
        props: {
            transformPastedHTML: (inHTML, _view) => {
                const dom = document.createElement("div")
                dom.innerHTML = inHTML
                const tags = dom.innerText
                    .split(/[,;]+/)
                    .filter(tag => tag.length)
                if (tags.length) {
                    const lastTag = tags.pop()
                    submitTags(tags)
                    return lastTag
                } else {
                    return inHTML
                }
            },
            transformPastedText: (inText, _view) => {
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

const submitTag = (tagState, _dispatch, tagInputView, view, getPos) => {
    const tag = tagState.doc.textContent
    if (tag.length) {
        const eState = view.state,
            startPos = getPos(),
            pos = startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
            node = eState.schema.nodes.tag.create({tag})
        view.dispatch(view.state.tr.insert(pos, node))
        tagInputView.dispatch(tagState.tr.delete(1, tagState.doc.nodeSize - 3))
    }
    return true
}

const createTagInputEditor = (view, getPos, node) => {
    const dom = document.createElement("div")
    dom.classList.add("tag-input")
    dom.setAttribute("contenteditable", false)
    const tagInputView = new EditorView(dom, {
        state: EditorState.create({
            schema,
            doc: schema.nodeFromJSON({
                type: "doc",
                content: [
                    {
                        type: "tag",
                        content: []
                    }
                ]
            }),
            plugins: [
                history(),
                placeholderPlugin(node.attrs.item_title),
                pastePlugin(view),
                keymap({
                    "Mod-z": undo,
                    "Mod-shift-z": undo,
                    "Mod-y": redo,
                    Enter: (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos),
                    ",": (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos),
                    ";": (state, dispatch, tagInputView) =>
                        submitTag(state, dispatch, tagInputView, view, getPos),
                    ArrowUp: (_state, _dispatch, _tagInputView) => {
                        let validTextSelection = false,
                            validGapCursor = false,
                            newPos = getPos(),
                            $pos
                        while (!validGapCursor && !validTextSelection) {
                            newPos -= 1
                            if (newPos === 0) {
                                // Could not find any valid position
                                return
                            }
                            $pos = view.state.doc.resolve(newPos)
                            validTextSelection = $pos.parent.inlineContent
                            validGapCursor = GapCursor.valid($pos)
                        }
                        const selection = validTextSelection
                            ? new TextSelection($pos)
                            : new GapCursor($pos)
                        const tr = view.state.tr.setSelection(selection)
                        view.dispatch(tr)
                    },
                    ArrowDown: (_state, _dispatch, _tagInputView) => {
                        let validTextSelection = false,
                            validGapCursor = false,
                            newPos = getPos() + node.nodeSize,
                            $pos
                        const docSize = view.state.doc.nodeSize
                        while (!validGapCursor && !validTextSelection) {
                            newPos += 1
                            if (newPos === docSize) {
                                // Could not find any valid position
                                return
                            }
                            $pos = view.state.doc.resolve(newPos)
                            validTextSelection = $pos.parent.inlineContent
                            validGapCursor = GapCursor.valid($pos)
                        }
                        const selection = validTextSelection
                            ? new TextSelection($pos)
                            : new GapCursor($pos)
                        const tr = view.state.tr.setSelection(selection)
                        view.dispatch(tr)
                    }
                })
            ]
        }),
        handleDOMEvents: {
            blur: (tagInputView, event) => {
                event.preventDefault()
                // Set a timeout so that change of focus can take place first
                window.setTimeout(() => {
                    submitTag(
                        tagInputView.state,
                        undefined,
                        tagInputView,
                        view,
                        getPos
                    )
                }, 1)
            },
            focus: (tagInputView, _event) => {
                const startPos = getPos(),
                    pos =
                        startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
                    $pos = view.state.doc.resolve(pos)
                view.dispatch(
                    view.state.tr.setSelection(new TextSelection($pos))
                )
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

export class TagsPartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${this.node.attrs.id}`)
        this.dom.contentEditable = false
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }

        this.contentDOM = document.createElement("span")
        this.contentDOM.classList.add("tags-inner")
        this.dom.appendChild(this.contentDOM)
        if (node.attrs.locking !== "fixed") {
            const [tagInputDOM, tagInputView] = createTagInputEditor(
                view,
                getPos,
                node
            )
            this.tagInputView = tagInputView
            this.dom.appendChild(tagInputDOM)
        }

        if (node.attrs.deleted) {
            addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    stopEvent(event) {
        if (["click", "mousedown"].includes(event.type)) {
            return false
        } else if (!this.tagInputView || this.node.attrs.locking === "fixed") {
            return false
        } else if (
            event.type === "keydown" &&
            event.key === "ArrowRight" &&
            this.tagInputView.state.selection.from ===
                this.tagInputView.state.doc.nodeSize - 3
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
            event.type === "keydown" &&
            event.key === "ArrowLeft" &&
            this.tagInputView.state.selection.to === 1
        ) {
            this.view.focus()
            const startPos = this.getPos(),
                pos =
                    startPos +
                    this.view.state.doc.nodeAt(startPos).nodeSize -
                    1,
                $pos = this.view.state.doc.resolve(pos)
            this.view.dispatch(
                this.view.state.tr.setSelection(new TextSelection($pos))
            )
            return false
        }
        return true
    }

    ignoreMutation(_record) {
        return true
    }
}

export const tagInputPlugin = options =>
    new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === "write") {
                    this.spec.props.nodeViews["tags_part"] = (
                        node,
                        view,
                        getPos
                    ) => new TagsPartView(node, view, getPos)
                }

                return {}
            },
            apply(_tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })

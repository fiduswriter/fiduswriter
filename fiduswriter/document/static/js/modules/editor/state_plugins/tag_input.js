import {GapCursor} from "prosemirror-gapcursor"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {Schema} from "prosemirror-model"
import {
    EditorState,
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"
import {ReplaceStep} from "prosemirror-transform"
import {Decoration, DecorationSet, EditorView} from "prosemirror-view"

import {tags_part} from "../../schema/document/structure"
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
    const selectionTo = tagState.selection.to
    const tag = tagState.doc.textBetween(0, selectionTo)
    if (tag.length) {
        const eState = view.state,
            startPos = getPos(),
            pos = startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
            node = eState.schema.nodes.tag.create({tag})
        view.dispatch(view.state.tr.insert(pos, node))
        tagInputView.dispatch(tagState.tr.delete(1, selectionTo))
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
        handleTextInput: (_view, _from, _to, text) => {
            if ([",", ".", ";"].includes(text)) {
                submitTag(
                    tagInputView.state,
                    undefined,
                    tagInputView,
                    view,
                    getPos
                )
                return true
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
        console.log("stopEvent start", {event})
        if (["click", "mousedown"].includes(event.type)) {
            return false
        } else if (!this.tagInputView || this.node.attrs.locking === "fixed") {
            return false
        } else if (
            event.type !== "keydown" ||
            !this.tagInputView.hasFocus() ||
            !["ArrowRight", "ArrowLeft"].includes(event.key)
        ) {
            // Not event keydown ArrowRight or ArrowLeft
            console.log("not responsible", {
                focus: this.tagInputView.hasFocus(),
                state: this.tagInputView.state
            })
            return false
        }
        console.log("handle with stopEvent")

        if (
            event.key === "ArrowRight" &&
            this.tagInputView.state.selection.from ===
                this.tagInputView.state.doc.nodeSize - 3
        ) {
            const startPos = this.getPos(),
                pos = startPos + this.node.nodeSize

            const {newPos, $newPos, selectionType} = findValidCaretPosition(
                this.view.state,
                pos,
                1
            )

            if (!newPos) {
                return false
            }
            this.view.focus()
            let newSelection
            if (selectionType === "gap") {
                newSelection = GapCursor($newPos)
            } else {
                newSelection = TextSelection.create(
                    this.view.state.doc,
                    newPos,
                    newPos
                )
            }
            this.view.dispatch(this.view.state.tr.setSelection(newSelection))
            event.preventDefault()
            event.stopPropagation()
            return true
        } else if (
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
            event.preventDefault()
            event.stopPropagation()
            return true
        }
        return false
    }

    ignoreMutation(_record) {
        return true
    }
}

const findValidCaretPosition = (state, pos, dir) => {
    let selectionType
    let newPos = pos
    let $newPos
    while (!selectionType) {
        newPos += dir
        if (newPos === 0 || newPos === state.doc.nodeSize) {
            // Could not find any valid position
            break
        }
        $newPos = state.doc.resolve(newPos)
        if ($newPos.parent.inlineContent) {
            selectionType = "text"
        } else if (GapCursor.valid($newPos)) {
            selectionType = "gap"
        }
    }
    return {newPos, $newPos, selectionType}
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
            nodeViews: {},
            // Handle keyboard selection between tags
            handleKeyDown(view, event) {
                console.log("handleKeyDown start")
                if (
                    !["ArrowLeft", "ArrowRight"].includes(event.key) ||
                    !view.hasFocus()
                ) {
                    return false
                }

                console.log("handle with handleKeyDown")

                const $pos = view.state.selection.$from,
                    pos = view.state.selection.from
                let position, newPos, $newPos

                if ($pos.parent.type.name === "tags_part") {
                    position = "in"
                } else if (
                    (event.key === "ArrowRight" && $pos.nodeAfter) ||
                    (event.key === "ArrowLeft" && $pos.nodeBefore)
                ) {
                    return
                } else {
                    const dir = event.key === "ArrowRight" ? 1 : -1
                    const foundCaretPos = findValidCaretPosition(
                        view.state,
                        pos,
                        dir
                    )
                    $newPos = foundCaretPos.$newPos
                    if ($newPos?.parent.type.name === "tags_part") {
                        position =
                            event.key === "ArrowRight" ? "before" : "after"
                        newPos = foundCaretPos.newPos
                    }
                }
                if (!position) {
                    // Caret is somewhere else than near a tags_part.
                    return false
                }
                if (event.key === "ArrowRight") {
                    // Moving right

                    // If we're inside the tags part between tags
                    if (position === "in") {
                        // Check if there are any tags after the current position
                        const offset = $pos.parentOffset

                        const tagsPartNode = $pos.parent

                        if (tagsPartNode.childCount > offset + 1) {
                            const tr = view.state.tr.setSelection(
                                NodeSelection.create(view.state.doc, pos + 1)
                            )
                            view.dispatch(tr)

                            return true
                        } else {
                            // No more tags, move to the tag input field
                            // Find the NodeView for this tags_part
                            const {node} = view.domAtPos(pos + 1)
                            const tagInput =
                                node.nextElementSibling?.querySelector(
                                    ".ProseMirror"
                                )
                            if (tagInput) {
                                tagInput.focus()
                                return true
                            }
                        }
                    } else {
                        // We're before the tags part, move to the first tag or input
                        const tagsPartNode = $newPos.parent

                        if (tagsPartNode.childCount > 0) {
                            const tr = view.state.tr.setSelection(
                                NodeSelection.create(view.state.doc, newPos)
                            )
                            view.dispatch(tr)
                            return true
                        } else {
                            // No tags yet, focus the input field
                            // Find the NodeView for this tags_part
                            const {node} = view.domAtPos(newPos + 1)
                            const tagInput =
                                node.nextElementSibling?.querySelector(
                                    ".ProseMirror"
                                )
                            if (tagInput) {
                                tagInput.focus()
                                return true
                            }
                        }
                    }
                } else {
                    // Moving left

                    // If we're inside the tags part between tags
                    if (position === "in") {
                        // Check if there are any tags after the current position
                        const offset = $pos.parentOffset

                        //const tagsPartNode = $pos.parent

                        if (offset > 0) {
                            const tr = view.state.tr.setSelection(
                                NodeSelection.create(view.state.doc, pos - 1)
                            )
                            view.dispatch(tr)
                            return true
                        } else {
                            // No more tags, move to the last previous viable caret position
                            const {newPos, $newPos, selectionType} =
                                findValidCaretPosition(view.state, pos, -1)
                            if (!newPos) {
                                return false
                            }
                            let newSelection
                            if (selectionType === "gap") {
                                newSelection = new GapCursor($newPos)
                            } else {
                                // text selection
                                newSelection = TextSelection.create(
                                    view.state.doc,
                                    newPos,
                                    newPos
                                )
                            }
                            const tr = view.state.tr.setSelection(newSelection)
                            view.dispatch(tr)
                            return true
                        }
                    } else {
                        // We're after the tags part, move to tag input field or alternatively last tag

                        // Find the NodeView for this tags_part
                        const {node} = view.domAtPos(newPos)
                        const tagInput =
                            node.nextElementSibling?.querySelector(
                                ".ProseMirror"
                            )
                        if (tagInput) {
                            tagInput.focus()
                            return true
                        }

                        const tagsPartNode = $newPos.parent

                        if (tagsPartNode.childCount > 0) {
                            const tr = view.state.tr.setSelection(
                                NodeSelection.create(view.state.doc, newPos - 1)
                            )
                            view.dispatch(tr)
                            return true
                        }
                    }
                }
                return false
            }
        },
        appendTransaction: (trs, _oldState, state) => {
            console.log("appendTransaction start")
            // If selection is not collapsed, don't do anything
            if (state.selection.from !== state.selection.to) {
                return
            }

            const selectionSet = trs.find(tr => tr.selectionSet)
            if (selectionSet) {
                console.log("handle with appendTransaction")
                const $from = state.selection.$from

                // Check if we're inside a tags_part
                if ($from.parent.type.name === "tags_part") {
                    if ($from.nodeAfter) {
                        return state.tr.setSelection(
                            NodeSelection.create(
                                state.doc,
                                state.selection.from
                            )
                        )
                    } else if ($from.nodeBefore) {
                        return state.tr.setSelection(
                            NodeSelection.create(
                                state.doc,
                                state.selection.from - 1
                            )
                        )
                    }
                }
            }
            return
        }
    })

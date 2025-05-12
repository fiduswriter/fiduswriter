import {GapCursor} from "prosemirror-gapcursor"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {Schema} from "prosemirror-model"
import {NodeSelection, TextSelection} from "prosemirror-state"
import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"

import {findValidCaretPosition, submitTag} from "./helpers"
import {pastePlugin, placeholderPlugin} from "./tag_editor_plugins"

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

const ArrowLeft = (state, dispatch, getNode, view, getPos) => {
    // If we're at the leftmost position (position 1), stopEvent will handle moving out of the tag
    if (state.selection.to > 1) {
        // Inside the tag input, move caret left normally
        const tr = state.tr.setSelection(
            TextSelection.create(
                state.doc,
                state.selection.from - 1,
                state.selection.to - 1
            )
        )
        dispatch(tr)
        return true
    } else {
        const node = getNode()
        // Exit tag input to the left
        view.focus()
        if (node.nodeSize > 2) {
            // At least one tag
            const startPos = getPos() + node.nodeSize - 2
            view.dispatch(
                view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, startPos)
                )
            )
            return true
        } else {
            // There is no tag. We jump to the section before this one.
            const startPos = getPos()

            view.dispatch(
                view.state.tr.setSelection(
                    NodeSelection.create(view.state.doc, startPos)
                )
            )
            // We now let the prosemirror move the selection to before this.
        }
    }
    return false
}

const ArrowRight = (state, dispatch, getNode, view, getPos) => {
    const docSize = state.doc.nodeSize - 3
    // If we're at the rightmost position, stopEvent will handle moving out of the tag
    if (state.selection.from < docSize) {
        // Inside the tag input, move caret right normally
        const tr = state.tr.setSelection(
            TextSelection.create(
                state.doc,
                state.selection.from + 1,
                state.selection.from + 1
            )
        )
        dispatch(tr)
        return true
    } else {
        // We are at the end of the tag input. Move the cursor beyond
        const node = getNode()
        const startPos = getPos(),
            pos = startPos + node.nodeSize

        const {$newPos, selectionType} = findValidCaretPosition(
            view.state,
            pos,
            1
        )

        if (!$newPos) {
            return false
        }
        view.focus()
        let newSelection
        if (selectionType === "gap") {
            newSelection = GapCursor($newPos)
        } else {
            newSelection = TextSelection.create(
                view.state.doc,
                $newPos.pos,
                $newPos.pos
            )
        }
        view.dispatch(view.state.tr.setSelection(newSelection))
        return true
    }
}

export const createTagEditor = (view, getPos, getNode) => {
    const dom = document.createElement("div")
    dom.classList.add("tag-input")
    dom.setAttribute("contenteditable", false)
    const node = getNode()
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
                    Enter: (_state, _dispatch, tagInputView) =>
                        submitTag(tagInputView, view, getPos),
                    ArrowLeft: (state, dispatch, _tagInputView) =>
                        ArrowLeft(state, dispatch, getNode, view, getPos),
                    ArrowRight: (state, dispatch, _tagInputView) =>
                        ArrowRight(state, dispatch, getNode, view, getPos),
                    ArrowUp: (state, dispatch, _tagInputView) =>
                        ArrowLeft(state, dispatch, getNode, view, getPos),
                    ArrowDown: (state, dispatch, _tagInputView) =>
                        ArrowRight(state, dispatch, getNode, view, getPos)
                })
            ]
        }),
        handleDOMEvents: {
            blur: (tagInputView, event) => {
                // Handle blur event
                event.preventDefault()
                // Set a timeout so that change of focus can take place first
                window.setTimeout(() => {
                    submitTag(tagInputView, view, getPos)
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
                submitTag(tagInputView, view, getPos)
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

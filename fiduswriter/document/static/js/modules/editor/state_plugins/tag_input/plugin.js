import {GapCursor} from "prosemirror-gapcursor"
import {
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"

import {findValidCaretPosition} from "./helpers"
import {TagsPartView} from "./node_view"

const key = new PluginKey("tagInput")

export const tagInputPlugin = options =>
    new Plugin({
        key,
        state: {
            init(_config, state) {
                if (options.editor.docInfo.access_rights === "write") {
                    this.spec.props.nodeViews["tags_part"] = (
                        node,
                        view,
                        getPos
                    ) => new TagsPartView(node, view, getPos)
                }

                // Find all tags_part nodes in the document
                const tagsPartPositions = []
                state.doc.descendants((node, pos) => {
                    if (node.type.name === "tags_part") {
                        tagsPartPositions.push({
                            start: pos,
                            end: pos + node.nodeSize
                        })
                    }
                })

                return {tagsPartPositions}
            },
            apply(tr, prev) {
                // If the document was modified, update all positions
                if (tr.docChanged) {
                    const newPositions = prev.tagsPartPositions.map(range => ({
                        start: tr.mapping.map(range.start),
                        end: tr.mapping.map(range.end)
                    }))

                    return {tagsPartPositions: newPositions}
                }
                return prev
            }
        },
        props: {
            nodeViews: {},
            // Handle keyboard selection between tags #  TODO: Move functionality to appendTransaction, etc. for performance
            handleKeyDown(view, event) {
                if (
                    !["ArrowLeft", "ArrowRight"].includes(event.key) ||
                    !view.hasFocus()
                ) {
                    return false
                }

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
                    $newPos = findValidCaretPosition(
                        view.state,
                        pos,
                        dir
                    ).$newPos
                    if ($newPos?.parent.type.name === "tags_part") {
                        position =
                            event.key === "ArrowRight" ? "before" : "after"
                        newPos = $newPos.pos
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
                            const {$newPos, selectionType} =
                                findValidCaretPosition(view.state, pos, -1)
                            if (!$newPos) {
                                return false
                            }
                            let newSelection
                            if (selectionType === "gap") {
                                newSelection = new GapCursor($newPos)
                            } else {
                                // text selection
                                newSelection = TextSelection.create(
                                    view.state.doc,
                                    $newPos.pos,
                                    $newPos.pos
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
        appendTransaction: (trs, oldState, newState) => {
            // If selection is not collapsed or not changed, don't do anything
            if (
                newState.selection.from !== newState.selection.to ||
                !trs.some(tr => tr.selectionSet)
            ) {
                return
            }

            const selectionPos = newState.selection.from
            const pluginState = key.getState(newState)

            // Check if selection is within any tags_part node
            const tagsPartRange = pluginState.tagsPartPositions.find(
                range => selectionPos > range.start && selectionPos < range.end
            )

            if (tagsPartRange) {
                const oldSelectionPos = oldState.selection.from

                if (selectionPos + 1 === tagsPartRange.end) {
                    // Selection is at end of tags_part.
                    // Put caret into tag editor if write access is present.
                    // Otherwise, move caret beyond tags_part.
                    if (options.editor.docInfo.access_rights === "write") {
                        // tag editor will be activated.
                        return
                    }
                    if (oldSelectionPos < selectionPos) {
                        const {$newPos, selectionType} = findValidCaretPosition(
                            newState,
                            tagsPartRange.end,
                            1
                        )
                        if (!$newPos) {
                            // Cannot find a location. Give up.
                            return
                        }
                        let newSelection
                        if (selectionType === "gap") {
                            newSelection = new GapCursor($newPos)
                        } else {
                            // text selection
                            newSelection = TextSelection.create(
                                newState.doc,
                                $newPos.pos,
                                $newPos.pos
                            )
                        }
                        return newState.tr.setSelection(newSelection)
                    }
                }

                const selectedNodePos =
                    oldSelectionPos < selectionPos
                        ? selectionPos
                        : selectionPos - 1

                if (selectedNodePos === tagsPartRange.start) {
                    // selection is at start of tags node. Find previous possible selection location.
                    const {$newPos, selectionType} = findValidCaretPosition(
                        newState,
                        selectedNodePos,
                        -1
                    )
                    if (!$newPos) {
                        // Cannot find a location. Give up.
                        return
                    }
                    let newSelection
                    if (selectionType === "gap") {
                        newSelection = new GapCursor($newPos)
                    } else {
                        // text selection
                        newSelection = TextSelection.create(
                            newState.doc,
                            $newPos.pos,
                            $newPos.pos
                        )
                    }
                    return newState.tr.setSelection(newSelection)
                } else {
                    // Select an entire tag node
                    return newState.tr.setSelection(
                        NodeSelection.create(newState.doc, selectedNodePos)
                    )
                }
            }

            return null
        }
    })

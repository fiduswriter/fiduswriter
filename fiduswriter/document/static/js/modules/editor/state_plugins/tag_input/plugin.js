import {GapCursor} from "prosemirror-gapcursor"
import {
    NodeSelection,
    Plugin,
    PluginKey,
    TextSelection
} from "prosemirror-state"

import {nextSelection} from "./helpers"
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
            nodeViews: {}
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
                        // tag editor will be activated by node view.
                        return
                    }
                    if (oldSelectionPos < selectionPos) {
                        const newSelection = nextSelection(
                            newState,
                            tagsPartRange.end,
                            1
                        )
                        if (!newSelection) {
                            // Cannot find a location. Give up.
                            return
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
                    const newSelection = nextSelection(
                        newState,
                        selectedNodePos,
                        -1
                    )
                    if (!newSelection) {
                        // Cannot find a location. Give up.
                        return
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

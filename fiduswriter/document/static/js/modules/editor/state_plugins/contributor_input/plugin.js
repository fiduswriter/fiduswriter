import {NodeSelection, Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {ContributorDialog} from "../../dialogs"
import {createDropUp} from "./dropup"
import {nextSelection} from "./helpers"
import {ContributorsPartView} from "./node_view"

const key = new PluginKey("contributorInput")

export const contributorInputPlugin = options =>
    new Plugin({
        key,
        state: {
            init(_config, state) {
                const decos = DecorationSet.empty
                if (options.editor.docInfo.access_rights === "write") {
                    this.spec.props.nodeViews["contributors_part"] = (
                        node,
                        view,
                        getPos
                    ) => new ContributorsPartView(node, view, getPos)
                }

                // Find all contributors_part nodes in the document
                const contributorsPartPositions = []
                state.doc.descendants((node, pos) => {
                    if (node.type.name === "contributors_part") {
                        contributorsPartPositions.push({
                            start: pos,
                            end: pos + node.nodeSize
                        })
                    }
                })

                return {contributorsPartPositions, decos}
            },
            apply(tr, prev, oldState, state) {
                let {decos, contributorsPartPositions} = prev
                // If the document was modified, update all positions
                if (tr.docChanged) {
                    contributorsPartPositions = contributorsPartPositions.map(
                        range => ({
                            start: tr.mapping.map(range.start),
                            end: tr.mapping.map(range.end)
                        })
                    )
                    decos = decos.map(tr.mapping, tr.doc)
                }
                if (options.editor.docInfo.access_rights !== "write") {
                    return {
                        contributorsPartPositions,
                        decos
                    }
                }
                if (tr.selectionSet) {
                    if (
                        oldState.selection.jsonID === "node" &&
                        oldState.selection.node.type.name === "contributor" &&
                        state.selection.node !== oldState.selection.node
                    ) {
                        const oldDropUpDeco = decos.find(
                            null,
                            null,
                            spec => spec.id === "contributorDropUp"
                        )
                        if (oldDropUpDeco && oldDropUpDeco.length) {
                            decos = decos.remove(oldDropUpDeco)
                        }
                    }
                    if (
                        state.selection.jsonID === "node" &&
                        state.selection.node.type.name === "contributor" &&
                        state.selection.node !== oldState.selection.node &&
                        state.selection.$anchor.node(1).attrs.locking !==
                            "fixed"
                    ) {
                        const dropUpDeco = Decoration.widget(
                            state.selection.from,
                            createDropUp(state.selection, options.editor.view),
                            {
                                side: -1,
                                stopEvent: () => true,
                                id: "contributorDropUp"
                            }
                        )

                        decos = decos.add(state.doc, [dropUpDeco])
                    }
                }

                return {
                    contributorsPartPositions,
                    decos
                }
            }
        },
        props: {
            nodeViews: {},
            decorations(state) {
                const {decos} = this.getState(state)

                return decos
            },
            handleKeyDown(view, event) {
                if (
                    event.key !== " " ||
                    view.state.selection.node?.type.name !== "contributor"
                ) {
                    return
                }
                const dialog = new ContributorDialog(
                    view.state.selection.$anchor.parent,
                    view,
                    view.state.selection.node.attrs
                )
                dialog.init()
                return true
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

            // Check if selection is within any contributors_part node
            const contributorsPartRange =
                pluginState.contributorsPartPositions.find(
                    range =>
                        selectionPos > range.start && selectionPos < range.end
                )

            if (contributorsPartRange) {
                const oldSelectionPos = oldState.selection.from

                if (selectionPos + 1 === contributorsPartRange.end) {
                    // Selection is at end of contributors_part.
                    // Put caret onto contributor add button if write access is present.
                    // Otherwise, move caret beyond contributors_part.
                    if (options.editor.docInfo.access_rights === "write") {
                        // contributor add button will be activated by node view.
                        return
                    }
                    if (oldSelectionPos < selectionPos) {
                        const newSelection = nextSelection(
                            newState,
                            contributorsPartRange.end,
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

                if (selectedNodePos === contributorsPartRange.start) {
                    // selection is at start of contributors node. Find previous possible selection location.
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
                    // Select an entire contributor node
                    return newState.tr.setSelection(
                        NodeSelection.create(newState.doc, selectedNodePos)
                    )
                }
            }

            return null
        }
    })

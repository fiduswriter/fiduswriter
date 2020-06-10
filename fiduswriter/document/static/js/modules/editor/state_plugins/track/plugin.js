import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

import {findSelectedChanges} from "./find_selected_changes"
import {deactivateAllSelectedChanges} from "./helpers"

export const key = new PluginKey('track')
export const selectedInsertionSpec = {}
export const selectedDeletionSpec = {}
export const selectedChangeFormatSpec = {}
export const selectedChangeBlockSpec = {}

export function trackPlugin(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                // Make sure there are colors for all users who have left marks in the document
                const userIds = [options.editor.user.id]
                state.doc.descendants(node => {
                    if (node.attrs.track) {
                        node.attrs.track.forEach(track => {
                            if (
                                !userIds.includes(track.user) && track.user !== 0
                            ) {
                                userIds.push(track.user)
                            }
                        })
                    } else {
                        node.marks.forEach(mark => {
                            if (
                                ['deletion', 'insertion', 'format_change'].includes(mark.type.name) &&
                                !userIds.includes(mark.attrs.user) && mark.attrs.user !== 0
                            ) {
                                userIds.push(mark.attrs.user)
                            }
                        })
                    }
                })

                if (options.editor.mod.collab) {
                    userIds.forEach(userId => options.editor.mod.collab.colors.ensureUserColor(userId))
                }


                return {
                    decos: DecorationSet.empty
                }


            },
            apply(tr, prev, oldState, state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }

                let {
                    decos
                } = this.getState(oldState)

                if (tr.selectionSet) {
                    const {insertion, deletion, formatChange} = findSelectedChanges(state)
                    decos = DecorationSet.empty
                    const decoType = tr.selection.node ? Decoration.node : Decoration.inline
                    if (insertion) {
                        decos = decos.add(tr.doc, [decoType(insertion.from, insertion.to, {
                            class: 'selected-insertion'
                        }, selectedInsertionSpec)])
                    }
                    if (deletion) {
                        decos = decos.add(tr.doc, [decoType(deletion.from, deletion.to, {
                            class: 'selected-deletion'
                        }, selectedDeletionSpec)])
                    }
                    if (formatChange) {
                        decos = decos.add(tr.doc, [decoType(formatChange.from, formatChange.to, {
                            class: 'selected-format_change'
                        }, selectedChangeFormatSpec)])
                    }
                } else {
                    decos = decos.map(tr.mapping, tr.doc)
                }
                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
                const {
                    decos
                } = this.getState(state)
                return decos
            },
            handleDOMEvents: {
                focus: (view, _event) => {
                    const otherView = view === options.editor.view ? options.editor.mod.footnotes.fnEditor.view : options.editor.view
                    otherView.dispatch(deactivateAllSelectedChanges(otherView.state.tr))
                }
            }
        }
    })
}

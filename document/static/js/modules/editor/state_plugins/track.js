import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Slice} from "prosemirror-model"
import {ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep, StepMap, Mapping} from "prosemirror-transform"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('track')

export function getSelectedChanges(state) {
    let {insertion, deletion} = key.getState(state)

    return {insertion, deletion}
}


// From https://discuss.prosemirror.net/t/expanding-the-selection-to-the-active-mark/478/2 with some bugs fixed
function getFromToMark(doc, pos, mark) {
    let $pos = doc.resolve(pos), parent = $pos.parent
    let start = parent.childAfter($pos.parentOffset)
    if (!start.node) {
        return null
    }
    let startIndex = $pos.index(), startPos = $pos.start() + start.offset
    while (startIndex > 0 && mark.isInSet(parent.child(startIndex - 1).marks)) {
        startPos -= parent.child(--startIndex).nodeSize
    }
    let endIndex = $pos.index() + 1, endPos = $pos.start() + start.offset + start.node.nodeSize
    while (endIndex < parent.childCount && mark.isInSet(parent.child(endIndex).marks)) {
        endPos += parent.child(endIndex++).nodeSize
    }
    return {from: startPos, to: endPos}
}

function getSelectedChanges(state) {

    let selection = state.selection, selectedChanges = {insertion: false, deletion: false}, insertionPos = false, deletionPos = false, insertionMark, deletionMark

    if (selection.empty) {
        let resolvedPos = state.doc.resolve(selection.from), marks = resolvedPos.marks()
        if (marks) {
            insertionMark = marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)
            if (insertionMark) {
                insertionPos = selection.from
            }
            deletionMark = marks.find(mark => mark.type.name==='deletion')
            if (deletionMark) {
                deletionPos = selection.from
            }
        }
    } else {
        state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node, pos, parent) => {
                if (!node.isInline) {
                    return true
                }
                if (!insertionMark) {
                    insertionMark = node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)
                    if (insertionMark) {
                        insertionPos = pos
                    }
                }
                if (!deletionMark) {
                    deletionMark = node.marks.find(mark => mark.type.name==='deletion')
                    if (deletionMark) {
                        deletionPos = pos
                    }

                }
            }
        )
    }
    if (insertionMark) {
        selectedChanges.insertion = getFromToMark(state.doc, insertionPos, insertionMark)
    }

    if (deletionMark) {
        selectedChanges.deletion = getFromToMark(state.doc, deletionPos, deletionMark)
    }
    return selectedChanges

}


export let trackPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                // Make sure there are colors for all users who have left marks in the document
                let userIds = [options.editor.user.id]
                state.doc.descendants(node => {
                    node.marks.forEach(mark => {
                        if (
                            ['deletion', 'insertion'].includes(mark.type.name) &&
                            !userIds.includes(mark.attrs.user) && mark.attrs.user !== 0
                        ) {
                            userIds.push(mark.attrs.user)
                        }
                    })
                })
                userIds.forEach(userId => options.editor.mod.collab.colors.ensureUserColor(userId))

                return {
                    selectedChanges: {
                        insertion: false, // currently selected insertion
                        deletion: false, // currently selection deletion
                        decos: DecorationSet.empty
                    }
                }


            },
            apply(tr, prev, oldState, state) {
                let {
                    insertion, deletion, decos
                } = this.getState(oldState)

                if (tr.selectionSet) {
                    ({insertion, deletion} = getSelectedChanges(state))
                    decos = DecorationSet.empty
                    if (insertion) {
                        decos = decos.add(tr.doc, [Decoration.inline(insertion.from, insertion.to, {
                            class: 'selected-insertion'
                        })])
                    }
                    if (deletion) {
                        decos = decos.add(tr.doc, [Decoration.inline(deletion.from, deletion.to, {
                            class: 'selected-deletion'
                        })])
                    }
                } else {
                    if (insertion) {
                        insertion = {from: tr.mapping.map(insertion.from, -1), to: tr.mapping.map(insertion.to, 1)}
                    }
                    if (deletion) {
                        deletion = {from: tr.mapping.map(deletion.from, -1), to: tr.mapping.map(deletion.to, 1)}
                    }
                    decos = decos.map(tr.mapping, tr.doc)
                }
                return {
                    insertion,
                    deletion,
                    decos
                }
            }
        },
        props: {
            decorations(state) {
				let {
					decos
				} = this.getState(state)
				return decos
			}
        },
        appendTransaction(trs, oldState, newState) {

            if (
                trs.every(
                    tr =>
                        tr.getMeta('remote') ||
                        tr.getMeta('track') ||
                        tr.getMeta('fromFootnote') ||
                        ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType'))
                )
            ) {
                // All transactions are remote, come from footnotes or history. Give up.
                return false
            }
            let addedRanges = [], // Content that has been added (also may mean removals)
                markedDeletionRanges = [], // Deleted content that has received marks (Italic/bold) - we need to revert this.
                unmarkedDeletionRanges = [] // Deleted content where marks have been deleted (Italic/bold) - we need to revert this.
            trs.forEach(tr => {
                tr.steps.forEach((step, index) => {
                    if (step instanceof ReplaceStep) {
                        addedRanges.push(
                            {from: step.from, to: step.to}
                        )
                    } else if (step instanceof ReplaceAroundStep && !step.structure) {
                        addedRanges.push(
                            {from: step.from, to: step.gapFrom}
                        )
                        addedRanges.push(
                            {from: step.gapTo, to: step.to}
                        )
                    } else if (step instanceof AddMarkStep) {
                        tr.docs[index].nodesBetween(step.from, step.to, (node, pos) => {
                            if (!node.isInline) {
                                return true
                            }
                            if (node.marks.find(mark => mark.type.name==='deletion')) {
                                markedDeletionRanges.push(
                                    {
                                        mark: step.mark,
                                        from: pos,
                                        to: pos + node.nodeSize
                                    }
                                )
                            }

                        })
                    } else if (step instanceof RemoveMarkStep) {
                        tr.docs[index].nodesBetween(step.from, step.to, (node, pos) => {
                            if (!node.isInline) {
                                return true
                            }
                            if (node.marks.find(mark => mark.type.name==='deletion')) {
                                unmarkedDeletionRanges.push(
                                    {
                                        mark: step.mark,
                                        from: pos,
                                        to: pos + node.nodeSize
                                    }
                                )
                            }

                        })
                    }
                    addedRanges = addedRanges.map(range => ({from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)}))
                    markedDeletionRanges = markedDeletionRanges.map(range =>
                        ({mark: range.mark, from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)})
                    )
                    unmarkedDeletionRanges = unmarkedDeletionRanges.map(range =>
                        ({mark: range.mark, from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)})
                    )
                })
            })
            if (!addedRanges.length && !markedDeletionRanges.length && !unmarkedDeletionRanges.length) {
                return false
            }

            let newTr = newState.tr,
                date = Math.floor((Date.now()-options.editor.clientTimeAdjustment)/600000), // 10 minute interval
                user = options.editor.user.id,
                username = options.editor.user.username,
                approved = !options.editor.view.state.doc.firstChild.attrs.track && options.editor.docInfo.access_rights !== 'write-tracked'

            if (!approved && addedRanges.length) { // Only add deletions if changes are not automatically approved
                let deletedRanges = addedRanges.slice()
                trs.slice().reverse().forEach(tr => {
                    tr.steps.slice().reverse().forEach((step, index) => {
                        let invertedStep = step.invert(tr.docs[tr.docs.length-index-1])
                        newTr.step(invertedStep)
                        let stepMap = invertedStep.getMap()
                        deletedRanges = deletedRanges.map(range => ({from: stepMap.map(range.from, -1), to: stepMap.map(range.to, 1)}))
                    })
                })

                let realDeletedRanges = [] // ranges of content by the same user. Should not be marked as gone, but really be removed

                deletedRanges.forEach(delRange => {
                    newTr.maybeStep(
                        new AddMarkStep(
                            delRange.from,
                            delRange.to,
                            newState.schema.marks.deletion.create({user, username, date})
                        )
                    )
                    newTr.doc.nodesBetween(
                        delRange.from,
                        delRange.to,
                        (node, pos, parent, index) => {
                            if (pos < delRange.from) {
                                return true
                            }
                            if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && mark.attrs.user===user && !mark.attrs.approved)) {
                                realDeletedRanges.push({from: pos, to: pos + node.nodeSize})
                            }
                        }
                    )
                })
                let map = new Mapping()
                while (realDeletedRanges.length) { // We delete nodes deleted and previously inserted by same user (unapproved content)
                    let delRange = realDeletedRanges.pop(),
                        delStep = new ReplaceStep(
                            delRange.from,
                            delRange.to,
                            Slice.empty
                        )
                    if (!newTr.maybeStep(delStep).failed) {
                        let stepMap = delStep.getMap()
                        map.appendMap(stepMap)
                        realDeletedRanges = realDeletedRanges.map(delRange => ({from: stepMap.map(delRange.from, -1), to: stepMap.map(delRange.to, 1)}))
                    }
                }
                addedRanges = [] // We reset the added ranges.

                trs.forEach(tr => { // We insert all the same steps, but with "from"/"to" both set to "to" in order not to delete content. Mapped as needed.
                    tr.steps.forEach((step, index) => {
                        if (step instanceof ReplaceStep || (step instanceof ReplaceAroundStep && !step.structure)) {
                            if (step.slice.size) {
                                let newStep = new ReplaceStep(
                                    map.map(step.to),
                                    map.map(step.to),
                                    step.slice,
                                    step.structure
                                )

                                if (!newTr.maybeStep(newStep).failed) {
                                    addedRanges.push(
                                        {
                                            from: map.map(step.to, -1),
                                            to: map.map(step.to, 1)
                                        }
                                    )
                                    let stepMap = newStep.getMap()
                                    addedRanges = addedRanges.map(range => ({from: stepMap.map(range.from, -1), to: stepMap.map(range.to, 1)}))
                                    map.appendMap(stepMap)
                                }
                            }
                        } else {
                            let mappedStep = step.map(map)
                            if (mappedStep) {
                                if (!newTr.maybeStep(mappedStep).failed) {
                                    let stepMap = mappedStep.getMap()
                                    addedRanges = addedRanges.map(range => ({from: stepMap.map(range.from, -1), to: stepMap.map(range.to, 1)}))
                                    map.appendMap(stepMap)
                                }
                            }
                        }
                        let newMap = new Mapping()
                        newMap.appendMap(step.getMap().invert())
                        newMap.appendMapping(map)
                        map = newMap
                    })
                })

                let tr = trs[trs.length-1]
                if (tr.selection instanceof TextSelection) {
                    let assoc = (tr.selection.from < oldState.selection.from || tr.getMeta('inputType') === 'deleteContentBackward' ) ? -1 : 1
                    let caretPos = map.map(tr.selection.from, assoc)
                    newTr.setSelection(
                        new TextSelection(
                            newTr.doc.resolve(
                                caretPos
                            )
                        )
                    )
                }
                markedDeletionRanges = markedDeletionRanges.map(range => ({mark: range.mark, from: map.map(range.from, -1), to: map.map(range.to, 1)}))
                unmarkedDeletionRanges = unmarkedDeletionRanges.map(range => ({mark: range.mark, from: map.map(range.from, -1), to: map.map(range.to, 1)}))
            }

            addedRanges.forEach(addedRange => {
                newTr.maybeStep(
                    new AddMarkStep(
                        addedRange.from,
                        addedRange.to,
                        newState.schema.marks.insertion.create({user, username, date, approved})
                    )
                )
                newTr.removeMark(
                    addedRange.from,
                    addedRange.to,
                    newState.schema.marks.deletion
                )
            })
            markedDeletionRanges.forEach(range => {
                newTr.maybeStep(
                    new RemoveMarkStep(
                        range.from,
                        range.to,
                        range.mark
                    )
                )
            })
            unmarkedDeletionRanges.forEach(range => {
                newTr.maybeStep(
                    new AddMarkStep(
                        range.from,
                        range.to,
                        range.mark
                    )
                )
            })
            if (newTr.steps.length) {
                return newTr
            }

        }
    })
}

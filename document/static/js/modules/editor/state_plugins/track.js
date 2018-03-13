import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {DOMSerializer, Slice} from "prosemirror-model"
import {ReplaceStep, ReplaceAroundStep, AddMarkStep, StepMap, Mapping} from "prosemirror-transform"
const key = new PluginKey('track')

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
            },
            apply() {}
        },
        appendTransaction(trs, oldState, newState) {

            if (
                trs.every(tr => tr.getMeta('remote') || tr.getMeta('fromFootnote') || ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType')))
            ) {
                // All transactions are remote, come from footnotes or history. Give up.
                return false
            }
            let addedRanges = []
            trs.forEach(tr => {
                tr.steps.forEach((step, index) => {
                    addedRanges = addedRanges.map(region => [tr.mapping.maps[index].map(region[0], -1), tr.mapping.maps[index].map(region[1], 1)])
                    if (step instanceof ReplaceStep) {
                        addedRanges.push(
                            [
                                tr.mapping.maps[index].map(step.from, -1),
                                tr.mapping.maps[index].map(step.to, 1)
                            ]
                        )
                    } else if (step instanceof ReplaceAroundStep && !step.structure) {
                        addedRanges.push(
                            [
                                tr.mapping.maps[index].map(step.from, -1),
                                tr.mapping.maps[index].map(step.gapFrom, 1)
                            ]
                        )
                        addedRanges.push(
                            [
                                tr.mapping.maps[index].map(step.gapTo, -1),
                                tr.mapping.maps[index].map(step.to, 1)
                            ]
                        )
                    }
                })
            })
            if (!addedRanges.length) {
                return
            }

            let newTr = newState.tr,
                date = Math.floor((Date.now()-options.editor.clientTimeAdjustment)/600000), // 10 minute interval
                user = options.editor.user.id,
                username = options.editor.user.username,
                approved = !options.editor.view.state.doc.firstChild.attrs.track && options.editor.docInfo.access_rights !== 'write-tracked'

            if (!approved) { // Only add deletions if changes are not automatically approved
                let deletedRanges = addedRanges.slice()
                trs.slice().reverse().forEach(tr => {
                    tr.steps.slice().reverse().forEach((step, index) => {
                        let invertedStep = step.invert(tr.docs[tr.docs.length-index-1])
                        newTr.step(invertedStep)
                        let stepMap = invertedStep.getMap()
                        deletedRanges = deletedRanges.map(region => [stepMap.map(region[0], -1), stepMap.map(region[1], 1)])
                    })
                })

                let realDeletedRanges = [] // ranges of content by the same user. Should not be marked as gone, but really be removed

                deletedRanges.forEach(delRange => {
                    newTr.maybeStep(
                        new AddMarkStep(
                            delRange[0],
                            delRange[1],
                            newState.schema.marks.deletion.create({user, username, date})
                        )
                    )
                    newTr.doc.nodesBetween(
                        delRange[0],
                        delRange[1],
                        (node, pos, parent, index) => {
                            if (pos < delRange[0]) {
                                return true
                            }
                            if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && mark.attrs.user===user && !mark.attrs.approved)) {
                                realDeletedRanges.push([pos, pos + node.nodeSize])
                            }
                        }
                    )
                })
                let map = new Mapping()
                while (realDeletedRanges.length) { // We delete nodes deleted and previously inserted by same user (unapproved content)
                    let delRange = realDeletedRanges.pop(),
                        delStep = new ReplaceStep(
                            delRange[0],
                            delRange[1],
                            Slice.empty
                        )
                    if (!newTr.maybeStep(delStep).failed) {
                        let stepMap = delStep.getMap()
                        map.appendMap(stepMap)
                        realDeletedRanges = realDeletedRanges.map(delRange => [stepMap.map(delRange[0], -1), stepMap.map(delRange[1], 1)])
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
                                        [
                                            map.map(step.to, -1),
                                            map.map(step.to, 1)
                                        ]
                                    )
                                    let stepMap = newStep.getMap()
                                    addedRanges = addedRanges.map(range => [stepMap.map(range[0], -1), stepMap.map(range[1], 1)])
                                    map.appendMap(stepMap)
                                }
                            }
                        } else {
                            let mappedStep = step.map(map)
                            if (mappedStep) {
                                if (!newTr.maybeStep(mappedStep).failed) {
                                    let stepMap = mappedStep.getMap()
                                    addedRanges = addedRanges.map(range => [stepMap.map(range[0], -1), stepMap.map(range[1], 1)])
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
            }

            addedRanges.forEach(addedRange => {
                newTr.maybeStep(
                    new AddMarkStep(
                        addedRange[0],
                        addedRange[1],
                        newState.schema.marks.insertion.create({user, username, date, approved})
                    )
                )
                newTr.removeMark(
                    addedRange[0],
                    addedRange[1],
                    newState.schema.marks.deletion
                )
            })
            if (newTr.steps.length) {
                return newTr
            }

        }
    })
}

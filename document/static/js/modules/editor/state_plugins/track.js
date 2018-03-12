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
                trs.every(tr => tr.getMeta('remote') || tr.getMeta('fromFootnote') || tr.getMeta('undo') || tr.getMeta('redo'))
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
                approved = !options.editor.view.state.doc.firstChild.attrs.track

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

        },
        filterTransaction(tr, state) {
            if (
                !options.editor.view.state.doc.firstChild.attrs.track || // tracking turned off. Allow.
                tr.getMeta('history$') // part of history. Allow.
            ) {

                return true
            }
            // We filter to not allow deletions. Instead we mark the area that was deleted and set
            // an insertion transaction with a timeout zero to insert the content.
            if(
                !tr.steps.find(step =>
                    (
                        step instanceof ReplaceStep && step.from !== step.to ||
                        step instanceof ReplaceAroundStep && !step.structure
                    )
                ) ||
                tr.getMeta('fromFootnote') ||
                tr.getMeta('remote') ||
                tr.getMeta('track')
            ) {
                return true
            }

            let newTr = state.tr,
                map = new Mapping(),
                date = Math.floor((Date.now()-options.editor.clientTimeAdjustment)/600000), // 10 minute interval
                user = options.editor.user.id,
                username = options.editor.user.username

            newTr.setMeta('track', true)

            tr.steps.forEach((step, index) => {

                if (step instanceof ReplaceStep && step.from !== step.to) {
                    newTr.maybeStep(
                        new AddMarkStep(
                            map.map(step.from),
                            map.map(step.to),
                            state.schema.marks.deletion.create({user, username, date})
                        )
                    )
                    if (newTr.docs.length) {
                        let delRanges = []
                        newTr.doc.nodesBetween(
                            map.map(step.from),
                            map.map(step.to),
                            (node, pos, parent, index) => {
                                if (pos < map.map(step.from)) {
                                    return true
                                }
                                if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && mark.attrs.user===user && !mark.attrs.approved)) {
                                    delRanges.push([pos, pos + node.nodeSize])
                                }
                            }
                        )
                        while (delRanges.length) {
                            let delRange = delRanges.pop(),
                                delStep = new ReplaceStep(
                                    delRange[0],
                                    delRange[1],
                                    Slice.empty
                                )
                            let {failed} = newTr.maybeStep(delStep)
                            if (!failed) {
                                let stepMap = delStep.getMap()
                                map.appendMap(stepMap)
                                delRanges = delRanges.map(delRange => [stepMap.map(delRange[0], -1), stepMap.map(delRange[1], 1)])
                            }
                        }
                    }

                    if (step.slice.size) {
                        let newStep = new ReplaceStep(
                            map.map(step.to),
                            map.map(step.to),
                            step.slice,
                            step.structure
                        )

                        let {failed} = newTr.maybeStep(newStep)

                        if (!failed) {
                            map.appendMap(newStep.getMap())
                        }
                    }

                } else if (step instanceof ReplaceAroundStep && !step.structure) {
                    let delRanges = []
                    if (step.gapFrom-step.from > 0) {
                        newTr.maybeStep(
                            new AddMarkStep(
                                map.map(step.from),
                                map.map(step.gapFrom),
                                state.schema.marks.deletion.create({user, username, date})
                            )
                        )
                    }
                    if (step.to-step.gapTo > 0) {
                        newTr.maybeStep(
                            new AddMarkStep(
                                map.map(step.gapTo),
                                map.map(step.to),
                                state.schema.marks.deletion.create({user, username, date})
                            )
                        )
                    }
                    if (newTr.docs.length) {
                        let delRanges = []
                        newTr.doc.nodesBetween(
                            map.map(step.from),
                            map.map(step.gapFrom),
                            (node, pos, parent, index) => {
                                if (pos < map.map(step.from)) {
                                    return true
                                }
                                if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && mark.attrs.user===user && !mark.attrs.approved)) {
                                    delRanges.push([pos, pos + node.nodeSize])
                                }
                            }
                        )
                        newTr.doc.nodesBetween(
                            map.map(step.gapTo),
                            map.map(step.to),
                            (node, pos, parent, index) => {
                                if (pos < map.map(step.gapTo)) {
                                    return true
                                }
                                if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && mark.attrs.user===user && !mark.attrs.approved)) {
                                    delRanges.push([pos, pos + node.nodeSize])
                                }
                            }
                        )
                        while (delRanges.length) {
                            let delRange = delRanges.pop(),
                                delStep = new ReplaceStep(
                                    delRange[0],
                                    delRange[1],
                                    Slice.empty
                                )
                            let {failed} = newTr.maybeStep(delStep)
                            if (!failed) {
                                let stepMap = delStep.getMap()
                                map.appendMap(stepMap)
                                delRanges = delRanges.map(delRange => [stepMap.map(delRange[0], -1), stepMap.map(delRange[1], 1)])
                            }
                        }
                    }
                    if (step.slice.size) {
                        let newStep = new ReplaceStep(
                            map.map(step.to),
                            map.map(step.to),
                            step.slice,
                            step.structure
                        )
                        let {failed} = newTr.maybeStep(newStep)
                        if (!failed) {
                            map.appendMap(newStep.getMap())
                        }
                    }
                } else {
                    let mappedStep = step.map(map)
                    if (mappedStep) {
                        let {failed} = newTr.maybeStep(mappedStep)
                        if (!failed) {
                            map.appendMap(mappedStep.getMap())
                        }
                    }
                }
                let newMap = new Mapping()
                newMap.appendMap(step.getMap().invert())
                newMap.appendMapping(map)
                map = newMap
            })
            if (tr.selection instanceof TextSelection) {
                let assoc = (tr.selection.from < state.selection.from || tr.getMeta('backspace')) ? -1 : 1
                let caretPos = map.map(tr.selection.from, assoc)
                newTr.setSelection(
                    new TextSelection(
                        newTr.doc.resolve(
                            caretPos
                        )
                    )
                )
            }
            setTimeout(() => {options.editor.view.dispatch(newTr)},0)
            return false
        }
    })
}

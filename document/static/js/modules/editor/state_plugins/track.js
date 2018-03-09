import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {DOMSerializer} from "prosemirror-model"
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
                trs.every(tr => tr.getMeta('remote') || tr.getMeta('fromFootnote'))
            ) {
                // All transactions are remote or come from footnotes. Give up.
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
                date = Math.floor(Date.now()/600000), // 10 minute interval
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
            if (!options.editor.view.state.doc.firstChild.attrs.track) {
                // tracking turned off. Allow.
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
                tr.getMeta('remote')
            ) {
                return true
            }

            let newTr = state.tr,
                map = new Mapping(),
                date = Math.floor(Date.now()/600000), // 10 minute interval
                user = options.editor.user.id,
                username = options.editor.user.username

            tr.steps.forEach(step => {
                if (step instanceof ReplaceStep && step.from !== step.to) {
                    let failed
                    if (step.slice.size) {
                        ({failed} = newTr.maybeStep(
                            new ReplaceStep(
                                map.map(step.to),
                                map.map(step.to),
                                step.slice,
                                step.structure
                            )
                        ))
                    }
                    newTr.maybeStep(
                        new AddMarkStep(
                            map.map(step.from),
                            map.map(step.to),
                            state.schema.marks.deletion.create({user, username, date})
                        )
                    )
                    if (!failed) {
                        map.appendMap(new StepMap([step.from, 0, step.to - step.from]))
                    }
                } else if (step instanceof ReplaceAroundStep && !step.structure) {
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
                    let failed
                    if (step.slice.size) {
                        ({failed} = newTr.maybeStep(
                            new ReplaceStep(
                                map.map(step.to),
                                map.map(step.to),
                                step.slice,
                                step.structure
                            )
                        ))
                    }
                    if (!failed) {
                        map.appendMap(new StepMap([step.from, 0, step.gapFrom - step.from]))
                        map.appendMap(new StepMap([step.gapTo, 0, step.to - step.gapTo]))
                    }
                } else {
                    let mappedStep = step.map(map)
                    if (mappedStep) {
                        newTr.maybeStep(mappedStep)
                    }
                }
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

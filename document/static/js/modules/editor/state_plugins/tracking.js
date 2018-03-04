import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {DOMSerializer} from "prosemirror-model"
import {ReplaceStep, ReplaceAroundStep, AddMarkStep} from "prosemirror-transform"
const key = new PluginKey('tracking')

class mapPos {
    constructor() {
        this.mapping = []
    }

    addMap(from, to) {
        this.mapping.push([from, to - from])
    }

    map(pos, moveRight=false) {
        let totalChange = 0
        this.mapping.forEach(posChange => {
            if (pos>posChange[0] || moveRight && pos===posChange[0]) {
                totalChange += posChange[1]
            }
        })
        return pos + totalChange
    }
}


export let trackingPlugin = function(options) {
    return new Plugin({
        key,
        state : {
            init(config, state) {
                // Make sure there are colors for all users who have left marks in the document
                let userIds = [options.editor.user.id]
                state.doc.descendants(node => {
                    node.marks.forEach(mark => {
                        if (['deletion', 'insertion'].includes(mark.type.name) && !userIds.includes(mark.attrs.u) && mark.attrs.u !== '') {
                            userIds.push(mark.attrs.u)
                        }
                    })
                })
                userIds.forEach(userId => options.editor.mod.collab.colors.ensureUserColor(userId))
            },
            apply() {}
        },
        appendTransaction(trs, oldState, newState) {
            if (trs.every(tr => tr.getMeta('remote') || tr.getMeta('fromFootnote'))) {
                // All transactions are remote or come from footnotes. Give up.
                return false
            }
            let addedRanges = []
            trs.forEach(tr => {
                tr.steps.forEach((step, index) => {
                    addedRanges = addedRanges.map(region => [tr.mapping.maps[index].map(region[0]), tr.mapping.maps[index].map(region[1])])
                    if (step instanceof ReplaceStep) {
                        addedRanges.push([tr.mapping.maps[index].map(step.from, -1), tr.mapping.maps[index].map(step.to, 1)])
                    }
                })
            })
            if (!addedRanges.length) {
                return
            }

            let newTr = newState.tr,
                time = Math.floor(Date.now()/600000), // 10 minute interval
                user = options.editor.user.id
            addedRanges.forEach(addedRange => {
                newTr.maybeStep(new AddMarkStep(addedRange[0], addedRange[1], newState.schema.marks.insertion.create({u: user, t: time})))
                newTr.removeMark(addedRange[0], addedRange[1], newState.schema.marks.deletion)
            })
            if (newTr.steps.length) {
                return newTr
            }

        },
        filterTransaction(tr, state) { // We filter to not allow deletions. Instead we mark the area that was deleted and set an insertion transaction with a timeout zero to insert the content.
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
                map = new mapPos(),
                time = Math.floor(Date.now()/600000), // 10 minute interval
                user = options.editor.user.id

            tr.steps.forEach(step => {
                if (step instanceof ReplaceStep && step.from !== step.to) {
                    if (step.slice.size) {
                        newTr.maybeStep(new ReplaceStep(map.map(step.to), map.map(step.to), step.slice, step.structure))
                    }
                    newTr.maybeStep(new AddMarkStep(map.map(step.from), map.map(step.to), state.schema.marks.deletion.create({u: user, t: time})))
                    map.addMap(step.from, step.to)
                } else if (step instanceof ReplaceAroundStep && !step.structure) {
                    if (step.gapFrom-step.from > 0) {
                        newTr.maybeStep(new AddMarkStep(map.map(step.from), map.map(step.gapFrom), state.schema.marks.deletion.create({u: user, t: time})))
                    }
                    if (step.to-step.gapTo > 0) {
                        newTr.maybeStep(new AddMarkStep(map.map(step.gapTo), map.map(step.to), state.schema.marks.deletion.create({u: user, t: time})))
                    }
                    if (step.slice.size) {
                        newTr.maybeStep(new ReplaceStep(map.map(step.to), map.map(step.to), step.slice, step.structure))
                    }
                    map.addMap(step.from, step.gapFrom)
                    map.addMap(step.gapTo, step.to)
                } else {
                    if (step.from) {
                        step.from = map.map(step.from) // bad! We should not touch the original step!
                    }
                    if (step.gapFrom) {
                        step.gapFrom = map.map(step.gapFrom) // bad! We should not touch the original step!
                    }
                    if (step.to) {
                        step.to = map.map(step.to) // bad! We should not touch the original step!
                    }
                    if (step.gapTo) {
                        step.gapTo = map.map(step.gapTo) // bad! We should not touch the original step!
                    }
                    newTr.maybeStep(step)
                }
            })
            if (tr.selection instanceof TextSelection && tr.selection.from === tr.selection.to) {
                let moveRight =  (tr.selection.from < state.selection.from) ? false : true
                newTr.setSelection(new TextSelection(newTr.doc.resolve(map.map(tr.selection.from, moveRight))))
            }
            setTimeout(() => {options.editor.view.dispatch(newTr)},0)
            return false
        }
    })
}

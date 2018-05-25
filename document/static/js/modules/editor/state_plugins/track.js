import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {Slice} from "prosemirror-model"
import {ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep, StepMap, Mapping} from "prosemirror-transform"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('track')
const selectedInsertionSpec = {}
const selectedDeletionSpec = {}
const selectedChangeFormatSpec = {}

// TODO:
// - Add tracking of:
//   * table operations (remove row/column)
//   * bibliography changes
//   * block type changes (heading/paragraph/etc.)
// - Tests

export function getSelectedChanges(state) {
    let {decos} = key.getState(state)

    let insertion = decos.find(undefined, undefined, spec => spec === selectedInsertionSpec)[0],
        deletion = decos.find(undefined, undefined, spec => spec === selectedDeletionSpec)[0],
        format_change = decos.find(undefined, undefined, spec => spec === selectedChangeFormatSpec)[0]

    return {insertion, deletion, format_change}
}

export function setSelectedChanges(tr, type, pos) {
    let node = tr.doc.nodeAt(pos),
        mark = node.attrs.track ?
            node.attrs.track.find(trackAttr => trackAttr.type===type) :
            node.marks.find(mark => mark.type.name===type)
    if (!mark) {
        return
    }
    let selectedChange = node.isInline ? getFromToMark(tr.doc, pos, mark) : {from: pos, to: pos + node.nodeSize}
    let decos = DecorationSet.empty
    let spec
    if (type==='insertion') {
        spec = selectedInsertionSpec
    } else if (type==='deletion') {
        spec = selectedDeletionSpec
    } else if (type==='format_change') {
        spec = selectedChangeFormatSpec
    } else {
        console.warn('unknown track type')
    }
    let decoType = node.isInline ? Decoration.inline : Decoration.node
    decos = decos.add(tr.doc, [decoType(selectedChange.from, selectedChange.to, {
        class: `selected-${type}`
    }, spec)])
    return tr.setMeta(key, {decos})
}

export function deactivateAllSelectedChanges(tr) {
    let pluginState = {
        decos: DecorationSet.empty
    }
    return tr.setMeta(key, pluginState)
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

function findSelectedChanges(state) {

    let selection = state.selection,
        selectedChanges = {insertion: false, deletion: false, formatChange: false},
        insertionPos = false,
        deletionPos = false,
        formatChangePos = false,
        insertionMark,
        deletionMark,
        formatChangeMark,
        insertionSize,
        deletionSize,
        formatChangeSize

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
            formatChangeMark = marks.find(mark => mark.type.name==='format_change')
            if (formatChangeMark) {
                formatChangePos = selection.from
            }
        }
    } else {
        state.doc.nodesBetween(
            selection.from,
            selection.to,
            (node, pos, parent) => {
                if (pos < selection.from) {
                    return true
                }
                if (!insertionMark) {
                    insertionMark = node.attrs.track ?
                        node.attrs.track.find(trackAttr => trackAttr.type==='insertion') :
                        node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)
                    if (insertionMark) {
                        insertionPos = pos
                        if (!node.isInline) {
                            insertionSize = node.nodeSize
                        }
                    }
                }
                if (!deletionMark) {
                    deletionMark = node.attrs.track ?
                        node.attrs.track.find(trackAttr => trackAttr.type==='deletion') :
                        node.marks.find(mark => mark.type.name==='deletion')
                    if (deletionMark) {
                        deletionPos = pos
                        if (!node.isInline) {
                            deletionSize = node.nodeSize
                        }
                    }
                }
                if (!formatChangeMark) {
                    formatChangeMark = node.marks.find(mark => mark.type.name==='format_change')
                    if (formatChangeMark) {
                        formatChangePos = pos
                        if (!node.isInline) {
                            formatChangeSize = node.nodeSize
                        }
                    }
                }
            }
        )
    }
    if (insertionMark) {
        selectedChanges.insertion = insertionSize ?
            {from: insertionPos, to: insertionPos + insertionSize} :
            getFromToMark(state.doc, insertionPos, insertionMark)
    }

    if (deletionMark) {
        selectedChanges.deletion = deletionSize ?
            {from: deletionPos, to: deletionPos + deletionSize} :
            getFromToMark(state.doc, deletionPos, deletionMark)

    }

    if (formatChangeMark) {
        selectedChanges.formatChange = formatChangeSize ?
            {from: formatChangePos, to: formatChangePos + formatChangeSize} :
            getFromToMark(state.doc, formatChangePos, formatChangeMark)

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
                                ['deletion', 'insertion'].includes(mark.type.name) &&
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
                let meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }

                let {
                    decos
                } = this.getState(oldState)

                if (tr.selectionSet) {
                    let {insertion, deletion, formatChange} = findSelectedChanges(state)
                    decos = DecorationSet.empty
                    let decoType = tr.selection.node ? Decoration.node : Decoration.inline
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
				let {
					decos
				} = this.getState(state)
				return decos
			},
            handleDOMEvents: {
                focus: (view, event) => {
                    let otherView = view === options.editor.view ? options.editor.mod.footnotes.fnEditor.view : options.editor.view
                    otherView.dispatch(deactivateAllSelectedChanges(otherView.state.tr))
                }
            }
        },
        appendTransaction(trs, oldState, newState) {
            if (
                trs.every(
                    tr =>
                        !tr.steps.length ||
                        tr.getMeta('fixIds') ||
                        tr.getMeta('remote') ||
                        tr.getMeta('track') ||
                        tr.getMeta('fromFootnote') ||
                        tr.getMeta('filterFree') ||
                        tr.getMeta('settings') ||
                        ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType'))
                )
            ) {
                // None of the transactions change the doc, or all are remote, come from footnotes, are footnote creations, history or fixing IDs. Give up.
                return false
            }
            console.log({trs})
            let addedRanges = [], // Content that has been added (also may mean removals)
                markedDeletionRanges = [], // Deleted content that has received marks (Italic/bold) - we need to revert this.
                unmarkedDeletionRanges = [], // Deleted content where marks have been deleted (Italic/bold) - we need to revert this.
                formatChangeRanges = [], // Ranges where em/strong have been added or removed
                replacedWrappings = [],
                user = options.editor.user.id, // current user
                approved = !options.editor.view.state.doc.firstChild.attrs.tracked && options.editor.docInfo.access_rights !== 'write-tracked'
            trs.forEach(tr => {
                tr.steps.forEach((step, index) => {
                    if (step instanceof ReplaceStep) {
                        addedRanges.push(
                            {from: step.from, to: step.to}
                        )
                    } else if (step instanceof ReplaceAroundStep) {
                        if (step.structure) {
                            if (step.from===step.gapFrom && step.to===step.gapTo) { // wrapped in something
                                addedRanges.push(
                                    {from: step.from, to: step.gapFrom}
                                )
                            } else if(!step.slice.size) {// unwrapped from something
                                tr.docs[index].nodesBetween(step.from, step.gapFrom, (node, pos) => {
                                    if (pos < step.from) {
                                        return true
                                    }
                                    if (node.attrs.track && node.attrs.track.find(track => track.user===user && track.type==='insertion')) {
                                        // user has created element. so (s)he is allowed to delete it again.
                                        return true
                                    }
                                    addedRanges.push(
                                        {from: pos, to: pos + 1}
                                    )
                                })
                            } else if (step.slice.size===2 && step.gapFrom-step.from===1 && step.to-step.gapTo===1) { // Replaced one wrapping with another
                                replacedWrappings.push({pos, node: tr.docs[index].nodeAt(pos)})
                                //replacedWrapping = true
                            }
                        } else {
                            [{from: step.from, to: step.gapFrom}, {from: step.gapTo, to: step.to}].forEach(
                                range => tr.docs[index].nodesBetween(range.from, range.to, (node, pos) => {
                                    if (pos < range.from) {
                                        return true
                                    }
                                    if (node.attrs.track && node.attrs.track.find(track => track.user===user && track.type==='insertion')) {
                                        // user has created element. so (s)he is allowed to delete it again.
                                        return true
                                    }
                                    addedRanges.push(
                                        {from: pos, to: pos + 1}
                                    )
                                })
                            )
                        }
                    } else if (step instanceof AddMarkStep) {
                        tr.docs[index].nodesBetween(step.from, step.to, (node, pos) => {
                            if (!node.isInline) {
                                return true
                            }
                            if (node.marks.find(mark => mark.type.name==='deletion')) {
                                markedDeletionRanges.push(
                                    {
                                        mark: step.mark,
                                        from: Math.max(step.from, pos),
                                        to: Math.min(step.to, pos + node.nodeSize)
                                    }
                                )
                            } else if (
                                !approved &&
                                ['em', 'strong'].includes(step.mark.type.name) &&
                                !node.marks.find(mark => mark.type === step.mark.type)
                            ) {
                                let formatChangeMark = node.marks.find(mark => mark.type.name==='format_change'),
                                    before = formatChangeMark ?
                                        formatChangeMark.attrs.before :
                                        node.marks.map(mark => mark.type.name).filter(markName => ['em', 'strong'].includes(markName)),
                                    after = formatChangeMark ?
                                        formatChangeMark.attrs.after.concat(step.mark.type.name) :
                                        before.concat(step.mark.type.name),
                                    common = before.filter(markName => after.includes(markName))
                                before = before.filter(markName => !common.includes(markName))
                                after = after.filter(markName => !common.includes(markName))
                                formatChangeRanges.push(
                                    {
                                        from: Math.max(step.from, pos),
                                        to: Math.min(step.to, pos + node.nodeSize),
                                        before,
                                        after
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
                                        from: Math.max(step.from, pos),
                                        to: Math.min(step.to, pos + node.nodeSize)
                                    }
                                )
                            } else if (
                                !approved &&
                                ['em', 'strong'].includes(step.mark.type.name) &&
                                node.marks.find(mark => mark.type === step.mark.type)
                            ) {
                                let formatChangeMark = node.marks.find(mark => mark.type.name==='format_change'),
                                    before = formatChangeMark ?
                                        formatChangeMark.attrs.before :
                                        node.marks.map(mark => mark.type.name).filter(markName => ['em', 'strong'].includes(markName)),
                                    after = formatChangeMark ?
                                        formatChangeMark.attrs.after.filter(format => format !== step.mark.type.name) :
                                        before.filter(format => format !== step.mark.type.name),
                                    common = before.filter(markName => after.includes(markName))
                                before = before.filter(markName => !common.includes(markName))
                                after = after.filter(markName => !common.includes(markName))

                                formatChangeRanges.push(
                                    {
                                        from: Math.max(step.from, pos),
                                        to: Math.min(step.to, pos + node.nodeSize),
                                        before,
                                        after
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
                    formatChangeRanges = formatChangeRanges.map(range =>
                        ({before: range.before, after: range.after, from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)})
                    )
                    replacedWrappings = replacedWrappings.map(wrapping =>
                        ({pos: tr.mapping.maps[index].map(wrapping.pos), node: wrapping.node})
                    )
                })
            })
            if (!addedRanges.length && !markedDeletionRanges.length && !unmarkedDeletionRanges.length && !formatChangeRanges.length && !replacedWrappings.length) {
                return false
            }
            let newTr = newState.tr,
                exactDate = Date.now() - options.editor.clientTimeAdjustment,
                date10 = Math.floor(exactDate/600000) * 10, // 10 minute interval
                date1 = Math.floor(exactDate/60000), // 1 minute interval
                username = options.editor.user.username

            formatChangeRanges.forEach(formatChange => {
                if (!formatChange.before.length && !formatChange.after.length) {
                    newTr.removeMark(
                        formatChange.from,
                        formatChange.to,
                        newState.schema.marks.format_change
                    )
                } else {
                    let formatChangeMark = newState.schema.marks.format_change.create({user, username, date: date10, before: formatChange.before, after: formatChange.after})
                    newTr.maybeStep(
                        new AddMarkStep(
                            formatChange.from,
                            formatChange.to,
                            formatChangeMark
                        )
                    )
                }
            })

            

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

                let realDeletedRanges = [], // ranges of content by the same user. Should not be marked as gone, but really be removed
                    deletionMark = newState.schema.marks.deletion.create({user, username, date: date10})
                deletedRanges.forEach(delRange => {
                    let oldDeletionMarks = {}
                    // Add deletion mark to block nodes (figures, text blocks) and find already deleted inline nodes
                    newTr.doc.nodesBetween(
                        delRange.from,
                        delRange.to,
                        (node, pos) => {
                            if (pos < delRange.from) {
                                return true
                            } else if (node.isInline) {
                                let oldDeletionMark = node.marks.find(mark => mark.type.name==='deletion')
                                if (oldDeletionMark) {
                                    oldDeletionMarks[pos] = oldDeletionMark
                                }
                            } else if (
                                node.attrs.track &&
                                !node.attrs.track.find(trackAttr => trackAttr.type === 'deletion') &&
                                !['table_row', 'table_cell', 'bullet_list', 'ordered_list'].includes(node.type.name)
                            ) {
                                let track = node.attrs.track.slice()
                                track.push({type: 'deletion', user, username, date: date1})
                                newTr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {track}), node.marks)
                            }
                        }
                    )
                    // Add deletion mark to inline nodes
                    newTr.maybeStep(
                        new AddMarkStep(
                            delRange.from,
                            delRange.to,
                            deletionMark
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
                            } else if (node.attrs.track && node.attrs.track.find(track => track.user===user && track.type==='insertion')) {
                                // user has created element. so (s)he is allowed to delete it again.
                                realDeletedRanges.push({from: pos, to: pos + 1})
                            } else if(oldDeletionMarks[pos]) {
                                // Readd preexisting deletion mark
                                newTr.maybeStep(
                                    new AddMarkStep(
                                        pos,
                                        pos + node.nodeSize,
                                        oldDeletionMarks[pos]
                                    )
                                )
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
                        let stepMap
                        if (step instanceof ReplaceStep || (step instanceof ReplaceAroundStep)) {
                            if (step.structure) {
                                if (
                                    step.from===step.gapFrom && step.to===step.gapTo && step.slice.size // wrapped in something
                                ) {
                                    let mappedStep = step.map(map)
                                    if (mappedStep) {
                                        if (!newTr.maybeStep(mappedStep).failed) {
                                            addedRanges.push(
                                                {
                                                    from: map.map(step.from, -1),
                                                    to: map.map(step.gapFrom, 1)
                                                }
                                            )
                                            stepMap = mappedStep.getMap()
                                        }
                                    }
                                } else if (step.slice.size===2 && step.gapFrom-step.from===1 && step.to-step.gapTo===1) { //one wrapping has been replaced by another.
                                    let mappedStep = step.map(map)
                                    if (mappedStep) {
                                        let doc = tr.docs[index],
                                            oldNode = doc.nodeAt(step.from),
                                            newNode = step.slice.content.firstChild,
                                            track = oldNode.attrs.track
                                        if (!track) {
                                            newTr.maybeStep(mappedStep)
                                            return
                                        }
                                        let blockTrack = track.find(track => track.type==="block_change")
                                        console.log('REER')
                                        console.log({approved})
                                        if (approved) {
                                            console.log('firsg')
                                            if (!newTr.maybeStep(mappedStep).failed) {
                                                console.log('micbook')
                                                if (blockTrack) {
                                                    track = track.filter(track => track !== blockTrack)
                                                    console.log('THERE')
                                                    newTr.setNodeMarkup(mappedStep.from, null, Object.assign({}, newNode.attrs, {track}))
                                                }
                                            }
                                        } else {
                                            if (blockTrack) {
                                                track = track.filter(track => track !== blockTrack)
                                                if (blockTrack.before.type !== newNode.type.name || blockTrack.before.attrs.level !== newNode.attrs.level) {
                                                    blockTrack = {type: "block_change", user, username, date: date1, before: blockTrack.before}
                                                    track.push(blockTrack)
                                                }
                                            } else {
                                                blockTrack = {type: "block_change", user, username, date: date1, before: {type: oldNode.type.name, attrs: oldNode.attrs}}
                                                if (blockTrack.before.attrs.id) {
                                                    delete blockTrack.before.attrs.id
                                                }
                                                if (blockTrack.before.attrs.track) {
                                                    delete blockTrack.before.attrs.track
                                                }
                                                track.push(blockTrack)
                                            }
                                            if (!newTr.maybeStep(mappedStep).failed) {
                                                newTr.setNodeMarkup(mappedStep.from, null, Object.assign({}, newNode.attrs, {track}))
                                            }
                                        }
                                    }

                                }
                            } else if (step.slice.size) {
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
                                    stepMap = newStep.getMap()
                                }
                            }
                        } else {
                            let mappedStep = step.map(map)
                            if (mappedStep) {
                                if (!newTr.maybeStep(mappedStep).failed) {
                                    stepMap = mappedStep.getMap()
                                }
                            }
                        }
                        let newMap = new Mapping()
                        newMap.appendMap(step.getMap().invert())
                        newMap.appendMapping(map)
                        if (stepMap) {
                            addedRanges = addedRanges.map(range => ({from: stepMap.map(range.from, -1), to: stepMap.map(range.to, 1)}))
                            newMap.appendMap(stepMap)
                        }
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
            } // End only unapproved with added ranges

            let insertionMark = newState.schema.marks.insertion.create({user, username, date: date10, approved})

            addedRanges.forEach(addedRange => {
                newTr.maybeStep(
                    new AddMarkStep(
                        addedRange.from,
                        addedRange.to,
                        insertionMark
                    )
                )
                newTr.removeMark(
                    addedRange.from,
                    addedRange.to,
                    newState.schema.marks.deletion
                )
                // Add insertion mark also to block nodes (figures, text blocks) but not table cells/rows and lists.
                if (!approved) {
                    newTr.doc.nodesBetween(
                        addedRange.from,
                        addedRange.to,
                        (node, pos) => {
                            if (pos < addedRange.from || ['table_row', 'table_cell', 'bullet_list', 'ordered_list'].includes(node.type.name)) {
                                return true
                            } else if (node.isInline) {
                                return false
                            }
                            if (node.attrs.track) {
                                let track = node.attrs.track.filter(trackAttr => trackAttr.type !== 'insertion')
                                track.push({type: 'insertion', user, username, date: date1})
                                newTr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {track}), node.marks)
                            }
                        }
                    )
                }
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

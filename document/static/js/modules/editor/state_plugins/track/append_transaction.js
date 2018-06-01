import {TextSelection} from "prosemirror-state"
import {Slice} from "prosemirror-model"
import {ReplaceStep, ReplaceAroundStep, AddMarkStep, RemoveMarkStep, Mapping} from "prosemirror-transform"
import {CellSelection} from "prosemirror-tables"

export function appendTransaction(trs, oldState, newState, editor) {
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
    let addedRanges = [], // Content that has been added (also may mean removals)
        markedDeletionRanges = [], // Deleted content that has received marks (Italic/bold) - we need to revert this.
        unmarkedDeletionRanges = [], // Deleted content where marks have been deleted (Italic/bold) - we need to revert this.
        formatChangeRanges = [], // Ranges where em/strong have been added or removed
        replacedWrappings = [],
        user = editor.user.id, // current user
        approved = !editor.view.state.doc.firstChild.attrs.tracked && editor.docInfo.access_rights !== 'write-tracked'

    // We go through all trs a first time. The point is to collect arrays of addedRanges , markedDeletionRanges, formatChangeRanges and replacedWrappings.
    // These are all mapped through to AFTEr the application of the tr.
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
                            if (
                                pos < step.from ||
                                // user has created element. so (s)he is allowed to delete it again.
                                (node.attrs.track && node.attrs.track.find(track => track.user===user && track.type==='insertion')) ||
                                ['bullet_list', 'ordered_list'].includes(node.type.name)
                            ) {
                                return true
                            } else if (['table_row', 'table_cell'].includes(node.type.name)) {
                                return false
                            }
                            addedRanges.push(
                                {from: pos, to: pos + 1}
                            )
                        })
                    } else if (step.slice.size===2 && step.gapFrom-step.from===1 && step.to-step.gapTo===1) { // Replaced one wrapping with another
                        let pos = step.from,
                            oldNode = tr.docs[index].nodeAt(pos)
                        if (oldNode.attrs.track) {
                            replacedWrappings.push({pos, oldNode, newNode: step.slice.content.firstChild})
                        }
                    }
                } else {
                    [{from: step.from, to: step.gapFrom}, {from: step.gapTo, to: step.to}].forEach(
                        range => tr.docs[index].nodesBetween(range.from, range.to, (node, pos) => {
                            if (
                                pos < range.from ||
                                // user has created element. so (s)he is allowed to delete it again.
                                (node.attrs.track && node.attrs.track.find(track => track.user===user && track.type==='insertion'))
                            ) {
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
                ({pos: tr.mapping.maps[index].map(wrapping.pos), oldNode: wrapping.oldNode, newNode: wrapping.newNode})
            )
        })
    })
    if (!addedRanges.length && !markedDeletionRanges.length && !unmarkedDeletionRanges.length && !formatChangeRanges.length && !replacedWrappings.length) {
        return false
    }
    let newTr = newState.tr,
        exactDate = Date.now() - editor.clientTimeAdjustment,
        date10 = Math.floor(exactDate/600000) * 10, // 10 minute interval
        date1 = Math.floor(exactDate/60000), // 1 minute interval
        username = editor.user.username

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

    replacedWrappings.forEach(wrap => {
        let {oldNode, newNode, pos} = wrap,
            track = oldNode.attrs.track.slice(),
            blockTrack = track.find(track => track.type==="block_change")

        if (blockTrack) {
            track = track.filter(track => track !== blockTrack)
            if (!approved && (blockTrack.before.type !== newNode.type.name || blockTrack.before.attrs.level !== newNode.attrs.level)) {
                blockTrack = {type: "block_change", user, username, date: date1, before: blockTrack.before}
                track.push(blockTrack)
            }
        } else if (!approved) {
            blockTrack = {type: "block_change", user, username, date: date1, before: {type: oldNode.type.name, attrs: oldNode.attrs}}
            if (blockTrack.before.attrs.id) {
                delete blockTrack.before.attrs.id
            }
            if (blockTrack.before.attrs.track) {
                delete blockTrack.before.attrs.track
            }
            track.push(blockTrack)
        }
        newTr.setNodeMarkup(pos, null, Object.assign({}, newNode.attrs, {track}))
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
            let oldDeletionMarks = {},
                firstTableCellChild = false
            // Add deletion mark to block nodes (figures, text blocks) and find already deleted inline nodes
            newTr.doc.nodesBetween(
                delRange.from,
                delRange.to,
                (node, pos) => {
                    if (pos < delRange.from && node.type.name==='table_cell') {
                        firstTableCellChild = true
                        return true
                    } else if (pos < delRange.from || firstTableCellChild) {
                        firstTableCellChild = false
                        return true
                    } else if (['table_row', 'table_cell'].includes(node.type.name)) {
                        return false
                    } else if (node.isInline) {
                        let oldDeletionMark = node.marks.find(mark => mark.type.name==='deletion')
                        if (oldDeletionMark) {
                            oldDeletionMarks[pos] = oldDeletionMark
                        }
                    } else if (
                        node.attrs.track &&
                        !node.attrs.track.find(trackAttr => trackAttr.type === 'deletion') &&
                        !['bullet_list', 'ordered_list'].includes(node.type.name)
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
            let deleteTr = ['deleteContentBackward', 'deleteContentBackward'].includes(tr.getMeta('inputType')) ? true : false,
            cellDeleteTr = deleteTr && (oldState.selection instanceof CellSelection)
            tr.steps.forEach((step, index) => {
                let stepMap
                if (step instanceof ReplaceStep) {
                    // We only insert content if this is not directly a tr for cell deletion. This is because tables delete rows by deleting the
                    // contents of each cell and replacing it with an empty paragraph.
                    if (step.slice.size && !cellDeleteTr) {
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
                } else if (step instanceof ReplaceAroundStep) {
                    if (step.structure) {
                        if (
                            step.from===step.gapFrom && step.to===step.gapTo && step.slice.size // wrapped in something
                        ) {
                            addedRanges.push(
                                {
                                    from: map.map(step.from, -1),
                                    to: map.map(step.gapFrom, 1)
                                }
                            )
                            let mappedStep = step.map(map)
                            if (mappedStep) {
                                if (!newTr.maybeStep(mappedStep).failed) {

                                    stepMap = mappedStep.getMap()
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
        newTr.doc.nodesBetween(
            addedRange.from,
            addedRange.to,
            (node, pos) => {
                if (pos < addedRange.from || ['bullet_list', 'ordered_list'].includes(node.type.name)) {
                    return true
                } else if (node.isInline || ['table_row', 'table_cell'].includes(node.type.name)) {
                    return false
                }
                if (node.attrs.track) {
                    let track = []
                    if (!approved) {
                        track.push({type: 'insertion', user, username, date: date1})
                    }
                    newTr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {track}), node.marks)
                }
                if (node.type.name==='table') {
                    // A table was inserted. We don't add track marks to elements inside of it.
                    return false
                }
            }
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

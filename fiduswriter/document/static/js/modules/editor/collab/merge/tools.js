import {EditorState, TextSelection} from "prosemirror-state"
import {ReplaceStep, Mapping, Step} from 'prosemirror-transform'
import {Slice} from "prosemirror-model"
import {__serializeForClipboard} from "prosemirror-view"
import {showSystemMessage} from "../../../common"

export const checkPresenceOfdiffdata = function(doc, from, to) {
    /* This function checks whether diff mark is present inside the given range */
    let diffAttrPresent = false
    if (doc.rangeHasMark(from, to, doc.type.schema.marks.diffdata)) {
        return true
    }
    doc.nodesBetween(from, to, (node, _pos) => {
        if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
            diffAttrPresent = true
        }
    })
    return diffAttrPresent
}

export const simplifyTransform = function(tr) {
    /* This splits complex insertion & Deletion steps into simple insertion and deletion
    steps */
    if (tr.docChanged && tr.docs.length > 0) {
        const trState = EditorState.create({doc: tr.docs[0]})
        const newTr = trState.tr
        for (let index = 0; index < tr.steps.length ; index++) {
            const step = tr.steps[index]
            if (step instanceof ReplaceStep && step.from !== step.to) {
                const modifiedStep = step.slice.size ? new ReplaceStep(
                    step.to, // We insert all the same steps, but with "from"/"to" both set to "to" in order not to delete content. Mapped as needed.
                    step.to,
                    step.slice,
                    step.structure
                ) : false
                if (modifiedStep) {
                    // If while breaking down any step the step fails , we return the original tr (we just split steps containing both insertions and deletions into simple steps which does just insertion/deletion. should not make a big difference.)
                    if (newTr.maybeStep(modifiedStep).failed) {
                        return tr
                    }
                    if (newTr.maybeStep(new ReplaceStep(step.from, step.to, Slice.empty, step.structure)).failed) {
                        return tr
                    }
                } else {
                    if (newTr.maybeStep(step).failed) {
                        return tr
                    }
                }

            } else {
                if (newTr.maybeStep(step).failed) {
                    return tr
                }
            }
        }
        return newTr
    } else {
        return tr
    }
}

export const removeDiffdata = function(tr, from, to) {
    /* Adds steps to a tr to remove all the diff marks in the given range. */
    tr.doc.nodesBetween(
        from,
        to,
        (node, pos) => {
            if (pos < from || ['bullet_list', 'ordered_list'].includes(node.type.name)) {
                return true
            } else if (node.isInline) {
                return false
            }
            if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                tr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {diffdata: []}), node.marks)
            }
        }
    )
    tr.removeMark(from, to, tr.doc.type.schema.marks.diffdata)
    return tr
}

export const dispatchRemoveDiffdata = function(view, from, to) {
    const tr = removeDiffdata(view.state.tr, from, to)
    tr.setMeta('initialDiffMap', true).setMeta('mapAppended', true)
    tr.setMeta('notrack', true)
    view.dispatch(tr)
}

export const updateMarkData = function(tr, imageDataModified) {
    /* Update the range inside the marks and also if we have a image that
    was reuploaded , then while accepting it into the middle editor,
    update its attrs */
    const initialdiffMap = tr.getMeta('initialDiffMap')
    if (!initialdiffMap && (tr.steps.length > 0 || tr.docChanged)) {
        tr.doc.nodesBetween(
            0,
            tr.doc.content.size,
            (node, pos) => {
                if (['bullet_list', 'ordered_list'].includes(node.type.name)) {
                    return true
                } else if (node.isInline) {
                    let diffMark = node.marks.find(mark => mark.type.name == "diffdata")
                    if (diffMark !== undefined) {
                        diffMark = diffMark.attrs
                        tr.removeMark(pos, pos + node.nodeSize, tr.doc.type.schema.marks.diffdata)
                        const from = tr.mapping.map(diffMark.from)
                        const to = tr.mapping.map(diffMark.to, -1)
                        const mark = tr.doc.type.schema.marks.diffdata.create({diff: diffMark.diff, steps: diffMark.steps, from: from, to: to})
                        tr.addMark(pos, pos + node.nodeSize, mark)
                    }
                }
                if (node.type.name === 'figure' && Object.keys(imageDataModified).includes(String(node.attrs.image))) {
                    const attrs = Object.assign({}, node.attrs)
                    attrs["image"] = imageDataModified[String(node.attrs.image)]
                    const nodeType = tr.doc.type.schema.nodes['figure']
                    tr.setNodeMarkup(pos, nodeType, attrs)
                }
                if (node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                    const diffdata = node.attrs.diffdata
                    diffdata[0].from = tr.mapping.map(diffdata[0].from)
                    diffdata[0].to = tr.mapping.map(diffdata[0].to)
                    tr.setNodeMarkup(pos, null, Object.assign({}, node.attrs, {diffdata}), node.marks)
                }
            }
        )
    }
    return tr
}

export const removeDiffFromJson = function(object) {
    /* Used to convert a document from the merge editor to a doc that complies with the schema of the main editor */
    if (object.attrs && object.attrs.diffdata) {
        delete object.attrs.diffdata
    }
    if (object.marks) {
        object.marks = object.marks.filter(mark => mark.type !== 'diffdata')
    }
    if (object.content) {
        object.content.forEach(child => removeDiffFromJson(child))
    }
    return object
}

export const copyChange = function (view, from, to) {
    /* when a certain change cannot be applied automatically,
    we give users the ability to copy a change */
    const tr = view.state.tr
    const resolvedFrom = view.state.doc.resolve(from)
    const resolvedTo = view.state.doc.resolve(to)
    const sel = new TextSelection(resolvedFrom, resolvedTo)
    sel.visible = false
    tr.setSelection(sel)
    view.dispatch(tr)

    const slice = view.state.selection.content()
    const {dom} = (__serializeForClipboard(view, slice))

    // Copy data to clipboard!!
    document.body.appendChild(dom)
    const range = document.createRange()
    range.selectNode(dom)
    window.getSelection().addRange(range)
    try {
        document.execCommand("copy") // Security exception may be thrown by some browsers.
        document.body.removeChild(dom)
        showSystemMessage(gettext(
            'Change copied to clipboard.'
        ))
    } catch (ex) {
        showSystemMessage(gettext(
            'Copy to clipboard failed. Please copy manually.'
        ))
    }
    window.getSelection().removeAllRanges()
}

export const acceptChanges = function (merge, mark, mergeView, originalView, tr) {
    /* This is used to accept a change either from the offline/online version or
    incase of deletion from the middle editor */
    const mergedDocMap = new Mapping()
    mergedDocMap.appendMapping(merge.mergedDocMap)
    let insertionTr = mergeView.state.tr
    const from = mark.attrs.from
    const to = mark.attrs.to
    const steps = JSON.parse(mark.attrs.steps)
    const stepMaps = tr.mapping.maps.slice().reverse().map(map => map.invert())
    const rebasedMapping = new Mapping(stepMaps)
    rebasedMapping.appendMapping(mergedDocMap)
    for (const stepIndex of steps) {
        const maps = rebasedMapping.slice(tr.steps.length - stepIndex)
        let mappedStep = tr.steps[stepIndex].map(maps)
        if (mappedStep) {
            mappedStep = Step.fromJSON( // Switch from main editor schema to merge editor schema
                insertionTr.doc.type.schema,
                mappedStep.toJSON()
            )
        }
        if (mappedStep && !insertionTr.maybeStep(mappedStep).failed) {
            mergedDocMap.appendMap(mappedStep.getMap())
            rebasedMapping.appendMap(mappedStep.getMap())
            rebasedMapping.setMirror(tr.steps.length - stepIndex - 1, (tr.steps.length + mergedDocMap.maps.length - 1))
        }
    }
    // Make sure that all the content steps are present in the new transaction
    if (insertionTr.steps.length < steps.length) {
        showSystemMessage(gettext("The change could not be applied automatically. Please consider using the copy option to copy the changes."))
    } else {
        // Remove the diff mark. If we're looking at view2 it means we're deleting content for which we dont have to remove the marks seperately we can put both of the steps into a single transaction
        if (originalView === mergeView) {
            const markRemovalTr = removeDiffdata(originalView.state.tr, from, to)
            insertionTr.steps.forEach(step => markRemovalTr.step(step))
            insertionTr = markRemovalTr
        } else {
            dispatchRemoveDiffdata(originalView, from, to)
        }
        merge.mergedDocMap = mergedDocMap
        insertionTr.setMeta('mapAppended', true)
        insertionTr.setMeta('notrack', true)
        mergeView.dispatch(insertionTr)
    }
}

export const removeDecoration = function (view, decorationId) {
    const tr = view.state.tr
    tr.setMeta("decorationId",decorationId)
    view.dispatch(tr)
}

export const deleteContent = function (merge, view, diffMark, mappingNeeded=true) {
    // const originalOnlineMapping = merge.onlineTr.mapping
    const rebasedMapping = new Mapping()
    const tr = view.state.tr
    if(mappingNeeded) {
        rebasedMapping.appendMapping(merge.mergedDocMap)
    }
    const rebasedFrom = rebasedMapping.map(diffMark.attrs.from),
    rebasedTo = rebasedMapping.map(diffMark.attrs.to)
    if(rebasedFrom && rebasedTo) {
        tr.delete(rebasedFrom,rebasedTo)
        merge.mergedDocMap.appendMapping(tr.mapping)
        tr.setMeta('mapAppended', true)
        tr.setMeta('notrack', true)
        view.dispatch(tr)
        return true
    }
    showSystemMessage(gettext("The change could not be applied automatically. Please consider using the copy option to copy the changes."))
    return false
}

export const addDeletedContentBack  = function (merge, view, diffMark) {
    const commonDoc = merge.cpDoc
    const tr = view.state.tr
    const slice = commonDoc.slice(diffMark.attrs.from,diffMark.attrs.to) 
    const rebasedMapping = new Mapping()
    rebasedMapping.appendMapping(merge.mergedDocMap)
    const insertionPoint = rebasedMapping.map(diffMark.attrs.from)
    console.log(insertionPoint,slice)
    if(insertionPoint) {
        tr.insert(insertionPoint,slice.content)
        tr.setMeta('mapAppended', true)
        tr.setMeta('notrack', true)
        view.dispatch(tr)
        merge.mergedDocMap.appendMapping(tr.mapping)
        return true
    }
    showSystemMessage(gettext("The change could not be applied automatically. Please consider using the copy option to copy the changes."))
    return false
}
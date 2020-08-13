import {TextSelection} from "prosemirror-state"
import {Mapping, Step} from 'prosemirror-transform'
import {__serializeForClipboard} from "prosemirror-view"
import {showSystemMessage} from "../../../../common"
import {dispatchRemoveDiffdata} from "../tools"

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
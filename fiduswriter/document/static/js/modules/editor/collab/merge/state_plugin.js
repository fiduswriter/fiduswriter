import {Plugin, PluginKey, TextSelection, NodeSelection} from "prosemirror-state"
import {Decoration, DecorationSet, __serializeForClipboard} from "prosemirror-view"
import {Mapping} from "prosemirror-transform"

import {noSpaceTmp, showSystemMessage} from "../../../common"
import {removeDiffdata, dispatchRemoveDiffdata} from "./tools"

function getdiffdata(state) {
    let markFound = state.selection.$head.marks().find(mark =>
        mark.type.name === 'diffdata')

    if (markFound === undefined) {
        markFound = {}
        const node = state.selection.$head.nodeBefore
        if (node  && node.attrs.diffdata && node.attrs.diffdata.length > 0) {
            markFound['attrs'] = {}
            markFound['attrs']['diff'] = node.attrs.diffdata[0].type
            markFound['attrs']['from'] = node.attrs.diffdata[0].from
            markFound['attrs']['to'] = node.attrs.diffdata[0].to
            markFound['attrs']['steps'] = node.attrs.diffdata[0].steps
        }
    }
    return markFound
}

function createHiglightDecoration(from, to, state) {
    /* Creates a yellow coloured highlight decoration when the user
    tries to look at a change */
    const inlineDeco = Decoration.inline(from, to, {class: 'selected-dec'})
    const deco = []
    deco.push(inlineDeco)
    state.doc.nodesBetween(
        from,
        to,
        (node, pos) => {
            if (pos < from || ['bullet_list', 'ordered_list'].includes(node.type.name)) {
                return true
            } else if (node.isInline) {
                return false
            }
            if (node && node.attrs.diffdata && node.attrs.diffdata.length > 0) {
                deco.push(Decoration.node(pos, pos + node.nodeSize, {class: 'selected-dec'}, {}))
            }
        }
    )
    return deco
}

function getDecos(merge, state) {
    /* Creates PM deco for the change popup */
    const $head = state.selection.$head
    const currentMarks = [],
        diffMark = $head.marks().find(
            mark => mark.type.name === 'diffdata'
        )
    const linkMark = $head.marks().find(
        mark => mark.type.name === 'link'
    )
    if (diffMark) {
        currentMarks.push(diffMark)
    }
    if (!currentMarks.length) {
        const node = state.selection instanceof NodeSelection ? state.selection.node : state.selection.$head.parent
        const markFound = {}
        if (node && node.attrs.diffdata && node.attrs.diffdata.length > 0) {
            markFound['attrs'] = {}
            markFound['attrs']['diff'] = node.attrs.diffdata[0].type
            markFound['attrs']['from'] = node.attrs.diffdata[0].from
            markFound['attrs']['to'] = node.attrs.diffdata[0].to
            markFound['attrs']['steps'] = JSON.stringify(node.attrs.diffdata[0].steps)
            const startPos = $head.pos// position of block start.
            const dom = createDropUp(merge, markFound, linkMark),
                deco = Decoration.widget(startPos, dom)
            const highlightDecos = createHiglightDecoration(markFound['attrs']["from"], markFound['attrs']["to"], state)
            highlightDecos.push(deco)
            return DecorationSet.create(state.doc, highlightDecos)
        }
        return DecorationSet.empty
    }
    const startPos = diffMark.attrs.to
    const dom = createDropUp(merge, diffMark, linkMark),
        deco = Decoration.widget(startPos, dom)
    const highlightDecos = createHiglightDecoration(diffMark.attrs.from, diffMark.attrs.to, state)
    highlightDecos.push(deco)
    return DecorationSet.create(state.doc, highlightDecos)
}

function rejectChanges(view, diffMark) {
    /* This function is used to reject a change */
    dispatchRemoveDiffdata(view, diffMark.attrs.from, diffMark.attrs.to)
}

function copyChange(view, from, to) {
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
        showSystemMessage(gettext('Change copied to clipboard'))
    } catch (ex) {
        showSystemMessage(gettext(
            'Copy to clipboard failed. Please copy manually.'
        ))
    }
    window.getSelection().removeAllRanges()
}

function acceptChanges(merge, mark, mergeView, originalView, tr) {
    /* This is used to accept a change either from the offline/online version or
    incase of deletion from the middle editor */
    try {
        const mergedDocMap = new Mapping()
        mergedDocMap.appendMapping(merge.mergedDocMap)
        let insertionTr = mergeView.state.tr
        const from = mark.attrs.from
        const to = mark.attrs.to
        const steps = JSON.parse(mark.attrs.steps)
        const stepMaps = tr.mapping.maps.slice().reverse().map(map=>map.invert())
        const rebasedMapping = new Mapping(stepMaps)
        rebasedMapping.appendMapping(mergedDocMap)
        for (const stepIndex of steps) {
            const maps = rebasedMapping.slice(tr.steps.length - stepIndex)
            const mappedStep = tr.steps[stepIndex].map(maps)
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
    } catch (exc) {
        showSystemMessage(gettext("The change could not be applied automatically. Please consider using the copy function to copy the changes."))
    }
}

function createDropUp(merge, diffMark, linkMark) {
    /* The actual function that creates a drop up */
    const dropUp = document.createElement('span'),
        requiredPx = 10,
        tr = diffMark.attrs.diff.search('offline') != -1 ? merge.offlineTr : merge.onlineTr
    let view
    if (diffMark.attrs.diff.search('offline') != -1) {
        if (diffMark.attrs.diff.search('inserted') != -1) {
            view = merge.mergeView1
        } else {
            view = merge.mergeView2
        }
    } else {
        if (diffMark.attrs.diff.search('inserted') != -1) {
            view = merge.mergeView3
        } else {
            view = merge.mergeView2
        }
    }
    linkMark = linkMark === undefined ? false : linkMark
    dropUp.classList.add('drop-up-outer')
    dropUp.innerHTML = noSpaceTmp`
        <div class="link drop-up-inner" style="top: -${requiredPx}px;">
            ${
    diffMark ?
        `<div class="drop-up-head">
                    ${
    diffMark.attrs.diff ?
        `<div class="link-title">${gettext('Change')}:&nbsp; ${ (diffMark.attrs.diff.search('deleted') != -1) ? (diffMark.attrs.diff.search('offline') != -1 ? gettext('Deleted by you') : gettext('Deleted by online users')) : ''}</div>` :
        ''
}
                    ${
    linkMark ? `<div> Link : ${linkMark.attrs.href}</div>` : ``
}
                    ${
    linkMark ? `<div> Type : ${linkMark.attrs.href[0] == "#" ? `internal` : `external`}</div>` : ``
}
                </div>
                <ul class="drop-up-options">
                    <li class="accept-change" title="${gettext('Accept change')}">
                        ${gettext('Accept Change')}
                    </li>
                    <li class="reject-change" title="${gettext('Reject change')}">
                        ${gettext('Reject Change')}
                    </li>
                    <li class="copy-data" title="${gettext('Copy content')}">
                        ${gettext('Copy')}
                    </li>
                </ul>` :
        ''
}
        </div>`

    const acceptChange = dropUp.querySelector('.accept-change')
    if (acceptChange) {
        acceptChange.addEventListener('mousedown',
            event => {
                event.preventDefault()
                event.stopImmediatePropagation()
                acceptChanges(merge, diffMark, merge.mergeView2, view, tr)
            }
        )
    }
    const rejectChange = dropUp.querySelector('.reject-change')
    if (rejectChange) {
        rejectChange.addEventListener('mousedown',
            () => {
                event.preventDefault()
                event.stopImmediatePropagation()
                rejectChanges(view, diffMark)
            }
        )
    }

    const copyData = dropUp.querySelector('.copy-data')
    if (copyData) {
        copyData.addEventListener('mousedown',
            event => {
                event.preventDefault()
                event.stopImmediatePropagation()
                copyChange(view, diffMark.attrs.from, diffMark.attrs.to)
            }
        )
    }
    return dropUp
}


const key = new PluginKey('mergeDiff')

export const diffPlugin = function(options) {

    return new Plugin({
        key,
        state: {
            init() {
                return {
                    decos: DecorationSet.empty,
                    diffMark: false
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos,
                    diffMark,
                } = this.getState(oldState)
                const newdiffdata = getdiffdata(state)
                if (newdiffdata === diffMark) {
                    decos = decos.map(tr.mapping, tr.doc)
                } else {
                    decos = getDecos(options.merge, state)
                    diffMark = newdiffdata
                }
                return {
                    decos,
                    diffMark,
                }
            }
        },
        props: {
            decorations(state) {
                const {
                    decos
                } = this.getState(state)
                return decos
            }
        },
        view(_view) {
            return {
                update: view => {
                    // Make sure that pop stays inside the view.
                    const changePopUp = view.dom.querySelector('.drop-up-outer')
                    if (changePopUp) {
                        const bounding = changePopUp.getBoundingClientRect()
                        const dialogBox = document.querySelector('#editor-merge-view')
                        if (dialogBox) {
                            if (bounding.right > dialogBox.offsetWidth || bounding.right > (window.innerWidth || document.documentElement.clientWidth)) {
                                changePopUp.style.left = '100px'
                            }
                        }
                    }
                }
            }
        }
    })
}

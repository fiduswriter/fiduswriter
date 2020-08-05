import {Plugin, PluginKey, NodeSelection} from "prosemirror-state"
import {Decoration, DecorationSet, __serializeForClipboard} from "prosemirror-view"
import {noSpaceTmp} from "../../../../common"
import {dispatchRemoveDiffdata, copyChange, acceptChanges , removeDecoration, deleteContent, addDeletedContentBack} from "../tools"
import {changeSet} from "../changeset"
import {DOMSerializer} from "prosemirror-model"

function onClick(event) {
    if (event.target.matches('.offline-deleted')) {
        const parentEl = event.target.closest('.deletion-decoration')
        const delPopup = document.body.querySelector("#editor-diff-offline").querySelectorAll(".drop-up-outer")
        if(delPopup) {
            delPopup.forEach(popUp => popUp.style.display = "none")
        }
        parentEl.querySelector(".drop-up-outer").style.display = "block"
    } else if (event.target.matches('.online-deleted')) {
        const parentEl = event.target.closest('.deletion-decoration')
        const delPopup = document.body.querySelector("#editor-diff-online").querySelectorAll(".drop-up-outer")
        if(delPopup) {
            delPopup.forEach(popUp => popUp.style.display = "none")
        }
        parentEl.querySelector(".drop-up-outer").style.display = "block"
    }
    else {
        const delPopUp = document.body.querySelectorAll(".deletion-decoration .drop-up-outer")
        if(delPopUp) {
            delPopUp.forEach(popUp => popUp.style.display = "none")
        }
    }
}


function handleClick(offlineEditor) {
    if(offlineEditor) {
        document.body.querySelector("#editor-diff-offline").addEventListener("click",onClick)
    } else {
        document.body.querySelector("#editor-diff-online").addEventListener("click",onClick)    
    }
}

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

function getDecos(decos,merge, state) {
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
            return decos.add(state.doc, highlightDecos)
        }
        decos = decos.remove(decos.find(null, null,
            spec => spec.type !== "deletion"))
        return decos
    }
    const startPos = diffMark.attrs.to
    const dom = createDropUp(merge, diffMark, linkMark),
        deco = Decoration.widget(startPos, dom)
    const highlightDecos = createHiglightDecoration(diffMark.attrs.from, diffMark.attrs.to, state)
    highlightDecos.push(deco)
    return decos.add(state.doc, highlightDecos)
}

function deletionDecorations(decos,changeset,schema,commonDoc,doc,mapping,merge,deletionClass) {
    let index = 0
    changeset.changes.forEach(change => {
        if(change.deleted.length>0) {
            let dom = document.createElement("span")
            const slice = commonDoc.slice(change.fromA,change.toA) 
            let deletedContent = DOMSerializer.fromSchema(schema).serializeFragment(slice.content) 
            dom.appendChild(deletedContent)
            
            dom.childNodes.forEach(children => {
                children.classList.add(deletionClass)
            })
            
            dom.querySelectorAll("span.footnote-marker").forEach((footnoteElement)=>{
                const newFnElement = document.createElement("footnote")
                newFnElement.dataset.footnote = footnoteElement.dataset.footnote
                newFnElement.classList.add("deleted-footnote-element")
                footnoteElement.parentNode.appendChild(newFnElement)
                footnoteElement.remove()
            })
            
            dom.querySelectorAll("tr").forEach((tableRow)=>{
                tableRow.querySelectorAll("span").forEach(children =>{
                    children.classList.add(deletionClass)
                })
                dom = tableRow
            })
            dom.querySelectorAll("td").forEach((tableRow)=>{
                tableRow.querySelectorAll("span").forEach(children =>{
                    children.classList.add(deletionClass)
                })
                dom = tableRow
            })

            // deletedContent = deletedContent.firstChild
            dom.classList.add(deletionClass)
            dom.classList.add("deletion-decoration")
            let stepsInvolved = []
            change.deleted.forEach(deletion => stepsInvolved.push(parseInt(deletion.data.step)))
            const stepsSet = new Set(stepsInvolved)
            stepsInvolved = Array.from(stepsSet)
            stepsInvolved.sort((a, b) => a - b)
            const deletionMark = schema.marks.diffdata.create({diff: deletionClass, steps: JSON.stringify(stepsInvolved), from: change.fromA, to: change.toA})
            const dropUp = createDropUp(merge,deletionMark,undefined)
            dropUp.dataset.decoid = index
            dropUp.style.display = "none"
            dom.appendChild(dropUp)
            decos = decos.add(doc, [
                Decoration.widget(mapping.map(change.fromA), dom, {type: "deletion", id:index})
            ])
            index+=1
        }
    })
    return decos

}

function createDropUp (merge, diffMark, linkMark) {
    /* The actual function that creates a drop up */
    const dropUp = document.createElement('span'),
        requiredPx = 10,
        tr = diffMark.attrs.diff.search('offline') != -1 ? merge.offlineTr : merge.onlineTr,
        trType = diffMark.attrs.diff.search('offline') != -1 ? "offline" : "online",
        opType = diffMark.attrs.diff.search('inserted') != -1 ? "insertion" : "deletion"
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
                if(trType == "online" ) {
                    if(opType == "insertion") {
                        dispatchRemoveDiffdata(merge.mergeView2, diffMark.attrs.from, diffMark.attrs.to)
                    } else {
                        // remove online deletion decoration
                        const decorationId = dropUp.dataset.decoid
                        removeDecoration(merge.mergeView2,decorationId)
                    }
                } else {
                    if(opType == "insertion") {
                        acceptChanges(merge, diffMark, merge.mergeView2, merge.mergeView3, tr)
                    } else {
                        // remove offline deletion decoration
                        const decorationId = dropUp.dataset.decoid
                        if(deleteContent(merge, merge.mergeView2, diffMark)){
                            removeDecoration(merge.mergeView3,decorationId)
                        }
                    }
                }
            }
        )
    }
    const rejectChange = dropUp.querySelector('.reject-change')
    if (rejectChange) {
        rejectChange.addEventListener('mousedown',
            () => {
                event.preventDefault()
                event.stopImmediatePropagation()
                if(trType == "online" ) {
                    if(opType == "insertion") {
                        // Delete inserted content
                        deleteContent(merge, merge.mergeView2, diffMark, true)
                    } else {
                        // remove online deletion decoration
                        if(addDeletedContentBack(merge, merge.mergeView2, diffMark)) {
                            const decorationId = dropUp.dataset.decoid
                            removeDecoration(merge.mergeView2,decorationId)
                        }
                    }
                } else {
                    if(opType == "insertion") {
                        dispatchRemoveDiffdata(merge.mergeView3, diffMark.attrs.from, diffMark.attrs.to)
                    } else {
                        // remove offline deletion decoration
                        dropUp.parentNode.classList.remove("offline-deleted")
                        dropUp.parentNode.querySelectorAll("span").forEach(ele => ele.classList.remove("offline-deleted"))
                        dropUp.parentNode.childNodes.forEach(children => {
                            children.classList.remove("offline-deleted")
                        })
                    }
                }
            }
        )
    }

    const copyData = dropUp.querySelector('.copy-data')
    if (copyData) {
        copyData.addEventListener('mousedown',
            event => {
                event.preventDefault()
                event.stopImmediatePropagation()
                if(trType == "online") {
                    copyChange(merge.mergeView2, diffMark.attrs.from, diffMark.attrs.to)
                } else {
                    copyChange(merge.mergeView3, diffMark.attrs.from, diffMark.attrs.to)
                }
            }
        )
    }
    return dropUp
}



export const key = new PluginKey('mergeDiff')

export const diffPlugin = function(options) {

    return new Plugin({
        key,
        state: {
            init(state) {
                let baseTr = false
                let deletionClass = false
                let isOfflineEditor = false
                let decos = DecorationSet.empty
                if(state.doc.eq(options.merge.offlineDoc)) {
                    baseTr = options.merge.offlineTr
                    deletionClass = "offline-deleted"
                    isOfflineEditor = true
                } else if (state.doc.eq(options.merge.onlineDoc)) {
                    baseTr = options.merge.onlineTr
                    deletionClass = "online-deleted"
                }
                if(baseTr) {
                    const Changeset = new changeSet(baseTr).getChangeSet()
                    decos =  deletionDecorations(decos,Changeset,options.merge.schema,options.merge.cpDoc,state.doc,baseTr.mapping,options.merge,deletionClass)
                }
                handleClick(isOfflineEditor)
                return {
                    baseTr: baseTr,
                    deletionClass:deletionClass,
                    decos: decos,
                    diffMark: false
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos,
                    diffMark,
                    baseTr,
                    deletionClass
                } = this.getState(oldState)
                const newdiffdata = getdiffdata(state)
                if (newdiffdata === diffMark) {
                    decos = decos.map(tr.mapping, tr.doc)
                } else {
                    decos = getDecos(decos,options.merge, state)
                    diffMark = newdiffdata
                }
                if(tr.getMeta("decorationId")) {
                    const decorationId = parseInt(tr.getMeta("decorationId"))
                    console.log("Deco getting removed!!!",decos,decos.find(null, null,
                        spec => spec.id == decorationId))
                    decos = decos.remove(decos.find(null, null,
                        spec => spec.id == decorationId))            
                }
                return {
                    decos,
                    diffMark,
                    baseTr,
                    deletionClass
                }
            }
        },
        props: {
            decorations(state) {
                const {
                    decos,baseTr,deletionClass
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

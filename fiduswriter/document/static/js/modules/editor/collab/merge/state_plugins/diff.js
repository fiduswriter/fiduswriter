import {Plugin, PluginKey, NodeSelection} from "prosemirror-state"
import {Decoration, DecorationSet, __serializeForClipboard} from "prosemirror-view"
import {noSpaceTmp} from "../../../../common"
import {dispatchRemoveDiffdata, addDeletionMarks} from "../tools"
import {copyChange, acceptChanges , removeDecoration, deleteContent, addDeletedContentBack, removeMarks} from "./action"
import {changeSet} from "../changeset"
import {DOMSerializer} from "prosemirror-model"
import {readOnlyFnEditor} from "../footnotes"

function createHiglightDecoration(from, to, state) {
    /* Creates a yellow coloured highlight decoration when the user
    tries to look at a change */
    let inlineDeco
    inlineDeco = Decoration.inline(from, to, {class: 'selected-dec'})
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

function createDeletionHighlight (decos, from, to, state,options) {
    /* Creates a yellow coloured highlight decoration when the user
    tries to look at a deletion change in offline editor */

    decos.find(from+1,to).forEach(deco =>{
        const decoId = deco.spec.id
        if(decoId !== undefined) {
            const specDecoration = options.merge.mergeView2.dom.querySelector('[data-decoid="'+decoId+'"]')
            const parentEl = specDecoration.closest('.deletion-decoration')
            parentEl.querySelectorAll(".online-deleted").forEach(ele=>{
                ele.classList.add("selected-dec")
                ele.classList.add("deletion-highlight")
            })
        }
    })
    let inlineDeco
    inlineDeco = Decoration.inline(from, to, {class: 'selected-dec'},{type:"deletion-highlight"})
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
            if (node.attrs.diffdata) {
                deco.push(Decoration.node(pos, pos + node.nodeSize, {class: 'selected-dec'}, {type:"deletion-highlight"}))
            }
        }
    )
    decos = decos.add(state.doc,deco)
    return decos
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
        } else if (node.marks.find(mark => mark.type.name == "diffdata")) {
            const mark = node.marks.find(mark => mark.type.name == "diffdata")
            const startPos = $head.pos// position of block start.
            const dom = createDropUp(merge, mark, linkMark),
                deco = Decoration.widget(startPos, dom)
            const highlightDecos = createHiglightDecoration(mark.attrs.from, mark.attrs.to, state)
            highlightDecos.push(deco)
            return decos.add(state.doc, highlightDecos)    
        }
        decos = decos.remove(decos.find(null, null,
            spec => {
                if(spec.type && spec.type == "deletion") {
                    return false
                } else {
                    return true
                }
            }))
        return decos
    }
    const startPos = diffMark.attrs.to
    const dom = createDropUp(merge, diffMark, linkMark),
        deco = Decoration.widget(startPos, dom)
    const highlightDecos = createHiglightDecoration(diffMark.attrs.from, diffMark.attrs.to, state)
    highlightDecos.push(deco)
    return decos.add(state.doc, highlightDecos)
}

function deletionDecorations(decos,merge,state,tr,deletionClass) {
    let index = 0
    let stepsTrackedByChangeset = []
    const changeset = new changeSet(tr).getChangeSet(),
    schema = merge.schema,
    commonDoc = merge.cpDoc,
    doc = state.doc,
    mapping = tr.mapping

    changeset.changes.forEach(change => {
        if(change.deleted.length>0) {
            let dom = document.createElement("span")
            const slice = commonDoc.slice(change.fromA,change.toA)

            // Apply the marks before trying to serialize!!!!
            let stepsInvolved = []
            change.deleted.forEach(deletion => stepsInvolved.push(parseInt(deletion.data.step)))
            const stepsSet = new Set(stepsInvolved)
            stepsInvolved = Array.from(stepsSet)
            stepsInvolved.sort((a, b) => a - b)
            stepsTrackedByChangeset = stepsTrackedByChangeset.concat(stepsInvolved)
            const deletionMark = schema.marks.diffdata.create({diff: deletionClass, steps: JSON.stringify(stepsInvolved), from: change.fromA, to: change.toA, markOnly:false})
            
            // Slice with marked contents
            const content = addDeletionMarks(slice,deletionMark,schema)
            let deletedContent = DOMSerializer.fromSchema(schema).serializeFragment(content) 
            
            // Parse HTML to accomodate minor changes
            if(deletedContent.querySelector("tr,td")){
                dom = document.createElement("tbody")
                dom.appendChild(deletedContent)
            } else {
                dom.appendChild(deletedContent)
            }
            dom.querySelectorAll("span.footnote-marker").forEach((footnoteElement)=>{
                const newFnElement = readOnlyFnEditor(footnoteElement)
                newFnElement.classList.add("deleted-footnote-element")
                newFnElement.classList.add(deletionClass)
                footnoteElement.parentNode.appendChild(newFnElement)
                footnoteElement.remove()
            })
            dom.classList.add("deletion-decoration")
            dom.dataset.delfrom = change.fromA
            dom.dataset.delto = change.toA
            
            const dropUp = createDropUp(merge,deletionMark,undefined)
            dropUp.dataset.decoid = index
            dropUp.style.display = "none"
            dom.appendChild(dropUp)

            // Put decoration in proper place. In case foootnote change ,original content is put first,
            //decoration is shown after the content
            let pos = mapping.map(change.fromA)
            if(change.lenA == change.lenB && stepsInvolved.length == 1) {
                const JSONSlice = slice.toJSON()
                if(JSONSlice.content && JSONSlice.content.length == 1 && JSONSlice.content[0].type === "footnote"){
                    pos+=1
                }
            }
            decos = decos.add(doc, [
                Decoration.widget(pos, dom, {type: "deletion", id:index})
            ])
            index+=1
        }
    })
    if(deletionClass == "offline-deleted") {
        merge.offlineTrackedSteps = merge.offlineTrackedSteps.concat(stepsTrackedByChangeset) 
    } else {
        merge.onlineTrackedSteps = merge.onlineTrackedSteps.concat(stepsTrackedByChangeset)
    }
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
                            merge.mergeView2.dispatch(merge.mergeView2.state.tr.setMeta("removeHighlight",true))
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
                        if(diffMark.attrs.markOnly) {
                            hanldeMarks(merge.mergeView2,diffMark,tr,merge.schema)
                            dispatchRemoveDiffdata(merge.mergeView2,diffMark.attrs.from,diffMark.attrs.to)
                        } else {
                            deleteContent(merge, merge.mergeView2, diffMark, false)
                        }
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
                        dropUp.parentNode.classList.remove("deletion-decoration")
                        dropUp.parentNode.querySelectorAll(".offline-deleted").forEach(ele=> {
                            ele.classList.remove("offline-deleted")
                            ele.classList.remove("selected-dec")
                        })
                        dropUp.remove()
                        merge.mergeView2.dispatch(merge.mergeView2.state.tr.setMeta("removeHighlight",true))
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
                    if(opType == "insertion") {
                        copyChange(merge.mergeView2, diffMark.attrs.from, diffMark.attrs.to)
                    } else {
                        copyChange(merge.mergeView1, diffMark.attrs.from, diffMark.attrs.to)
                    }
                } else {
                    if(opType == "insertion") {
                        copyChange(merge.mergeView3, diffMark.attrs.from, diffMark.attrs.to)
                    } else {
                        copyChange(merge.mergeView1, diffMark.attrs.from, diffMark.attrs.to)
                    }
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
                let decos = DecorationSet.empty
                if(state.doc.eq(options.merge.offlineDoc)) {
                    baseTr = options.merge.offlineTr
                    deletionClass = "offline-deleted"
                } else if (state.doc.eq(options.merge.onlineDoc)) {
                    baseTr = options.merge.onlineTr
                    deletionClass = "online-deleted"
                }
                if(baseTr) {
                    console.log("Tr:",baseTr)
                    decos =  deletionDecorations(decos,options.merge,state,baseTr,deletionClass)
                }
                return {
                    baseTr: baseTr,
                    deletionClass:deletionClass,
                    decos: decos
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos,
                    baseTr,
                    deletionClass
                } = this.getState(oldState)
                if(tr.getMeta("removeHighlight")) {
                    decos = decos.remove(decos.find(null, null,
                        spec => spec.type == "deletion-highlight"))  
                    // Remove the class set on deletion decorations
                    options.merge.mergeView2.dom.querySelectorAll(".selected-dec.deletion-highlight").forEach(ele => {
                        ele.classList.remove("selected-dec")
                        ele.classList.remove("deletion-highlight")
                    })       
                }
                decos = getDecos(decos,options.merge, state)
                decos = decos.map(tr.mapping, tr.doc)
                if(tr.getMeta("decorationId")) {
                    const decorationId = parseInt(tr.getMeta("decorationId"))
                    decos = decos.remove(decos.find(null, null,
                        spec => spec.id == decorationId))            
                }
                if(tr.getMeta("highlight")) {
                    const data = tr.getMeta("highlight")
                    const from = baseTr.mapping.map(parseInt(data.from))
                    const to = baseTr.mapping.map(parseInt(data.to))
                    if(from && to) {
                        decos = createDeletionHighlight(decos,from,to,state,options)
                    }   
                }
                return {
                    baseTr: baseTr,
                    deletionClass:deletionClass,
                    decos: decos
                }
            }
        },
        props: {
            handleClick:(view,pos,event) => {
                const delDeco = view.dom.querySelectorAll(".offline-deleted,.online-deleted")
                if(delDeco) {
                    delDeco.forEach(item => item.classList.remove("selected-dec"))
                }
                const delPopUp = view.dom.querySelectorAll(".deletion-decoration .drop-up-outer")
                if(delPopUp) {
                    delPopUp.forEach(popUp => popUp.style.display = "none")
                }
                const delFnToolTip = view.dom.querySelectorAll(".deleted-footnote-element") 
                if(delFnToolTip) {
                    delFnToolTip.forEach(tooltip => tooltip.childNodes[0].style.display = "none")
                }
                options.merge.mergeView2.dispatch(options.merge.mergeView2.state.tr.setMeta("removeHighlight",true))
                if (Boolean(event.target.closest('.offline-deleted'))) {
                    const parentEl = event.target.closest('.deletion-decoration')
                    const highlightEle = parentEl.querySelectorAll(".offline-deleted")
                    if(highlightEle)
                        highlightEle.forEach(ele => ele.classList.add("selected-dec"))
                    parentEl.querySelector(".drop-up-outer").style.display = "block"

                    // Add a decoration to highlight decoration to the online/merged view
                    options.merge.mergeView2.dispatch(options.merge.mergeView2.state.tr.setMeta("highlight",{from:parentEl.dataset.delfrom,to:parentEl.dataset.delto}))

                } else if (Boolean(event.target.closest('.online-deleted'))) {
                    const parentEl = event.target.closest('.deletion-decoration')
                    const highlightEle = parentEl.querySelectorAll(".online-deleted")
                    if(highlightEle)
                        highlightEle.forEach(ele => ele.classList.add("selected-dec"))
                    parentEl.querySelector(".drop-up-outer").style.display = "block"
                } 
                if (event.target.matches(".deleted-footnote-element")) {
                    event.target.childNodes[0].style.display = "block"
                }
            },
            decorations(state) {
                const {decos} = this.getState(state)
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

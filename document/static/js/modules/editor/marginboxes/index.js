import {findTarget} from "../../common"
import {marginBoxesTemplate, marginboxFilterTemplate} from "./templates"
import {getCommentDuringCreationDecoration, getSelectedChanges, getFootnoteMarkers} from "../state_plugins"

import fastdom from "fastdom"

/* Functions related to layouting of comments */
export class ModMarginboxes {
    constructor(editor) {
        editor.mod.marginboxes = this
        this.editor = editor
        this.setup()
        this.activeCommentStyle = ''
        this.filterOptions = {
            track: true,
            comments: true,
            help: true,
            commentsResolved: false,
            author: 0,
            assigned: 0
        }
        this.commentColors = {
            isMajor: '#f4c9d9',
            marker: '#f9f9f9',
            active: '#fffacf'
        }
        this.bindEvents()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        document.body.insertAdjacentHTML(
            'beforeend',
            '<style type="text/css" id="active-comment-style"></style><style type="text/css" id="margin-box-placement-style"></style>'
        )
    }

    bindEvents() {
        // Bind all the click events related to the margin box filter
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#margin-box-filter-comments-resolved', el):
                    this.filterOptions.commentsResolved = !this.filterOptions.commentsResolved
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '.margin-box-filter-comments-author', el):
                    this.filterOptions.author = parseInt(el.target.dataset.id)
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '.margin-box-filter-comments-assigned', el):
                    this.filterOptions.assigned = parseInt(el.target.dataset.id)
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '.show-marginbox-options-submenu', el):
                    this.closeAllMenus('.marginbox-options-submenu.fw-open')
                    Array.from(el.target.parentElement.children).find(node => node.matches('.marginbox-options-submenu')).classList.add('fw-open')
                    break
                case findTarget(event, '.show-marginbox-options', el):
                    this.closeAllMenus()
                    Array.from(el.target.parentElement.children).find(node => node.matches('.marginbox-options')).classList.add('fw-open')
                    break
                case findTarget(event, '#margin-box-filter-track', el):
                    this.filterOptions.track = !this.filterOptions.track
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '#margin-box-filter-comments', el):
                    this.filterOptions.comments = !this.filterOptions.comments
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '#margin-box-filter-help', el):
                    this.filterOptions.help = !this.filterOptions.help
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '.margin-box.comment.inactive', el):
                    this.editor.mod.comments.interactions.deactivateSelectedChanges()
                    this.editor.mod.comments.interactions.activateComment(el.target.dataset.id)
                    break
                case findTarget(event, '.margin-box.track.inactive', el):
                    this.editor.mod.track.activateTrack(
                        el.target.dataset.view,
                        el.target.dataset.type,
                        parseInt(el.target.dataset.pos)
                    )
                    break
                default:
                    this.closeAllMenus()
                    break
            }
        })
    }

    closeAllMenus(selector='.marginbox-options-submenu.fw-open, .marginbox-options.fw-open') {
        document.querySelectorAll(selector).forEach(
            el => el.classList.remove('fw-open')
        )
    }

    view(view) {
        // Give up if the user is currently editing a comment.
        if (this.editor.mod.comments.interactions.isCurrentlyEditing()) {
            return false
        }
        this.editor.mod.comments.interactions.activateSelectedComment(view)
    }

    updateDOM() {
        // Handle the layout of the comments on the screen.
        // DOM write phase

        const marginBoxes = [],
            referrers = [],
            selectedChanges = getSelectedChanges(this.editor.currentView.state)
        let fnIndex = 0,
            fnPosCount = 0,
            lastNodeTracks = [],
            lastNode = this.editor.view.state.doc

        this.activeCommentStyle = ''

        this.editor.view.state.doc.descendants(
            (node, pos) => {
                if (node.attrs.hidden) {
                    return false
                }
                lastNodeTracks = this.getMarginBoxes(node, pos, pos, lastNode, lastNodeTracks, 'main', marginBoxes, referrers, selectedChanges)
                lastNode = node

                if (node.type.name==='footnote') {
                    let lastFnNode = this.editor.mod.footnotes.fnEditor.view.state.doc,
                        lastFnNodeTracks = []
                    const footnote = lastFnNode.childCount > fnIndex ? lastFnNode.child(fnIndex) : false
                    if (!footnote) {
                        return
                    }
                    this.editor.mod.footnotes.fnEditor.view.state.doc.nodesBetween(
                        fnPosCount,
                        fnPosCount+footnote.nodeSize,
                        (fnNode, fnPos) => {
                            if (fnPos < fnPosCount) {
                                return false
                            }
                            lastFnNodeTracks = this.getMarginBoxes(fnNode, fnPos, pos, lastFnNode, lastFnNodeTracks, 'footnote', marginBoxes, referrers, selectedChanges)
                            lastFnNode = fnNode
                        }
                    )
                    fnIndex++
                    fnPosCount += footnote.nodeSize
                }
            }
        )

        // Add a comment that is currently under construction to the list.
        if (this.editor.mod.comments.store.commentDuringCreation) {
            const deco = getCommentDuringCreationDecoration(this.editor.view.state)
            let pos, view
            if (deco) {
                pos = deco.from
                view = 'main'
            } else {
                const fnDeco = getCommentDuringCreationDecoration(this.editor.mod.footnotes.fnEditor.view.state)
                if (fnDeco) {
                    pos = this.fnPosToPos(fnDeco.from)
                    view = 'footnote'
                }
            }
            if (pos) {
                const comment = this.editor.mod.comments.store.commentDuringCreation.comment
                let index = 0
                // // We need the position of the new comment in relation to the other
                // // comments in order to insert it in the right place
                while (referrers.length > index && referrers[index] < pos) {
                    index++
                }
                marginBoxes.splice(index, 0, {type: 'comment', data: comment, view, pos, active: true})
                referrers.splice(index, 0, pos)
                this.activeCommentStyle += '.active-comment, .active-comment .comment {background-color: #fffacf !important;}'
            }
        }

        const marginBoxesHTML = marginBoxesTemplate({
            marginBoxes,
            user: this.editor.user,
            docInfo: this.editor.docInfo,
            editComment: this.editor.mod.comments.interactions.editComment,
            activeCommentAnswerId: this.editor.mod.comments.interactions.activeCommentAnswerId,
            filterOptions: this.filterOptions,
            staticUrl: this.editor.staticUrl
        })
        if (document.getElementById('margin-box-container').innerHTML !== marginBoxesHTML) {
            document.getElementById('margin-box-container').innerHTML = marginBoxesHTML
        }

        if (document.getElementById('active-comment-style').innerHTML != this.activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = this.activeCommentStyle
        }

        const marginBoxFilterHTML = marginboxFilterTemplate({
            marginBoxes,
            filterOptions: this.filterOptions,
            docInfo: this.editor.docInfo
        })

        if (document.getElementById('margin-box-filter').innerHTML != marginBoxFilterHTML) {
            document.getElementById('margin-box-filter').innerHTML = marginBoxFilterHTML
        }

        return new Promise(resolve => {

            fastdom.measure(() => {
                // DOM read phase
                const marginBoxesDOM = document.querySelectorAll('#margin-box-container .margin-box')
                if (marginBoxesDOM.length !== referrers.length || !marginBoxesDOM.length) {
                    // Number of comment boxes and referrers differ.
                    // This isn't right. Abort.
                    resolve()
                    return
                }
                const bodyTop = document.body.getBoundingClientRect().top,
                    marginBoxPlacements = Array.from(marginBoxesDOM).map((mboxDOM, index) => {
                        const mboxDOMRect = mboxDOM.getBoundingClientRect()
                        return {
                            height: mboxDOMRect.height,
                            refPos: this.editor.view.coordsAtPos(referrers[index]).top - bodyTop
                        }
                    }),
                    firstActiveIndex = marginBoxes.findIndex(mBox => mBox.active),
                    firstActiveMboxPlacement = marginBoxPlacements[firstActiveIndex]

                let activeIndex = firstActiveIndex,
                    currentPos = 0
                while (activeIndex > -1) {
                    const mboxPlacement = marginBoxPlacements[activeIndex]
                    if (mboxPlacement.height === 0) {
                        mboxPlacement.pos = currentPos
                    } else if (mboxPlacement===firstActiveMboxPlacement) {
                        mboxPlacement.pos = mboxPlacement.refPos
                    } else {
                        mboxPlacement.pos = Math.min(
                            currentPos - 2 - mboxPlacement.height,
                            mboxPlacement.refPos
                    )
                    }
                    currentPos = mboxPlacement.pos
                    activeIndex--
                }
                if (firstActiveIndex > -1) {
                    currentPos = firstActiveMboxPlacement.pos + firstActiveMboxPlacement.height
                    activeIndex = firstActiveIndex + 1
                } else {
                    activeIndex = 0
                }

                while (activeIndex < marginBoxPlacements.length) {
                    const mboxPlacement = marginBoxPlacements[activeIndex]
                    mboxPlacement.pos = Math.max(currentPos + 2, mboxPlacement.refPos)
                    currentPos = mboxPlacement.pos + mboxPlacement.height
                    activeIndex++
                }

                const initialOffset = document.body.classList.contains('header-closed') ? 91 + 60 : 200 + 60
                let totalOffset = 0

                const marginBoxesPlacementStyle = marginBoxPlacements.map((mboxPlacement, index) => {
                    if (mboxPlacement.height === 0) {
                        return ''
                    }
                    const pos = mboxPlacement.pos - initialOffset
                    let css = ''
                    if (pos !== totalOffset) {
                        const topMargin = parseInt(pos - totalOffset)
                        css += `.margin-box:nth-of-type(${(index+1)}) {margin-top: ${topMargin}px;}\n`
                        totalOffset += topMargin
                    }
                    totalOffset += mboxPlacement.height + 2
                    return css
                }).join('')

                fastdom.mutate(() => {
                    //DOM write phase
                    if (document.getElementById('margin-box-placement-style').innerHTML != marginBoxesPlacementStyle) {
                        document.getElementById('margin-box-placement-style').innerHTML = marginBoxesPlacementStyle
                    }
                    if (this.editor.mod.comments.store.commentDuringCreation) {
                        this.editor.mod.comments.store.commentDuringCreation.inDOM = true
                    }
                    resolve()
                })
            })

        })

    }

    fnPosToPos(fnPos) {
        const fnIndex = this.editor.mod.footnotes.fnEditor.view.state.doc.resolve(fnPos).index(0),
            fnMarker = getFootnoteMarkers(this.editor.view.state)[fnIndex]

        return fnMarker.from
    }

    getMarginBoxes(node, pos, refPos, lastNode, lastNodeTracks, view, marginBoxes, referrers, selectedChanges) {


        if (node.attrs.help) { // Help/instruction margin boxes
            marginBoxes.push(Object.assign({
                type: 'help',
                data: node.attrs.help
            }))
            referrers.push(refPos)
        }

        const commentIds = node.isInline || node.isLeaf ? this.editor.mod.comments.interactions.findCommentIds(node) : []

        const nodeTracks = node.attrs.track ?
            node.attrs.track.map(track => {
                const nodeTrack = {type: track.type, data: {user: track.user, username: track.username, date: track.date}}
                if (track.type==='block_change') {
                    nodeTrack.data.before = track.before
                }
                return nodeTrack
            }) :
            node.marks.filter(mark =>
                ['deletion', 'format_change'].includes(mark.type.name) ||
                (mark.type.name==='insertion' && !mark.attrs.approved)
            ).map(mark => ({type: mark.type.name, data: mark.attrs}))

        // Filter out trackmarks already present in the last node (if it's an inline node).
        const tracks = node.isInline === lastNode.isInline ?
            nodeTracks.filter(track =>
                !lastNodeTracks.find(
                    lastTrack =>
                        track.type===lastTrack.type &&
                        track.data.user===lastTrack.data.user &&
                        track.data.date===lastTrack.data.date &&
                        (
                            node.isInline || // block level changes almost always need new boxes
                            (node.type.name === 'paragraph' && lastNode.type.name === 'list_item' && lastTrack.type === 'insertion') // Don't show first paragraphs in list items.
                        ) &&
                        (
                            ['insertion', 'deletion'].includes(track.type) ||
                            (
                                track.type === 'format_change' &&
                                track.data.before.length===lastTrack.data.before.length &&
                                track.data.after.length===lastTrack.data.after.length &&
                                track.data.before.every(markName => lastTrack.data.before.includes(markName)) &&
                                track.data.after.every(markName => lastTrack.data.after.includes(markName))
                            ) ||
                            (
                                track.type === 'block_change' &&
                                track.data.before.type===lastTrack.data.before.type &&
                                track.data.before.attrs.level===lastTrack.data.before.attrs.level
                            )
                        )
                )
            ) :
            nodeTracks
        tracks.forEach(track => {
            marginBoxes.push(Object.assign({
                node,
                pos,
                view,
                active: selectedChanges[track.type] && selectedChanges[track.type].from === pos
            }, track))
            referrers.push(refPos)
        })

        if (!commentIds.length && !tracks.length) {
            return nodeTracks
        }
        commentIds.forEach(commentId => {
            const comment = this.editor.mod.comments.store.findComment(commentId)
            if (!comment || (!this.filterOptions.commentsResolved && comment.resolved)) {
                // We have no comment with this ID. Ignore the referrer.
                return
            }
            if (marginBoxes.find(marginBox => marginBox.data===comment)) {
                // comment already placed
                return
            }
            const active = comment.id === this.editor.mod.comments.interactions.activeCommentId
            if (this.filterOptions.comments) {
                if (active) {
                    this.activeCommentStyle +=
                        `.comment[data-id="${comment.id}"], .comment[data-id="${comment.id}"] .comment {background-color: ${this.commentColors.active} !important;}`
                } else if (comment.isMajor) {
                    this.activeCommentStyle +=
                        `#paper-editable .comment[data-id="${comment.id}"] {background-color: ${this.commentColors.isMajor};}`
                } else {
                    this.activeCommentStyle +=
                        `#paper-editable .comment[data-id="${comment.id}"] {background-color: ${this.commentColors.marker};}`
                }
            }
            marginBoxes.push({type: 'comment', data: comment, pos, view, active})
            referrers.push(refPos)
        })

        return nodeTracks
    }

}

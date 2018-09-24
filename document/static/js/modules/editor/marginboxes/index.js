import {findTarget} from "../../common"
import {marginBoxesTemplate} from "./templates"
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
            commentsResolved: false
        }
        this.bindEvents()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        document.head.insertAdjacentHTML(
            'beforeend',
            '<style type="text/css" id="active-comment-style"></style><style type="text/css" id="margin-box-placement-style"></style>'
        )
    }

    bindEvents() {
        // Bind all the click events related to the margin box filter
        document.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#filter-track', el):
                    this.filterOptions.track = el.target.querySelector('input').checked
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '#filter-comments', el):
                    this.filterOptions.comments = el.target.querySelector('input').checked
                    this.view(this.editor.currentView)
                    break
                case findTarget(event, '#filter-comments-resolved', el):
                    this.filterOptions.commentsResolved = el.target.querySelector('input').checked
                    this.view(this.editor.currentView)
                    break
                default:
                    break
            }
        })
    }


    view(view) {
        // Give up if the user is currently editing a comment.
        if (this.editor.mod.comments.interactions.isCurrentlyEditing()) {
            return false
        }
        this.editor.mod.comments.interactions.activateSelectedComment(view)
        return this.updateDOM()
    }

    updateDOM() {
        // Handle the layout of the comments on the screen.
        // DOM write phase

        let marginBoxes = [],
            referrers = [],
            lastNodeTracks = [],
            lastNode = this.editor.view.state.doc,
            fnIndex = 0,
            fnPosCount = 0,
            selectedChanges = getSelectedChanges(this.editor.currentView.state)
        this.activeCommentStyle = ''

        marginBoxes.push({type: 'filter', data: this.filterOptions})
        referrers.push(0)

        this.editor.view.state.doc.descendants(
            (node, pos) => {
                lastNodeTracks = this.getMarginBoxes(node, pos, pos, lastNode, lastNodeTracks, 'main', marginBoxes, referrers, selectedChanges)
                lastNode = node

                if (node.type.name==='footnote') {
                    let lastFnNode = this.editor.mod.footnotes.fnEditor.view.state.doc,
                        footnote = lastFnNode.childCount > fnIndex ? lastFnNode.child(fnIndex) : false,
                        lastFnNodeTracks = []
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
        if(this.editor.mod.comments.store.commentDuringCreation) {
            let deco = getCommentDuringCreationDecoration(this.editor.view.state), pos, view
            if (deco) {
                pos = deco.from
                view = 'main'
            } else {
                let fnDeco = getCommentDuringCreationDecoration(this.editor.mod.footnotes.fnEditor.view.state)
                if (fnDeco) {
                    pos = this.fnPosToPos(fnDeco.from)
                    view = 'footnote'
                }
            }
            if (pos) {
                let comment = this.editor.mod.comments.store.commentDuringCreation.comment
                let index = 0
                // // We need the position of the new comment in relation to the other
                // // comments in order to insert it in the right place
                while (referrers.length > index && referrers[index] < pos) {
                    index++
                }
                marginBoxes.splice(index, 0, {type: 'comment', data: comment, view, pos, active: true})
                referrers.splice(index, 0, pos)
                this.activeCommentStyle += '.comments-enabled .active-comment, .comments-enabled .active-comment .comment {background-color: #fffacf !important;}'
            }
        }

        const marginBoxesHTML = marginBoxesTemplate({
            marginBoxes,
            user: this.editor.user,
            docInfo: this.editor.docInfo,
            editComment: this.editor.mod.comments.interactions.editComment,
            activeCommentAnswerId: this.editor.mod.comments.interactions.activeCommentAnswerId,
            filterOptions: this.filterOptions
        })
        if (document.getElementById('margin-box-container').innerHTML !== marginBoxesHTML) {
            document.getElementById('margin-box-container').innerHTML = marginBoxesHTML
        }

        if (document.getElementById('active-comment-style').innerHTML != this.activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = this.activeCommentStyle
        }

        return new Promise(resolve => {

            fastdom.measure(() => {
                // DOM read phase
                let marginBoxesDOM = document.querySelectorAll('#margin-box-container .margin-box')
                if (marginBoxesDOM.length !== referrers.length || !marginBoxesDOM.length) {
                    // Number of comment boxes and referrers differ.
                    // This isn't right. Abort.
                    resolve()
                    return
                }
                let marginBoxPlacements = Array.from(marginBoxesDOM).map((mboxDOM, index) => {
                        let mboxDOMRect = mboxDOM.getBoundingClientRect()
                        return {
                            height: mboxDOMRect.height,
                            refPos: this.editor.view.coordsAtPos(referrers[index]).top
                        }
                    }),
                    firstActiveIndex = marginBoxes.findIndex(mBox => mBox.active),
                    firstActiveMboxPlacement = marginBoxPlacements[firstActiveIndex],
                    activeIndex = firstActiveIndex,
                    currentPos = 0

                while (activeIndex > -1) {
                    let mboxPlacement = marginBoxPlacements[activeIndex]
                    if (mboxPlacement.height === 0) {
                        mboxPlacement.pos = currentPos - 10
                    } else if (mboxPlacement===firstActiveMboxPlacement) {
                        mboxPlacement.pos = mboxPlacement.refPos
                    } else {
                        mboxPlacement.pos = Math.min(currentPos - 10 - mboxPlacement.height, mboxPlacement.refPos)
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
                    let mboxPlacement = marginBoxPlacements[activeIndex]
                    mboxPlacement.pos = Math.max(currentPos + 10, mboxPlacement.refPos)
                    currentPos = mboxPlacement.pos + mboxPlacement.height
                    activeIndex++
                }

                let initialOffset = document.getElementById('margin-box-container').getBoundingClientRect().top + 10,
                    totalOffset = 0


                let marginBoxesPlacementStyle = marginBoxPlacements.map((mboxPlacement, index) => {
                    let pos = mboxPlacement.pos - initialOffset, css = ''
                    if (pos !== totalOffset) {
                        let topMargin = parseInt(pos - totalOffset)
                        css += `.margin-box:nth-of-type(${(index+1)}) {margin-top: ${topMargin}px;}\n`
                        totalOffset += topMargin
                    }
                    totalOffset += mboxPlacement.height + 10
                    return css
                }).join('')

                fastdom.mutate(() => {
                    //DOM write phase
                    if (document.getElementById('margin-box-placement-style').innerHTML != marginBoxesPlacementStyle) {
                        document.getElementById('margin-box-placement-style').innerHTML = marginBoxesPlacementStyle
                    }
                    if(this.editor.mod.comments.store.commentDuringCreation) {
                        this.editor.mod.comments.store.commentDuringCreation.inDOM = true
                    }
                    resolve()
                })
            })

        })

    }

    fnPosToPos(fnPos) {
        let fnIndex = this.editor.mod.footnotes.fnEditor.view.state.doc.resolve(fnPos).index(0),
            fnMarker = getFootnoteMarkers(this.editor.view.state)[fnIndex]

        return fnMarker.from
    }

    getMarginBoxes(node, pos, refPos, lastNode, lastNodeTracks, view, marginBoxes, referrers, selectedChanges) {
        let commentIds = node.isInline || node.isLeaf ? this.editor.mod.comments.interactions.findCommentIds(node) : []

        let nodeTracks = node.attrs.track ?
            node.attrs.track.map(track => {
                let nodeTrack = {type: track.type, data: {user: track.user, username: track.username, date: track.date}}
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
        let tracks = node.isInline === lastNode.isInline ?
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
            let comment = this.editor.mod.comments.store.findComment(commentId)
            if (!comment) {
                // We have no comment with this ID. Ignore the referrer.
                return
            }
            if (marginBoxes.find(marginBox =>marginBox.data===comment)) {
                // comment already placed
                return
            }
            let active = comment.id === this.editor.mod.comments.interactions.activeCommentId
            if (active) {
                this.activeCommentStyle +=
                    `.comments-enabled .comment[data-id="${comment.id}"], .comments-enabled .comment[data-id="${comment.id}"] .comment {background-color: #fffacf !important;}`
            } else {
                this.activeCommentStyle +=
                    `.comments-enabled .comment[data-id="${comment.id}"] {background-color: #f2f2f2;}`
            }
            marginBoxes.push({type: 'comment', data: comment, pos, view, active})
            referrers.push(refPos)
        })

        return nodeTracks
    }

}

import {marginBoxesTemplate} from "./templates"
import {Comment} from "../comments/comment"
import {getCommentDuringCreationDecoration, getSelectedChanges} from "../state_plugins"

import fastdom from "fastdom"

/* Functions related to layouting of comments */
export class ModMarginboxes {
    constructor(editor) {
        editor.mod.marginboxes = this
        this.editor = editor
        this.setup()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        document.head.insertAdjacentHTML(
            'beforeend',
            '<style type="text/css" id="active-comment-style"></style><style type="text/css" id="margin-box-placement-style"></style>'
        )
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

        let marginBoxes = [], referrers = [], activeCommentStyle = '', lastNodeTrackMarks = []

        this.editor.view.state.doc.descendants((node, pos, parent) => {
            if (!node.isInline && !node.isLeaf) {
                return
            }
            let commentIds = this.editor.mod.comments.interactions.findCommentIds(node)

            let nodeTrackMarks = node.marks.filter(mark =>
                mark.type.name==='deletion' ||
                (mark.type.name==='insertion' && !mark.attrs.approved)
            )

            // Filter out trackmarks already present in the last node.
            let trackMarks = nodeTrackMarks.filter(mark =>
                !lastNodeTrackMarks.find(
                    lastMark => mark.type.name===lastMark.type.name &&
                    mark.attrs.user===lastMark.attrs.user &&
                    mark.attrs.date===lastMark.attrs.date
                )
            )

            lastNodeTrackMarks = nodeTrackMarks

            if (!commentIds.length && !trackMarks.length) {
                return
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
                if (comment.id === this.editor.mod.comments.interactions.activeCommentId) {
                    activeCommentStyle +=
                        `.comments-enabled .comment[data-id="${comment.id}"], .comments-enabled .comment[data-id="${comment.id}"] .comment {background-color: #fffacf !important;}`
                } else {
                    activeCommentStyle +=
                        `.comments-enabled .comment[data-id="${comment.id}"] {background-color: #f2f2f2;}`
                }
                marginBoxes.push({type: 'comment', data: comment})
                referrers.push(pos)
            })
            trackMarks.forEach(mark => {
                marginBoxes.push({type: mark.type.name, data: Object.assign({}, mark.attrs), pos})
                referrers.push(pos)
            })
        })
        // Add a comment that is currently under construction to the list.
        if(this.editor.mod.comments.store.commentDuringCreation) {
            let deco = getCommentDuringCreationDecoration(this.editor.view.state)
            if (deco) {
                let pos = deco.from
                let comment = this.editor.mod.comments.store.commentDuringCreation.comment
                let index = 0
                // We need the position of the new comment in relation to the other
                // comments in order to insert it in the right place
                while (referrers[index] < pos) {
                    index++
                }
                marginBoxes.splice(index, 0, {type: 'comment', data: comment})
                referrers.splice(index, 0, pos)
                activeCommentStyle += '.comments-enabled .active-comment, .comments-enabled .active-comment .comment {background-color: #fffacf !important;}'
            }
        }

        let marginBoxesHTML = marginBoxesTemplate({
            marginBoxes,
            user: this.editor.user,
            docInfo: this.editor.docInfo,
            selectedChanges: getSelectedChanges(this.editor.view.state),
            activeCommentId: this.editor.mod.comments.interactions.activeCommentId,
            activeCommentAnswerId: this.editor.mod.comments.interactions.activeCommentAnswerId
        })
        if (document.getElementById('margin-box-container').innerHTML !== marginBoxesHTML) {
            document.getElementById('margin-box-container').innerHTML = marginBoxesHTML
        }


        if (document.getElementById('active-comment-style').innerHTML != activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = activeCommentStyle
        }

        return new Promise(resolve => {

            fastdom.measure(() => {
                // DOM read phase
                let totalOffset = document.getElementById('margin-box-container').getBoundingClientRect().top + 10,
                    marginBoxes = document.querySelectorAll('#margin-box-container .margin-box'),
                    marginBoxesPlacementStyle = ''
                if (marginBoxes.length !== referrers.length) {
                    // Number of comment boxes and referrers differ.
                    // This isn't right. Abort.
                    resolve()
                    return
                }
                referrers.forEach((referrer, index) => {
                    let marginBox = marginBoxes[index]
                    if (marginBox.classList.contains("hidden")) {
                        return
                    }
                    let marginBoxCoords = marginBox.getBoundingClientRect(),
                        marginBoxHeight = marginBoxCoords.height,
                        referrerTop = this.editor.view.coordsAtPos(referrer).top,
                        topMargin = 10

                    if (referrerTop > totalOffset) {
                        topMargin = parseInt(referrerTop - totalOffset)
                        marginBoxesPlacementStyle += '.margin-box:nth-of-type('+(index+1)+') {margin-top: ' + topMargin + 'px;}\n'
                    }
                    totalOffset += marginBoxHeight + topMargin
                })
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

}

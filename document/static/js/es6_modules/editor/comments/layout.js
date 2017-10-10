import {commentsTemplate, filterByUserBoxTemplate} from "./templates"
import {Comment} from "./comment"
import {getCommentDuringCreationDecoration} from "../statePlugins"

import fastdom from "fastdom"

/* Functions related to layouting of comments */
export class ModCommentLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        this.setup()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `
        <style type="text/css" id="active-comment-style"></style>
        <style type="text/css" id="comment-placement-style"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
    }


    activateComment(id) {
        this.deactivateAll()
        this.activeCommentId = id
    }

    deactivateAll() {
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        // If there is a comment currently under creation, remove it.
        this.mod.store.removeCommentDuringCreation()
    }

    findCommentIds(node) {
        return node.marks.filter(
            mark => mark.type.name === 'comment' && mark.attrs.id
        ).map(mark => mark.attrs.id)
    }

    findComment(id) {
        let found = false
        if (id in this.mod.store.comments) {
            found = this.mod.store.comments[id]
        }
        return found
    }

    findCommentsAt(node) {
        let ids = this.findCommentIds(node)
        return ids.map(id => this.findComment(id))
    }


    layoutComments() {
        return this.updateDOM()
    }

    isCurrentlyEditing() {
        // Returns true if
        // A) a comment form is currently open
        // B) the comment answer edit form is currently open
        // C) part of a new answer has been written
        // D) the focus is currently in new answer text area of a comment
        // E) a new comment form is about to be displayed, but the updateDOM
        // call has not yet been made.
        if (this.activeCommentId !== false) {
            if (jQuery('.commentText:visible').length > 0) {
                // a comment form is currently open
                return true
            }
            if (jQuery('.submit-comment-answer-edit').length > 0) {
                // a comment answer edit form is currently open
                return true
            }
            let answerForm = jQuery('.comment-answer-text:visible')
            if (answerForm.length > 0 && answerForm.val().length > 0) {
                // Part of an answer to a comment has been entered.
                return true
            }
            if (answerForm.length > 0 && answerForm.is(':focus')) {
                // There is currently focus in the comment answer form
                return true
            }
            if (this.mod.store.commentDuringCreation.inDOM === false) {
                // A new comment is about to be created, but it has not
                // yet been added to the DOM.
                return true
            }
        }
        return false
    }

    view() {
        // Give up if the user is currently editing a comment.
        if (this.isCurrentlyEditing()) {
            return false
        }
        this.activateSelectedComment()
        return this.updateDOM()
    }

    // Activate the comments included in the selection or the comment where the
    // caret is placed, if the editor is in focus.
    activateSelectedComment() {

        let selection = this.mod.editor.view.state.selection, comments = []

        if (selection.empty) {
            let node = this.mod.editor.view.state.doc.nodeAt(selection.from)
            if (node) {
                comments = this.findCommentsAt(node)
            }
        } else {
            this.mod.editor.view.state.doc.nodesBetween(
                selection.from,
                selection.to,
                (node, pos, parent) => {
                    if (!node.isInline) {
                        return
                    }
                    comments = comments.concat(this.findCommentsAt(node))
                }
            )
        }

        if (comments.length) {
            if (this.activeCommentId !== comments[0].id) {
              this.activateComment(comments[0].id)
            }
        } else {
            this.deactivateAll()
        }
    }

    updateDOM() {
        // Handle the layout of the comments on the screen.
        // DOM write phase

        let theComments = [], referrers = [], activeCommentStyle = ''

        this.mod.editor.view.state.doc.descendants((node, pos, parent) => {
            if (!node.isInline && !node.isLeaf) {
                return
            }
            let commentIds = this.findCommentIds(node)
            if (!commentIds.length) {
                return
            }
            commentIds.forEach(commentId => {
                let comment = this.findComment(commentId)
                if (!comment) {
                    // We have no comment with this ID. Ignore the referrer.
                    return
                }
                if (theComments.includes(comment)) {
                    // comment already placed
                    return
                }
                if (comment.id === this.activeCommentId) {
                    activeCommentStyle +=
                        `.comments-enabled .comment[data-id="${comment.id}"], .comments-enabled .comment[data-id="${comment.id}"] .comment {background-color: #fffacf !important;}`
                } else {
                    activeCommentStyle +=
                        `.comments-enabled .comment[data-id="${comment.id}"] {background-color: #f2f2f2;}`
                }
                theComments.push(comment)
                referrers.push(pos)
            })
        })
        // Add a comment that is currently under construction to the list.
        if(this.mod.store.commentDuringCreation) {
            let deco = getCommentDuringCreationDecoration(this.mod.editor.view.state)
            if (deco) {
                let pos = deco.from
                let comment = this.mod.store.commentDuringCreation.comment
                let index = 0
                // We need the position of the new comment in relation to the other
                // comments in order to insert it in the right place
                while (referrers[index] < pos) {
                    index++
                }
                theComments.splice(index, 0, comment)
                referrers.splice(index, 0, pos)
                activeCommentStyle += '.comments-enabled .active-comment, .comments-enabled .active-comment .comment {background-color: #fffacf !important;}'
            }
        }

        let commentsTemplateHTML = commentsTemplate({
            theComments,
            editor: this.mod.editor,
            activeCommentId: this.activeCommentId,
            activeCommentAnswerId: this.activeCommentAnswerId
        })
        if (document.getElementById('comment-box-container').innerHTML !== commentsTemplateHTML) {
            document.getElementById('comment-box-container').innerHTML = commentsTemplateHTML
        }


        if (document.getElementById('active-comment-style').innerHTML != activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = activeCommentStyle
        }

        return new Promise(resolve => {

            fastdom.measure(() => {
                // DOM read phase
                let totalOffset = document.getElementById('comment-box-container').getBoundingClientRect().top + 10,
                    commentBoxes = document.querySelectorAll('#comment-box-container .comment-box'),
                    commentPlacementStyle = ''
                if (commentBoxes.length !== referrers.length) {
                    // Number of comment boxes and referrers differ.
                    // This isn't right. Abort.
                    resolve()
                    return
                }
                referrers.forEach((referrer, index) => {
                    let commentBox = commentBoxes[index]
                    if (commentBox.classList.contains("hidden")) {
                        return
                    }
                    let commentBoxCoords = commentBox.getBoundingClientRect(),
                        commentBoxHeight = commentBoxCoords.height,
                        referrerTop = this.mod.editor.view.coordsAtPos(referrer).top,
                        topMargin = 10

                    if (referrerTop > totalOffset) {
                        topMargin = parseInt(referrerTop - totalOffset)
                        commentPlacementStyle += '.comment-box:nth-of-type('+(index+1)+') {margin-top: ' + topMargin + 'px;}\n'
                    }
                    totalOffset += commentBoxHeight + topMargin
                })
                fastdom.mutate(() => {
                    //DOM write phase
                    if (document.getElementById('comment-placement-style').innerHTML != commentPlacementStyle) {
                        document.getElementById('comment-placement-style').innerHTML = commentPlacementStyle
                    }
                    if(this.mod.store.commentDuringCreation) {
                        this.mod.store.commentDuringCreation.inDOM = true
                    }
                    resolve()
                })
            })

        })

    }

}

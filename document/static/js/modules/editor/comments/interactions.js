import {getCommentDuringCreationDecoration} from "../state_plugins"
import {REVIEW_ROLES} from ".."

/* Functions related to user interactions with comments */
export class ModCommentInteractions {
    constructor(mod) {
        mod.interactions = this
        this.mod = mod
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        this.bindEvents()
    }

    bindEvents() {
        // Bind all the click events related to comments
        let that = this
        jQuery(document).on("click", ".submitComment", function() {
            that.submitComment(this)
        })
        jQuery(document).on("click", ".cancelSubmitComment", function() {
            that.cancelSubmitComment(this)
        })
        jQuery(document).on("click", ".margin-box.inactive", function() {
            let id = that.getCommentId(this)
            that.activateComment(id)
            that.mod.editor.mod.marginboxes.updateDOM()
        })

        jQuery(document).on('click', '.edit-comment', function() {
            let activeWrapper = document.querySelector('.margin-box.active')
            activeWrapper.querySelector('.comment-text-wrapper').classList.add('editing')
            activeWrapper.querySelector('textarea').value = activeWrapper.querySelector('.comment-p').innerText
        })

        jQuery(document).on('click', '.edit-comment-answer', function() {
            that.editAnswer(
                parseInt(this.dataset.id),
                parseInt(this.dataset.answer)
            )
        })

        jQuery(document).on('click', '.submit-comment-answer-edit',
            function() {
                that.submitAnswerEdit(this.previousElementSibling)
            })

        jQuery(document).on(
            "click",
            ".comment-answer-submit",
            () => this.submitAnswer()
        )

        jQuery(document).on('click', '.delete-comment', function() {
            that.deleteComment(parseInt(this.dataset.id))
        })

        jQuery(document).on('click', '.delete-comment-answer', function() {
            that.deleteCommentAnswer(
                parseInt(this.dataset.id),
                parseInt(this.dataset.answer)
            )
        })
    }

    findCommentIds(node) {
        return node.marks.filter(
            mark => mark.type.name === 'comment' && mark.attrs.id
        ).map(mark => mark.attrs.id)
    }

    findCommentsAt(node) {
        return this.findCommentIds(node).map(id => this.mod.store.findComment(id))
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


    isCurrentlyEditing() {
        // Returns true if
        // A) a comment form is currently open
        // B) the comment answer edit form is currently open
        // C) part of a new answer has been written
        // D) the focus is currently in new answer text area of a comment
        // E) a new comment form is about to be displayed, but the updateDOM
        // call has not yet been made.
        if (this.activeCommentId !== false) {
            if (document.querySelector('.commentText')) {
                // a comment form is currently open
                return true
            }
            if (document.querySelector('.submit-comment-answer-edit')) {
                // a comment answer edit form is currently open
                return true
            }
            let answerForm = document.querySelector('.comment-answer-text')
            if (answerForm && answerForm.value.length) {
                // Part of an answer to a comment has been entered.
                return true
            }
            if (answerForm && answerForm.matches(':focus')) {
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


    // Create a temporary empty comment for the current user that is not shared
    // with collaborators.
    createNewComment() {
        this.deactivateAll()
        this.mod.store.addCommentDuringCreation()
        this.activeCommentId = -1
        this.mod.editor.mod.marginboxes.updateDOM().then(
            () => {
                let commentBox = document.querySelector('.margin-box.active .commentText')
                if (commentBox) {
                    commentBox.focus()
                }
            }
        )

    }

    getCommentId(node) {
        // Returns the value of the attributte data-id as an integer.
        // This function can be used on both comment referrers and comment boxes.
        return parseInt(node.dataset.id)
    }

    deleteComment(id) {
        if (id===-1) {
            this.deactivateAll()
        } else {
            // Handle the deletion of a comment.
            this.mod.store.deleteComment(id, true)
        }
        this.mod.editor.mod.marginboxes.updateDOM()
    }


    updateComment(id, commentText, isMajor) {
        // Save the change to a comment and mark that the document has been changed
        if (id===-1) {
            let referrer = getCommentDuringCreationDecoration(this.mod.editor.view.state)
            // This is a new comment. We need to get an ID for it if it has contents.

            let username

            if(REVIEW_ROLES.includes(this.mod.editor.docInfo.access_rights)) {
                username = `${gettext('Reviewer')} ${this.mod.editor.user.id}`
            } else {
                username = this.mod.editor.user.username
            }


            this.mod.store.addComment(
                {
                    user: this.mod.editor.user.id,
                    username,
                    date: Date.now()-this.mod.editor.clientTimeAdjustment, // We update the time to the time the comment was stored
                    comment: commentText,
                    isMajor
                },
                referrer.from,
                referrer.to
            )
        } else {
            this.mod.store.updateComment(id, commentText, isMajor)
        }
        this.deactivateAll()
        this.mod.editor.mod.marginboxes.updateDOM()

    }

    submitComment(submitButton) {
        // Handle a click on the submit button of the comment submit form.
        let commentTextBox = submitButton.parentElement.querySelector('.commentText'),
            commentText = commentTextBox.value,
            isMajor = submitButton.parentElement.querySelector('.comment-is-major').checked,
            id = this.getCommentId(commentTextBox)
        if (commentText.length > 0) {
            this.updateComment(id, commentText, isMajor)
        } else {
            this.deleteComment(id)
        }

    }

    cancelSubmitComment(cancelButton) {
        // Handle a click on the cancel button of the comment submit form.
        let commentTextBox = cancelButton.parentElement.querySelector('.commentText')
        if (commentTextBox) {
            let id = this.getCommentId(commentTextBox)
            if (id===-1 || this.mod.store.comments[id].comment.length === 0) {
                this.deleteComment(id)
            } else {
                this.deactivateAll()
            }
        } else {
            this.deactivateAll()
        }
        this.mod.editor.mod.marginboxes.updateDOM()
    }

    deleteCommentAnswer(id, answerId) {
        // Handle the deletion of a comment answer.
        this.mod.store.deleteAnswer(id, answerId)
        this.deactivateAll()
        this.mod.editor.mod.marginboxes.updateDOM()
    }

    submitAnswer() {
        // Submit the answer to a comment
        let commentWrapper = document.querySelector('.margin-box.active'),
            answerTextBox = commentWrapper.querySelector('.comment-answer-text'),
            answerText = answerTextBox.value,
            id = parseInt(commentWrapper.dataset.id)
        this.createNewAnswer(id, answerText)
    }

    editAnswer(id, answerId) {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        this.activeCommentId = id
        this.activeCommentAnswerId = answerId
        this.mod.editor.mod.marginboxes.updateDOM()
    }

    createNewAnswer(id, answerText) {
        // Create a new answer to add to the comment store

        let username

        if(REVIEW_ROLES.includes(this.mod.editor.docInfo.access_rights)) {
            username = `${gettext('Reviewer')} ${this.mod.editor.user.id}`
        } else {
            username = this.mod.editor.user.username
        }

        let answer = {
            answer: answerText,
            user: this.mod.editor.user.id,
            username,
            date: Date.now()-this.mod.editor.clientTimeAdjustment
        }

        this.mod.store.addAnswer(id, answer)

        this.deactivateAll()
        this.mod.editor.mod.marginboxes.updateDOM()
    }

    submitAnswerEdit(textArea) {
        let id = parseInt(textArea.dataset.id),
            answerId = parseInt(textArea.dataset.answer),
            theValue = textArea.value

        this.submitAnswerUpdate(id, answerId, theValue)
    }

    submitAnswerUpdate(id, answerId, commentText) {
        this.mod.store.updateAnswer(id, answerId, commentText)
        this.deactivateAll()
        this.mod.editor.mod.marginboxes.updateDOM()
    }
}

import {getCommentDuringCreationDecoration} from "../state_plugins"
import {REVIEW_ROLES} from ".."

/* Functions related to user interactions with comments */
export class ModCommentInteractions {
    constructor(mod) {
        mod.interactions = this
        this.mod = mod
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
        jQuery(document).on("click", ".comment-box.inactive", function() {
            let id = that.getCommentId(this)
            that.mod.layout.activateComment(id)
            that.mod.layout.layoutComments()
        })

        jQuery(document).on('click', '.edit-comment', function() {
            let activeWrapper = document.querySelector('.comment-box.active')
            activeWrapper.querySelector('.comment-p').style.display = ''
            activeWrapper.querySelector('.comment-form').style.display = 'none'
            activeWrapper.querySelector('.comment-controls').style.display = ''
            let btnParent = this.parentElement
            let commentTextWrapper = btnParent.previousElementSibling
            let commentP = commentTextWrapper.querySelector('.comment-p')
            let commentForm = commentTextWrapper.querySelector('.comment-form')
            btnParent.parentElement.parentElement.querySelector('.comment-answer').style.display = 'none'
            btnParent.style.display = 'none'
            commentP.style.display = 'none'
            commentForm.style.display = ''
            commentForm.querySelector('textarea').value = commentP.innerText
        })

        jQuery(document).on('click', '.edit-comment-answer', function() {
            that.editAnswer(parseInt(this.getAttribute(
                'data-id')), parseInt(this.getAttribute(
                'data-answer')))
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
            that.deleteComment(parseInt(this.getAttribute(
                'data-id')))
        })

        jQuery(document).on('click', '.delete-comment-answer', function() {
            that.deleteCommentAnswer(parseInt(this.getAttribute(
                'data-id')), parseInt(this.getAttribute(
                'data-answer')))
        })


    }

    // Create a temporary empty comment for the current user that is not shared
    // with collaborators.
    createNewComment() {
        this.mod.layout.deactivateAll()
        this.mod.store.addCommentDuringCreation()
        this.mod.layout.activeCommentId = -1
        this.mod.layout.layoutComments().then(
            () => {
                let commentBox = document.querySelector('.comment-box.active .commentText')
                if (commentBox) {
                    commentBox.focus()
                }
            }
        )

    }

    getCommentId(node) {
        // Returns the value of the attributte data-id as an integer.
        // This function can be used on both comment referrers and comment boxes.
        return parseInt(node.getAttribute('data-id'), 10)
    }

    deleteComment(id) {
        if (id===-1) {
            this.mod.layout.deactivateAll()
        } else {
            // Handle the deletion of a comment.
            this.mod.store.deleteComment(id, true)
        }
        this.mod.layout.layoutComments()
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
        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()

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
                this.mod.layout.deactivateAll()
            }
        } else {
            this.mod.layout.deactivateAll()
        }
        this.mod.layout.layoutComments()
    }

    deleteCommentAnswer(id, answerId) {
        // Handle the deletion of a comment answer.
        this.mod.store.deleteAnswer(id, answerId)
        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()
    }

    submitAnswer() {
        // Submit the answer to a comment
        let commentWrapper = document.querySelector('.comment-box.active'),
            answerTextBox = commentWrapper.querySelector('.comment-answer-text'),
            answerText = answerTextBox.value,
            id = parseInt(commentWrapper.attr('data-id'))
        this.createNewAnswer(id, answerText)
    }

    editAnswer(id, answerId) {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        this.mod.layout.activeCommentId = id
        this.mod.layout.activeCommentAnswerId = answerId
        this.mod.layout.layoutComments()
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

        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()
    }

    submitAnswerEdit(textArea) {
        let id = parseInt(textArea.getAttribute('data-id')),
            answerId = parseInt(textArea.getAttribute('data-answer')),
            theValue = textArea.value

        this.submitAnswerUpdate(id, answerId, theValue)
    }

    submitAnswerUpdate(id, answerId, commentText) {
        this.mod.store.updateAnswer(id, answerId, commentText)
        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()
    }
}

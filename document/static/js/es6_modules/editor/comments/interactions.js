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
            let commentId = that.getCommentId(this)
            that.mod.layout.activateComment(commentId)
            that.mod.layout.layoutComments()
        })

        jQuery(document).on('click', '.edit-comment', function() {
            let activeWrapper = jQuery('.comment-box.active')
            activeWrapper.find('.comment-p').show()
            activeWrapper.find('.comment-form').hide()
            activeWrapper.find('.comment-controls').show()
            let btnParent = jQuery(this).parent()
            let commentTextWrapper = btnParent.siblings(
                '.comment-text-wrapper')
            let commentP = commentTextWrapper.children('.comment-p')
            let commentForm = commentTextWrapper.children('.comment-form')
            btnParent.parent().siblings('.comment-answer').hide()
            btnParent.hide()
            commentP.hide()
            commentForm.show()
            commentForm.children('textarea').val(commentP.text())
        })

        jQuery(document).on('click', '.edit-comment-answer', function() {
            that.editAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')))
        })

        jQuery(document).on('click', '.submit-comment-answer-edit',
            function() {
                that.submitAnswerEdit(jQuery(this).prev())
            })

        jQuery(document).on(
            "click",
            ".comment-answer-submit",
            () => this.submitAnswer()
        )

        jQuery(document).on('click', '.delete-comment', function() {
            that.deleteComment(parseInt(jQuery(this).attr(
                'data-id')))
        })

        jQuery(document).on('click', '.delete-comment-answer', function() {
            that.deleteCommentAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')))
        })


    }

    // Create a temporary empty comment for the current user that is not shared
    // with collaborators.
    createNewComment() {
        this.mod.layout.deactivateAll()
        this.mod.store.addCommentDuringCreation()
        this.mod.layout.activeCommentId = -1
        this.mod.layout.layoutComments()
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
            this.mod.editor.docInfo.changed = true
        }
        this.mod.layout.layoutComments()
    }


    updateComment(id, commentText, commentIsMajor) {
        // Save the change to a comment and mark that the document has been changed
        if (id===-1) {
            // This is a new comment. We need to get an ID for it if it has contents.
            this.mod.store.addComment(
                this.mod.editor.user.id,
                this.mod.editor.user.name,
                this.mod.editor.user.avatar,
                new Date().getTime(), // We update the time to the time the comment was stored
                commentText,
                commentIsMajor,
                this.mod.store.commentDuringCreation.referrer.from,
                this.mod.store.commentDuringCreation.referrer.to
            )
        } else {
            this.mod.store.updateComment(id, commentText, commentIsMajor)
        }
        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()

    }

    submitComment(submitButton) {
        // Handle a click on the submit button of the comment submit form.
        let commentTextBox = jQuery(submitButton).siblings('.commentText')[0]
        let commentText = commentTextBox.value
        let commentIsMajor = jQuery(submitButton).siblings('.comment-is-major').prop('checked')
        let commentId = this.getCommentId(commentTextBox)
        if (commentText.length > 0) {
            this.updateComment(commentId, commentText, commentIsMajor)
        } else {
            this.deleteComment(commentId)
        }

    }

    cancelSubmitComment(cancelButton) {
        // Handle a click on the cancel button of the comment submit form.
        let commentTextBox = jQuery(cancelButton).siblings('.commentText')[0]
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

    deleteCommentAnswer(commentId, answerId) {
        // Handle the deletion of a comment answer.
        this.mod.store.deleteAnswer(commentId, answerId)
        this.mod.layout.deactivateAll()
        this.mod.editor.docInfo.changed = true
        this.mod.layout.layoutComments()
    }

    submitAnswer() {
        // Submit the answer to a comment
        let commentWrapper = jQuery('.comment-box.active')
        let answerTextBox = commentWrapper.find('.comment-answer-text')[0]
        let answerText = answerTextBox.value
        let commentId = parseInt(commentWrapper.attr('data-id'))
        this.createNewAnswer(commentId, answerText)
    }

    editAnswer(id, answerId) {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        this.mod.layout.activeCommentId = id
        this.mod.layout.activeCommentAnswerId = answerId
        this.mod.layout.layoutComments()
    }

    createNewAnswer(commentId, answerText) {
        // Create a new answer to add to the comment store
        let answer = {
            commentId: commentId,
            answer: answerText,
            user: this.mod.editor.user.id,
            userName: this.mod.editor.user.name,
            userAvatar: this.mod.editor.user.avatar,
            date: new Date().getTime()
        }

        this.mod.store.addAnswer(commentId, answer)

        this.mod.layout.deactivateAll()
        this.mod.layout.layoutComments()
        this.mod.editor.docInfo.changed = true
    }

    submitAnswerEdit(textArea) {
        let commentId = parseInt(textArea.attr('data-id'))
        let answerId = parseInt(textArea.attr('data-answer'))
        let theValue = textArea.val()

        this.submitAnswerUpdate(commentId, answerId, theValue)
    }

    submitAnswerUpdate(commentId, answerId, commentText) {
        this.mod.store.updateAnswer(commentId, answerId, commentText)
        this.mod.layout.deactivateAll()
        this.mod.editor.docInfo.changed = true
        this.mod.layout.layoutComments()
    }
}

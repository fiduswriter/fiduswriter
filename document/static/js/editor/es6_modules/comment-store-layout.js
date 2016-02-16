/* Functions related to layouting of comments */

import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"

export class CommentStoreLayout {
    constructor(commentStore) {
        commentStore.layout = this
        this.commentStore = commentStore
    }

    // Create a new comment as the current user, and mark it as active.
    createNewComment() {
        let id = this.commentStore.addComment(theUser.id, theUser.name, theUser.avatar, new Date().getTime(), '')
        this.deactivateAll()
        theDocument.activeCommentId = id
        editorHelpers.documentHasChanged()
        scheduleDOMUpdate(this.commentStore.pm, this.layoutComments)
    }

    deleteComment(id) {
        // Handle the deletion of a comment.
        var comment = this.findComment(id) // TODO: We don't use this for anything.
        this.commentStore.deleteComment(id)
//      TODO: make the markrange go away
        editorHelpers.documentHasChanged()
        this.layoutComments()
    }

    activateComment(id) {
        // Deactivate all comments, then makr the one currently open as active.
        this.deactivateAll()
        theDocument.activeCommentId = id
    }

    deactivateAll() {
        // Close the comment box and make sure no comment is marked as currently active.
        delete theDocument.activeCommentId
        delete theDocument.activeCommentAnswerId
    }

    updateComment(id, commentText, commentIsMajor) {
        // Save the change to a comment and mark that the document has been changed
        this.commentStore.updateComment(id, commentText, commentIsMajor)
        this.deactivateAll()
        this.layoutComments()
    }

    deleteCommentAnswer(commentId, answerId) {
        // Handle the deletion of a comment answer.
        this.commentStore.deleteAnswer(commentId, answerId)
        this.deactivateAll()
        editorHelpers.documentHasChanged()
        this.layoutComments()
    }


    layoutCommentsAvoidOverlap() {
        // Avoid overlapping of comments.
        var minOffsetTop,
            commentReferrer,
            lastOffsetTop,
            previousComments,
            nextComments,
            commentBox,
            initialCommentBox,
            foundComment,
            i

        if (undefined != theDocument.activeCommentId) {
            commentReferrer = this.findComment(theDocument.activeCommentId)
            initialCommentBox = this.findCommentBox(theDocument.activeCommentId)
            if (!initialCommentBox) {
              return false
            }
            lastOffsetTop = initialCommentBox.offsetTop
            previousComments = []
            nextComments = jQuery.makeArray(jQuery('.comment'))
            while (nextComments.length > 0) {
                foundComment = nextComments.shift()
                if (foundComment === commentReferrer) {
                    break
                }
                else {
                    previousComments.unshift(foundComment)
                }
            }

            for (i = 0; i < previousComments.length; i++) {
                commentBox = this.findCommentBox(this.getCommentId(previousComments[i]))
                if (commentBox) {
                    minOffsetTop = lastOffsetTop - commentBox.offsetHeight - 10
                    if (commentBox.offsetTop > minOffsetTop) {
                        jQuery(commentBox).css('top', minOffsetTop + 'px')
                    }
                    lastOffsetTop = commentBox.offsetTop;
                }
            }

            minOffsetTop = initialCommentBox.offsetTop + initialCommentBox.offsetHeight + 10
        }
        else {
            minOffsetTop = 0
            nextComments = jQuery('.comment')
        }
        for (i = 0; i < nextComments.length; i++) {
            commentBox = this.findCommentBox(this.getCommentId(nextComments[i]))
           if (commentBox) {
                if (commentBox.offsetTop < minOffsetTop) {
                    jQuery(commentBox).css('top', minOffsetTop + 'px')
                }
                minOffsetTop = commentBox.offsetTop + commentBox.offsetHeight + 10
           }
        }
    }

    layoutComments() {
        // Handle the layout of the comments on the screen.
        var theCommentPointers = [].slice.call(jQuery('.comment')),
            activeCommentWrapper, theComments = [], ids = []

        theCommentPointers.forEach(function(commentNode){
          var id = parseInt(commentNode.getAttribute("data-id"))
          if (ids.indexOf(id) !== -1) {
            // This is not the first occurence of this comment. So we ignore it.
            return
          }
          ids.push(id)
          if (theEditor.editor.mod.commentStore.comments[id]) {
            theComments.push({
              id: id,
              referrer: commentNode,
              comment: theEditor.editor.mod.commentStore.comments[id]['comment'],
              user: theEditor.editor.mod.commentStore.comments[id]['user'],
              userName: theEditor.editor.mod.commentStore.comments[id]['userName'],
              userAvatar: theEditor.editor.mod.commentStore.comments[id]['userAvatar'],
              date: theEditor.editor.mod.commentStore.comments[id]['date'],
              answers: theEditor.editor.mod.commentStore.comments[id]['answers'],
                'review:isMajor': theEditor.editor.mod.commentStore.comments[id]['review:isMajor']
            })
          }

        })

        jQuery('#comment-box-container').html(tmp_comments({
            theComments: theComments
        }))
        this.layoutCommentsAvoidOverlap()
        jQuery('#active-comment-style').html('')
        activeCommentWrapper = jQuery('.comment-box.active')
        if (0 < activeCommentWrapper.size()) {
            theDocument.activeCommentId = activeCommentWrapper.attr(
                'data-id')
            jQuery('#active-comment-style').html(
                '.comments-enabled .comment[data-id="' + theDocument.activeCommentId + '"] ' +
                '{background-color: #fffacf;}')
            activeCommentWrapper.find('.comment-answer-text').autoResize({
                'extraSpace': 0
            })
        }

    }

    submitAnswer() {
        // Submit the answer to a comment
        var commentWrapper, answerTextBox, answerText, answerParent

        commentWrapper = jQuery('.comment-box.active')
        answerTextBox = commentWrapper.find('.comment-answer-text')[0]
        answerText = answerTextBox.value
        commentId = parseInt(commentWrapper.attr('data-id'))
        this.createNewAnswer(commentId, answerText)
    }

    editAnswer(id, answerId) {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        theDocument.activeCommentId = id
        theDocument.activeCommentAnswerId = answerId
        this.layoutComments()
    }

    calculateCommentBoxOffset(comment) {
        return comment.referrer.getBoundingClientRect()['top'] + window.pageYOffset - 280
    }


    findComment(id) {
        // Return the comment element specified by the id
        return jQuery('.comment[data-id=' + id + ']')[0]
    }

    findCommentBox(id) {
        // Return the comment box specified by the id
        return jQuery('.comment-box[data-id=' + id + ']')[0]
    }


    getCommentId(node) {
        // Returns the value of the attributte data-id as an integer.
        // This function can be used on both comment referrers and comment boxes.
        return parseInt(node.getAttribute('data-id'), 10)
    }

    createNewAnswer(commentId, answerText) {
        // Create a new answer to add to the comment store
        let answer = {
          commentId: commentId,
          answer: answerText,
          user: theUser.id,
          userName: theUser.name,
          userAvatar: theUser.avatar,
          date: new Date().getTime()
        }

        this.commentStore.addAnswer(commentId, answer)

        this.deactivateAll()
        this.layoutComments()
        editorHelpers.documentHasChanged()
    }

    submitAnswerUpdate(commentId, answerId, commentText) {
        this.commentStore.updateAnswer(commentId, answerId, commentText)
        this.commentStore.layout.deactivateAll()
        editorHelpers.documentHasChanged()
        this.layoutComments()
    }

}

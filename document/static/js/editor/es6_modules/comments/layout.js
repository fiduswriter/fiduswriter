/* Functions related to layouting of comments */

import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"

export class ModCommentLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {
        let that = this
        // Bind all the click events related to comments
        jQuery(document).on("click", ".submitComment", function(){that.submitComment(this)})
        jQuery(document).on("click", ".cancelSubmitComment", function(){that.cancelSubmitComment(this)})
        jQuery(document).on("click", ".comment-box.inactive", function () {
            let commentId = that.getCommentId(this)
            that.activateComment(commentId)
            that.layoutComments()
        })
        jQuery(document).on("click", ".comments-enabled .comment", function () {
            let commentId = that.getCommentId(this)
            that.activateComment(commentId)
            that.layoutComments()
        })

        jQuery(document).on('click', '.edit-comment', function () {
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

        jQuery(document).on('click', '.edit-comment-answer', function () {
            that.editAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')))
        })

        jQuery(document).on('click', '.submit-comment-answer-edit',
            function () {
                let textArea = jQuery(this).prev()
                let commentId = parseInt(textArea.attr('data-id'))
                let answerId = parseInt(textArea.attr('data-answer'))
                let theValue = textArea.val()
                that.submitAnswerUpdate(commentId, answerId, theValue)
            })

        jQuery(document).on("click", ".comment-answer-submit", function () {
            that.submitAnswer();
        })

        jQuery(document).on('click', '.delete-comment', function () {
            that.deleteComment(parseInt(jQuery(this).attr(
                'data-id')))
        })

        jQuery(document).on('click', '.delete-comment-answer', function () {
            that.deleteCommentAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')))
        })

        // Handle comments show/hide

        jQuery(document).on('click', '#comments-display:not(.disabled)',
            function () {
                jQuery(this).toggleClass('selected') // what should this look like? CSS needs to be defined
                jQuery('#comment-box-container').toggleClass('hide')
                jQuery('#flow').toggleClass('comments-enabled')
                jQuery('.toolbarcomment button').toggleClass('disabled')
            })

        jQuery(document).on('mousedown', '#comments-filter label', function (event) {
            event.preventDefault()
            let filterType = jQuery(this).attr("data-filter")

            switch (filterType) {
                case 'r':
                case 'w':
                case 'e':
                case 'c':
                    that.filterByUserType(filterType)
                    break
                case 'username':
                    that.filterByUserDialog()
                    break
            }

        })
    }

    // Create a new comment as the current user, and mark it as active.
    createNewComment() {
        let that = this
        let id = this.mod.store.addComment(theUser.id, theUser.name, theUser.avatar, new Date().getTime(), '')
        this.deactivateAll()
        theDocument.activeCommentId = id
        editorHelpers.documentHasChanged()
        scheduleDOMUpdate(this.mod.pm, function(){that.layoutComments()})
    }

    deleteComment(id) {
        // Handle the deletion of a comment.
        var comment = this.findComment(id) // TODO: We don't use this for anything.
        this.mod.store.deleteComment(id)
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
        this.mod.store.updateComment(id, commentText, commentIsMajor)
        this.deactivateAll()
        this.layoutComments()
    }

    submitComment(submitButton) {
        // Handle a click on the submit button of the comment submit form.
        let commentTextBox = jQuery(submitButton).siblings('.commentText')[0]
        let commentText = commentTextBox.value
        let commentIsMajor = jQuery(submitButton).siblings('.comment-is-major').prop('checked')
        let commentId = this.mod.layout.getCommentId(commentTextBox)
        this.updateComment(commentId, commentText, commentIsMajor)
    }

    cancelSubmitComment(cancelButton) {
        // Handle a click on the cancel button of the comment submit form.
        let commentTextBox = jQuery(cancelButton).siblings('.commentText')[0]
        if (commentTextBox) {
            let id = this.getCommentId(commentTextBox)
            if (this.mod.store.comments[id].comment.length === 0) {
                this.deleteComment(id)
            }
            else {
                this.deactivateAll()
            }
        }
        else {
            this.deactivateAll()
        }
        this.layoutComments()
    }

    deleteCommentAnswer(commentId, answerId) {
        // Handle the deletion of a comment answer.
        this.mod.store.deleteAnswer(commentId, answerId)
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
        let that = this
        let theCommentPointers = [].slice.call(jQuery('.comment')), theComments = [], ids = []

        theCommentPointers.forEach(function(commentNode){
            let id = parseInt(commentNode.getAttribute("data-id"))
            if (ids.indexOf(id) !== -1) {
              // This is not the first occurence of this comment. So we ignore it.
                return
            }
            ids.push(id)
            if (that.mod.store.comments[id]) {
                theComments.push({
                  id: id,
                  referrer: commentNode,
                  comment: that.mod.store.comments[id]['comment'],
                  user: that.mod.store.comments[id]['user'],
                  userName: that.mod.store.comments[id]['userName'],
                  userAvatar: that.mod.store.comments[id]['userAvatar'],
                  date: that.mod.store.comments[id]['date'],
                  answers: that.mod.store.comments[id]['answers'],
                    'review:isMajor': that.mod.store.comments[id]['review:isMajor']
                })
            }
        })

        jQuery('#comment-box-container').html(tmp_comments({
            theComments: theComments
        }))
        this.layoutCommentsAvoidOverlap()
        jQuery('#active-comment-style').html('')
        let activeCommentWrapper = jQuery('.comment-box.active')
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
        let commentWrapper = jQuery('.comment-box.active')
        let answerTextBox = commentWrapper.find('.comment-answer-text')[0]
        let answerText = answerTextBox.value
        let commentId = parseInt(commentWrapper.attr('data-id'))
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

        this.mod.store.addAnswer(commentId, answer)

        this.deactivateAll()
        this.layoutComments()
        editorHelpers.documentHasChanged()
    }

    submitAnswerUpdate(commentId, answerId, commentText) {
        this.mod.store.updateAnswer(commentId, answerId, commentText)
        this.mod.layout.deactivateAll()
        editorHelpers.documentHasChanged()
        this.layoutComments()
    }

    /**
     * Filtering part. akorovin
     */
    filterByUserType(userType) {
        //filter by user role (reader, editor, reviewer etc)
        let userRoles = theDocument.access_rights
        let idsOfNeededUsers = []

        jQuery.each(userRoles, function(index, user) {
            if (user.rights == userType) {
                idsOfNeededUsers.push(user.user_id)
            }
        })

        jQuery("#comment-box-container").children().each(function() {
            var userId = parseInt(jQuery(this).attr("data-user-id"), 10)
            if ($.inArray(userId, idsOfNeededUsers) !== -1) {
                jQuery(this).show()
            }
            else {
                jQuery(this).hide()
            }
        })
    }

    filterByUserDialog() {
        //create array of roles + owner role
        let rolesCopy = theDocument.access_rights.slice()
        rolesCopy.push({
            user_name: theDocument.owner.name,
            user_id: theDocument.owner.id
        })

        let users = {
            users: rolesCopy
        }

        jQuery('body').append(tmp_filter_by_user_box(users))
        let diaButtons = {}
        diaButtons[gettext('Filter')] = function () {
            let id = jQuery(this).children("select").val()
            if (id == undefined) {
                return
            }

            let boxesToHide = jQuery("#comment-box-container").children("[data-user-id!='" + id + "']").hide()
            //let boxesToHide = jQuery("#comment-box-container").children("[data-user-id='" + id + "']").show()

            //TODO: filtering
            jQuery(this).dialog("close")
        }

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
        }

        jQuery("#comment-filter-byuser-box").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function () {
                jQuery("#comment-filter-byuser-box").detach()
            },
            buttons: diaButtons,
            create: function () {
                let $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
            }
        })
    }


}

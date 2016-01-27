/**
 * @file Helper functions for commenting system.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */
(function () {
    var exports = this,
         /** Fidus Writer commenting system.
         * @namespace commentHelpers
         */
        commentHelpers = {};

    commentHelpers.calculateCommentBoxOffset = function (comment) {

        return comment.referrer.getBoundingClientRect()['top'] + window.pageYOffset - 280;
    };

    commentHelpers.resetOffsetCalculator = function () {
        delete commentHelpers.pageMeasures;
    };

    commentHelpers.findActive = function () {
        // Go through the list of comments, and return the comment specified by the id
        return theDocument.activeCommentId;
    };

    commentHelpers.findComment = function (id) {
        // Go through the list of comments, and return the comment specified by the id
        return jQuery('.comment[data-id=' + id + ']')[0];
    };

    commentHelpers.findCommentBox = function (id) {
        // Go through the list of comments, and return the comment specified by the id
        return jQuery('.comment-box[data-id=' + id + ']')[0];
    };


    commentHelpers.getCommentId = function (node) {
        // Returns the value of the attributte data-id as an integer.
        // This function can be used on both comment referrers and comment boxes.
        return parseInt(node.getAttribute('data-id'), 10);
    };

    commentHelpers.createNewComment = function () {
        // Create a new comment, and mark it as active.

        var id = theEditor.comments.addComment(theUser.id, theUser.name, theUser.avatar, new Date().getTime(), '');

        commentHelpers.deactivateAll();
        theDocument.activeCommentId = id;
        theEditor.editor.on("flushed", commentHelpers.layoutComments);
        editorHelpers.documentHasChanged();
    };


    commentHelpers.createNewAnswer = function (commentId, answerText) {
        var answer = {
          commentId: commentId,
          answer: answerText,
          user: theUser.id,
          userName: theUser.name,
          userAvatar: theUser.avatar,
          date: new Date().getTime()
        }

        theEditor.comments.addAnswer(commentId, answer);

        commentHelpers.deactivateAll();
        commentHelpers.layoutComments();
        editorHelpers.documentHasChanged();
    };


    commentHelpers.activateComment = function (id) {
        // Find the comment that is currently opened.
        commentHelpers.deactivateAll();
        theDocument.activeCommentId = id;

    };

    commentHelpers.deactivateAll = function () {
        // Close the comment box and make sure no comment is marked as currently active.
        delete theDocument.activeCommentId;
        delete theDocument.activeCommentAnswerId;
    };

    commentHelpers.updateComment = function (id, commentText, commentIsMajor) {
        // Save the change to a comment and mark that the document has been changed
        theEditor.comments.updateComment(id, commentText, commentIsMajor);
        commentHelpers.deactivateAll();
        commentHelpers.layoutComments();
    };

    commentHelpers.submitComment = function () {
        // Handle a click on the submit button of the comment submit form.
        var commentTextBox, commentText, commentId;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        commentIsMajor = jQuery(this).siblings('.comment-is-major').prop('checked');
        commentText = commentTextBox.value;
        commentId = commentHelpers.getCommentId(commentTextBox);
        commentHelpers.updateComment(commentId, commentText, commentIsMajor);
    };

    commentHelpers.cancelSubmitComment = function () {
        // Handle a click on the cancel button of the comment submit form.
        var commentTextBox, id;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        if (commentTextBox) {
            id = commentHelpers.getCommentId(commentTextBox);
            if (theEditor.comments.comments[id].comment.length === 0) {
                commentHelpers.deleteComment(id);
            }
            else {
                commentHelpers.deactivateAll();
            }
        }
        else {
            commentHelpers.deactivateAll();
        }
        commentHelpers.layoutComments();
    };

    commentHelpers.submitAnswer = function () {
        // Submit the answer to a comment
        var commentWrapper, answerTextBox, answerText, answerParent;
        commentWrapper = jQuery('.comment-box.active');
        answerTextBox = commentWrapper.find('.comment-answer-text')[0];
        answerText = answerTextBox.value;
        commentId = parseInt(commentWrapper.attr('data-id'));
        commentHelpers.createNewAnswer(commentId, answerText);
    };

    commentHelpers.editAnswer = function (id, answerId) {
        theDocument.activeCommentId = id;
        theDocument.activeCommentAnswerId = answerId;
        commentHelpers.layoutComments();
    };


    commentHelpers.submitAnswerUpdate = function (commentId, answerId, commentText) {
        theEditor.comments.updateAnswer(commentId, answerId, commentText);

        commentHelpers.deactivateAll();
        editorHelpers.documentHasChanged();
        commentHelpers.layoutComments();
    };

    commentHelpers.bindEvents = function () {
        // Bind all the click events related to comments
        jQuery(document).on("click", ".submitComment", commentHelpers.submitComment);
        jQuery(document).on("click", ".cancelSubmitComment", commentHelpers
            .cancelSubmitComment);
        jQuery(document).on("click", ".comment-box.inactive", function () {
            var commentId;
            commentId = commentHelpers.getCommentId(this);
            commentHelpers.activateComment(commentId);
            commentHelpers.layoutComments();
        });
        jQuery(document).on("click", ".comments-enabled .comment", function () {
            var commentId;
            commentId = commentHelpers.getCommentId(this);
            commentHelpers.activateComment(commentId);
            commentHelpers.layoutComments();
        });

        jQuery(document).on('click', '.edit-comment', function () {
            var activeWrapper, btnParent, commentTextWrapper, commentP,
                commentForm;
            activeWrapper = jQuery('.comment-box.active');
            activeWrapper.find('.comment-p').show();
            activeWrapper.find('.comment-form').hide();
            activeWrapper.find('.comment-controls').show();
            btnParent = jQuery(this).parent();
            commentTextWrapper = btnParent.siblings(
                '.comment-text-wrapper');
            commentP = commentTextWrapper.children('.comment-p');
            commentForm = commentTextWrapper.children('.comment-form');
            btnParent.parent().siblings('.comment-answer').hide();
            btnParent.hide();
            commentP.hide();
            commentForm.show();
            commentForm.children('textarea').val(commentP.text());
        });
        jQuery(document).on('click', '.edit-comment-answer', function () {
            commentHelpers.editAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')));
        });
        jQuery(document).on('click', '.submit-comment-answer-edit',
            function () {
                var textArea = jQuery(this).prev(),
                    commentId = parseInt(textArea.attr('data-id')),
                    answerId = parseInt(textArea.attr('data-answer')),
                    theValue = textArea.val();
                commentHelpers.submitAnswerUpdate(commentId, answerId,
                    theValue);

            });
        jQuery(document).on("click", ".comment-answer-submit", function () {
            commentHelpers.submitAnswer();
        });

        jQuery(document).on('click', '.delete-comment', function () {
            commentHelpers.deleteComment(parseInt(jQuery(this).attr(
                'data-id')));
        });

        jQuery(document).on('click', '.delete-comment-answer', function () {
            commentHelpers.deleteCommentAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')));
        });

        // Handle comments show/hide

        jQuery(document).on('click', '#comments-display:not(.disabled)',
            function () {
                jQuery(this).toggleClass('selected'); // what should this look like? CSS needs to be defined
                jQuery('#comment-box-container').toggleClass('hide');
                jQuery('#flow').toggleClass('comments-enabled');
                jQuery('.toolbarcomment button').toggleClass('disabled');
            });

        jQuery(document).on('mousedown', '#comments-filter label', function (event) {
            event.preventDefault();
            var filterType = $(this).attr("data-filter");

            switch (filterType) {
                case 'r':
                case 'w':
                case 'e':
                case 'c':
                    commentHelpers.filterByUserType(filterType);
                    break;
                case 'username':
                    commentHelpers.filterByUserDialog();
                    break;
            }

        });
    };

    commentHelpers.deleteComment = function (id) {
        // Handle the deletion of a comment.
        var comment = commentHelpers.findComment(id);
        theEditor.comments.deleteComment(id);
//      TODO: make the markrange go away
        editorHelpers.documentHasChanged();
        commentHelpers.layoutComments();

    };

    commentHelpers.deleteCommentAnswer = function (commentId, answerId) {
        // Handle the deletion of a comment answer.
        theEditor.comments.deleteAnswer(commentId, answerId);
        commentHelpers.deactivateAll();
        editorHelpers.documentHasChanged();
        commentHelpers.layoutComments();
    };


    commentHelpers.layoutCommentsAvoidOverlap = function () {
        // Avoid overlapping of comments.
        var minOffsetTop,
            commentReferrer,
            lastOffsetTop,
            previousComments,
            nextComments,
            commentBox,
            initialCommentBox,
            foundComment,
            i;
        if (undefined != theDocument.activeCommentId) {
            commentReferrer = commentHelpers.findComment(
                theDocument.activeCommentId);
            initialCommentBox = commentHelpers.findCommentBox(theDocument.activeCommentId);
            if (!initialCommentBox) {
              return false;
            }
            lastOffsetTop = initialCommentBox.offsetTop;
            previousComments = [];
            nextComments = jQuery.makeArray(jQuery('.comment'));
            while (nextComments.length > 0) {
                foundComment = nextComments.shift();
                if (foundComment === commentReferrer) {
                    break;
                }
                else {
                    previousComments.unshift(foundComment);
                }
            }

            for (i = 0; i < previousComments.length; i++) {
                commentBox = commentHelpers.findCommentBox(commentHelpers.getCommentId(
                    previousComments[i]));
                if (commentBox) {
                  minOffsetTop = lastOffsetTop - commentBox.offsetHeight - 10;
                  if (commentBox.offsetTop > minOffsetTop) {
                    jQuery(commentBox).css('top', minOffsetTop + 'px');
                  }
                lastOffsetTop = commentBox.offsetTop;
                }
            }

            minOffsetTop = initialCommentBox.offsetTop + initialCommentBox.offsetHeight +
                10;
        }
        else {
            minOffsetTop = 0;
            nextComments = jQuery('.comment');
        }
        for (i = 0; i < nextComments.length; i++) {
            commentBox = commentHelpers.findCommentBox(commentHelpers.getCommentId(
                nextComments[i]));
           if (commentBox) {
                if (commentBox.offsetTop < minOffsetTop) {
                    jQuery(commentBox).css('top', minOffsetTop + 'px');
                }
                minOffsetTop = commentBox.offsetTop + commentBox.offsetHeight +
                    10;
           }
        }
    };

    commentHelpers.layoutComments = function () {
        // Handle the layout of the comments on the screen.
        var theCommentPointers = [].slice.call(jQuery('.comment')),
            activeCommentWrapper, theComments = [], ids = [];
        theEditor.editor.off("flushed", commentHelpers.layoutComments);
        theCommentPointers.forEach(function(commentNode){
          var id = parseInt(commentNode.getAttribute("data-id"));
          if (ids.indexOf(id) !== -1) {
            // This is not the first occurence of this comment. So we ignore it.
            return;
          }
          ids.push(id);
          if (theEditor.comments.comments[id]) {
            theComments.push({
              id: id,
              referrer: commentNode,
              comment: theEditor.comments.comments[id]['comment'],
              user: theEditor.comments.comments[id]['user'],
              userName: theEditor.comments.comments[id]['userName'],
              userAvatar: theEditor.comments.comments[id]['userAvatar'],
              date: theEditor.comments.comments[id]['date'],
              answers: theEditor.comments.comments[id]['answers'],
              isMajor: theEditor.comments.comments[id]['isMajor']
            });
          }

        });

        jQuery('#comment-box-container').html(tmp_comments({
            theComments: theComments
        }));
        commentHelpers.layoutCommentsAvoidOverlap();
        jQuery('#active-comment-style').html('');
        activeCommentWrapper = jQuery('.comment-box.active');
        if (0 < activeCommentWrapper.size()) {
            theDocument.activeCommentId = activeCommentWrapper.attr(
                'data-id');
            jQuery('#active-comment-style').html(
                '.comments-enabled .comment[data-id="' + theDocument.activeCommentId + '"] ' +
                '{background-color: #fffacf;}');
            activeCommentWrapper.find('.comment-answer-text').autoResize({
                'extraSpace': 0
            });
        }

    };

    /**
     * Filtering part. akorovin
     */
    commentHelpers.filterByUserType = function(userType) {
        //filter by user role (reader, editor, reviewer etc)
        console.log(userType);
        var userRoles = theDocument.access_rights;
        var idsOfNeededUsers = [];

        jQuery.each(userRoles, function(index, user) {
            if (user.rights == userType) {
                idsOfNeededUsers.push(user.user_id);
            }
        });

        $("#comment-box-container").children().each(function() {
            var userId = parseInt($(this).attr("data-user-id"), 10);
            if ($.inArray(userId, idsOfNeededUsers) !== -1) {
                $(this).show();
            }
            else {
                $(this).hide();
            }
        });
    };

    commentHelpers.filterByUserDialog = function () {
        //create array of roles + owner role
        var rolesCopy = theDocument.access_rights.slice();
        rolesCopy.push({
            user_name: theDocument.owner.name,
            user_id: theDocument.owner.id
        });

        var users = {
            users: rolesCopy
        };

        jQuery('body').append(tmp_filter_by_user_box(users));
        diaButtons = {};
        diaButtons[gettext('Filter')] = function () {
            var id = $(this).children("select").val();
            if (id == undefined) {
                return;
            }

            var boxesToHide = $("#comment-box-container").children("[data-user-id!='" + id + "']").hide();
            var boxesToHide = $("#comment-box-container").children("[data-user-id='" + id + "']").show();

            //TODO: filtering
            jQuery(this).dialog("close");
        };

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        };

        jQuery("#comment-filter-byuser-box").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function () {
                jQuery("#comment-filter-byuser-box").detach();
            },
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            }
        });
    };

    exports.commentHelpers = commentHelpers;

}).call(this);

/**
 * @license This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */
(function () {
    var exports = this,
        commentHelpers = {};

    commentHelpers.localizeDate = function (milliseconds, sortable) {
        milliseconds = parseInt(milliseconds);
        if (milliseconds > 0) {
            var the_date = new Date(milliseconds);
            if (true === sortable) {
                var yyyy = the_date.getFullYear(),
                    mm = the_date.getMonth() + 1,
                    dd = the_date.getDate();

                if (10 > mm) {
                    mm = '0' + mm;
                }

                return yyyy + '/' + mm + '/' + dd;
            }
            else {
                return the_date.toLocaleString();
            }
        }
        else {
            return '';
        }
    };

    commentHelpers.calculateCommentBoxOffset = function (referrer) {

        return referrer.getBoundingClientRect()['top'] + window.pageYOffset;
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
        // This function can be used on both comment referers and comment boxes.
        return parseInt(node.getAttribute('data-id'), 10);
    };

    commentHelpers.createNewComment = function (commentNode) {
        // Create a new comment, and mark it as active.
        var id = commentHelpers.findNewId();

        commentNode.setAttribute('id', 'comment-' + id);
        commentNode.setAttribute('data-id', id);
        commentNode.setAttribute('data-user', theUser.id);
        commentNode.setAttribute('data-user-name', theUser.name);
        commentNode.setAttribute('data-user-avatar', theUser.avatar);
        commentNode.setAttribute('data-date', new Date().getTime());
        commentNode.setAttribute('data-comment', '');

        commentHelpers.deactivateAll();
        theDocument.activeCommentId = id;


        editorHelpers.documentHasChanged();
    };

    commentHelpers.findNewId = function () {
        var i = 0;
        while (true) {
            if (jQuery('#comment-' + i).length === 0) {
                break;
            }
            i++;
        }
        return i;

    }

    commentHelpers.findFreeAnswerNumber = function (comment) {
        var i = 0;
        while (true) {
            if (!comment.hasAttribute('data-comment-answer-' + i +
                '-comment')) {
                break;
            }
            i++;
        }
        return i;
    };

    commentHelpers.createNewAnswer = function (parentId, commentText) {

        var comment = commentHelpers.findComment(parentId),
            an = commentHelpers.findFreeAnswerNumber(comment);

        comment.setAttribute('data-comment-answer-' + an + '-comment',
            commentText);
        comment.setAttribute('data-comment-answer-' + an + '-user', theUser
            .id);
        comment.setAttribute('data-comment-answer-' + an + '-user-name',
            theUser.name);
        comment.setAttribute('data-comment-answer-' + an + '-user-avatar',
            theUser.avatar);
        comment.setAttribute('data-comment-answer-' + an + '-date', new Date()
            .getTime());
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

    commentHelpers.updateComment = function (id, commentText) {
        // Save the change to a comment and mark that the document has been changed

        var comment = commentHelpers.findComment(id);
        comment.setAttribute('data-comment', commentText);
        editorHelpers.documentHasChanged();

        commentHelpers.deactivateAll();
        commentHelpers.layoutComments();
    };

    commentHelpers.submitComment = function () {
        // Handle a click on the submit button of the comment submit form.
        var commentTextBox, commentText, commentId;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        commentText = commentTextBox.value;
        commentId = commentHelpers.getCommentId(commentTextBox);
        commentHelpers.updateComment(commentId, commentText);

    };

    commentHelpers.cancelSubmitComment = function () {
        // Handle a click on the cancel button of the comment submit form.
        var commentTextBox, id;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        if (commentTextBox) {
            id = commentHelpers.getCommentId(commentTextBox);
            if (commentHelpers.findComment(id).getAttribute('data-comment')
                .length === 0) {
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
        answerParent = commentWrapper.attr('data-id');
        commentHelpers.createNewAnswer(answerParent, answerText);
    };

    commentHelpers.editAnswer = function (id, answerId) {
        theDocument.activeCommentId = id;
        theDocument.activeCommentAnswerId = answerId;
        commentHelpers.layoutComments();
    };


    commentHelpers.submitAnswerUpdate = function (id, answerId, commentText) {
        jQuery('#comment-' + id).attr('data-comment-answer-' + answerId +
            '-comment', commentText);
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
    };

    commentHelpers.deleteComment = function (id) {
        // Handle the deletion of a comment.
        var comment = commentHelpers.findComment(id);
        comment.outerHTML = comment.innerHTML;
        editorHelpers.documentHasChanged();
        commentHelpers.layoutComments();

    };

    commentHelpers.deleteCommentAnswer = function (id, answerId) {
        // Handle the deletion of a comment answer.
        var comment = commentHelpers.findComment(id);
        while (true) {
            if (!comment.hasAttribute('data-comment-answer-' + (answerId +
                1) + '-comment')) {
                comment.removeAttribute('data-comment-answer-' + answerId +
                    '-comment');
                comment.removeAttribute('data-comment-answer-' + answerId +
                    '-user');
                comment.removeAttribute('data-comment-answer-' + answerId +
                    '-user-name');
                comment.removeAttribute('data-comment-answer-' + answerId +
                    '-user-avatar');
                comment.removeAttribute('data-comment-answer-' + answerId +
                    '-date');
                break;
            }
            else {
                comment.setAttribute('data-comment-answer-' + answerId +
                    '-comment', comment.getAttribute('data-comment-answer-' +
                        (answerId + 1) + '-comment'));
                comment.setAttribute('data-comment-answer-' + answerId +
                    '-user', comment.getAttribute('data-comment-answer-' +
                        (answerId + 1) + '-user'));
                comment.setAttribute('data-comment-answer-' + answerId +
                    '-user-name', comment.getAttribute(
                        'data-comment-answer-' + (answerId + 1) +
                        '-user-name'));
                comment.setAttribute('data-comment-answer-' + answerId +
                    '-user-avatar', comment.getAttribute(
                        'data-comment-answer-' + (answerId + 1) +
                        '-user-avatar'));
                comment.setAttribute('data-comment-answer-' + answerId +
                    '-date', comment.getAttribute('data-comment-answer-' +
                        (answerId + 1) + '-date'));
                answerId++;
            }

        }
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
                minOffsetTop = lastOffsetTop - commentBox.offsetHeight - 10;
                if (commentBox.offsetTop > minOffsetTop) {
                    jQuery(commentBox).css('top', minOffsetTop + 'px');
                }
                lastOffsetTop = commentBox.offsetTop;
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
            if (commentBox.offsetTop < minOffsetTop) {
                jQuery(commentBox).css('top', minOffsetTop + 'px');
            }
            minOffsetTop = commentBox.offsetTop + commentBox.offsetHeight +
                10;
        }
    };

    commentHelpers.layoutComments = function () {
        // Handle the layout of the comments on the screen.
        var theComments = jQuery('.comment'),
            activeCommentWrapper;
        jQuery('#comment-box-container').html(tmp_comments({
            theComments: theComments
        }));
        commentHelpers.layoutCommentsAvoidOverlap();
        jQuery('#activeCommentStyle').html('');
        activeCommentWrapper = jQuery('.comment-box.active');
        if (0 < activeCommentWrapper.size()) {
            theDocument.activeCommentId = activeCommentWrapper.attr(
                'data-id');
            jQuery('#activeCommentStyle').html(
                '.comments-enabled #comment-' + theDocument.activeCommentId +
                ' {background-color: #fffacf;}');
            activeCommentWrapper.find('.comment-answer-text').autoResize({
                'extraSpace': 0
            });
        }

    };

    exports.commentHelpers = commentHelpers;

}).call(this);
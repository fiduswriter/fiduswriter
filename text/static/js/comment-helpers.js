/**
 * This file is part of Fidus Writer <http://www.fiduswriter.com>
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
        if (milliseconds > 0) {
            var the_date = new Date(milliseconds);
            if(true === sortable) {
                var yyyy = the_date.getFullYear(),
                    mm = the_date.getMonth() + 1,
                    dd = the_date.getDate();

                if(10 > mm) {
                    mm = '0' + mm;
                }

                return yyyy + '/' + mm + '/' + dd;
            } else {
                return the_date.toLocaleString();
            }
        } else {
            return '';
        }
    };

    commentHelpers.calculateCommentBoxOffset = function (referrer) {
        return referrer.getBoundingClientRect()['top'] + window.pageYOffset;
    };

    commentHelpers.resetOffsetCalculator = function () {
        delete commentHelpers.pageMeasures;
    };

    commentHelpers.findComment = function (id) {
        // Go through the list of comments, and return the comment specified by the id
        return _.findWhere(flatCommentList, {
                'id': id
            });
    };

    commentHelpers.findActive = function () {
        // Go through the list of comments, and return the comment specified by the id
        return _.findWhere(flatCommentList, {
                'active': true
            });
    };

    commentHelpers.findCommentReferrer = function (id) {
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
        // Create a new comment, add it to the comment list and mark it as active.
        var newComment = {
            'id': 0,
            'user': theUser.id,
            'user_name': theUser.name,
            'user_avatar': theUser.avatar,
            'date': 0,
            'comment': '',
            'editable': true,
            'children': []
        };
        commentNode.setAttribute('data-id', 0);
        commentHelpers.deactivateAll();
        commentNode.classList.add('active');
        newComment['active'] = true;
        theDocument.comments.push(newComment);
        flatCommentList.push(newComment);
    };

    commentHelpers.findNewId = function () {
        return (_.max(flatCommentList, function (comment) {
                    return comment.id;
                }).id) + 1;
    }

    commentHelpers.createNewAnswer = function (parentId, commentText) {

        var ajaxData, newAnswerBox;

        ajaxData = {
            'id': null,
            'parent': parentId,
            'content_type': 'text.text',
            'object_pk': theDocument.id,
            'comment': commentText,
            'user': theUser.id
        };

        newAnswerBox = jQuery('.comment-box.active .comment-answer');

        newAnswerBox.addClass('wait');

        var newComment, parentComment;
        //  json = jQuery.parseJSON(html);

        newComment = {
            'id': commentHelpers.findNewId(),
            'user': theUser.id,
            'user_name': theUser.name,
            'user_avatar': theUser.avatar,
            'date': new Date().getTime(),
            'comment': commentText,
            'editable': true,
            'children': []
        };
        newComment['parent_comment_id'] = parseInt(parentId, 10);
        parentComment = commentHelpers.findComment(newComment[
            'parent_comment_id']);
        parentComment['children'].push(newComment);
        flatCommentList.push(newComment);
        commentHelpers.layoutComments();
        editorHelpers.documentHasChanged();

    };


    commentHelpers.activateComment = function (id) {
        // Find the comment that is currently opened.
        var comment, commentReference;
        commentHelpers.deactivateAll();
        comment = commentHelpers.findComment(id);
        comment['active'] = true;
        commentReference = commentHelpers.findCommentReferrer(id);
        commentReference.classList.add('active');
    };

    commentHelpers.deactivateAll = function () {
        // Close the comment box and make sure no comment is marked as currently active.
        var comment, id, commentReference;
        comment = commentHelpers.findActive();
        if (comment) {
            comment['active'] = false;
            id = comment['id'];
            console.log(id);
            commentReference = commentHelpers.findCommentReferrer(id);
            commentReference.classList.remove('active');
            return true;
        } else {
            return false;
        }
    };

    commentHelpers.updateComment = function (id, commentText) {
        // Save the change tto a comment both locally and in the DB
        var comment, commentReference, commentItem;

        commentItem = jQuery('.comment-box.active .commentText[data-id=' + id +
            ']').attr('disabled', 'disabled').closest('.comment-item');

        commentItem.addClass('wait');

        comment = commentHelpers.findComment(id);

        comment['comment'] = commentText;

        if (0 === id) {
            comment['id'] = commentHelpers.findNewId();
            comment['date'] = new Date().getTime();
            commentReference = commentHelpers.findCommentReferrer(id);
            if (commentReference) {
                commentReference.setAttribute('data-id', comment['id']);
            }
            editorHelpers.documentHasChanged();
        }
        commentHelpers.layoutComments();


        commentHelpers.deactivateAll();

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
            if (id === 0) {
                commentHelpers.deleteComment(id);
            } else {
                commentHelpers.deactivateAll();
            }
        } else {
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

    commentHelpers.cleanReferers = function () {
        // Go through all referers to comments in the text and make sure that the comments they refer to actually exist and that there is only one of them.
        var commentId, allComments, usedIds, i;
        allComments = jQuery('.comment');
        usedIds = {};
        for (i = 0; i < allComments.length; i++) {
            // Remove potential active state
            allComments[i].classList.remove('active');
            allComments[i]['active'] = false;
            commentId = commentHelpers.getCommentId(allComments[i]);
            if (usedIds.hasOwnProperty(commentId)) {
                // If there are more than one elements in the document referring to the same footnote, remove all but the first one.
                allComments[i].outerHTML = allComments[i].innerHTML;
            } else if (!commentHelpers.findComment(commentId)) {
                // The comment is referred to in the text, but doesn't exist in the comments DB. Remove it.
                allComments[i].outerHTML = allComments[i].innerHTML;
            } else {
                usedIds[commentId] = true;
            }
        }
    };

    commentHelpers.bindEvents = function () {
        // Bind all the click events related to comments
        jQuery(document).on("click", ".submitComment", commentHelpers.submitComment);
        jQuery(document).on("click", ".cancelSubmitComment", commentHelpers.cancelSubmitComment);
        jQuery(document).on("click", ".comment-box.inactive", function () {
            var commentId, comment;
            commentId = commentHelpers.getCommentId(this);
            comment = commentHelpers.findComment(commentId);
            commentHelpers.activateComment(commentId);
            commentHelpers.layoutComments();
        });
        jQuery(document).on("click", ".comments-enabled .comment", function () {
            var commentId, comment;
            commentId = commentHelpers.getCommentId(this);
            comment = commentHelpers.findComment(commentId);
            commentHelpers.activateComment(commentId);
            commentHelpers.layoutComments();
        });

        jQuery(document).on('click', '.edit-comment', function () {
            var activeWrapper, btnParent, commentTextWrapper, commentP,
                    commentForm;
            activeWrapper = jQuery('.comment-box.active');
            activeWrapper.find('.comment-p').show();
            activeWrapper.find('.comment-form').hide();
            activeWrapper.find('.commemt-controls').show();
            btnParent = jQuery(this).parent();
            commentTextWrapper = btnParent.siblings('.comment-text-wrapper');
            commentP = commentTextWrapper.children('.comment-p');
            commentForm = commentTextWrapper.children('.comment-form');
            btnParent.parent().siblings('.comment-answer').hide();
            btnParent.hide();
            commentP.hide();
            commentForm.show();
            commentForm.children('textarea').val(commentP.text());
        });
        jQuery(document).on("click", ".comment-answer-submit", function () {
            commentHelpers.submitAnswer();
        });

        jQuery(document).on('click', '.delete-comment', function () {
            commentHelpers.deleteComment(parseInt(jQuery(this).attr('data-id'),
                    10));
        });

        // Handle comments show/hide

        jQuery(document).on('click', '#comments-display:not(.disabled)', function () {
            jQuery(this).toggleClass('selected'); // what should this look like? CSS needs to be defined
            jQuery('#comment-box-container').toggleClass('hide');
            jQuery('#flow').toggleClass('comments-enabled');
            jQuery('.toolbarcomment button').toggleClass('disabled');
        });
    };

    commentHelpers.deleteComment = function (id) {
        // Handle the deletion of a comment, both locally and in the DB.
        var comment = commentHelpers.findComment(id),
            ids = [id],
            i,
            len,
            commentReference, parentComment;
        if (!comment.hasOwnProperty('parent_comment_id')) {
            len = comment.children.length;
            for (i = 0; i < len; i++) {
                ids.push(comment.children[i].id);
            }
        }

        commentReference = commentHelpers.findCommentReferrer(id);
        if (commentReference) {
            commentReference.outerHTML = commentReference.innerHTML;
        }
        if (comment.hasOwnProperty('parent_comment_id')) {
            // Delete the comment from the parent comment
            parentComment = commentHelpers.findComment(comment[
                'parent_comment_id']);
            parentComment.children = _.reject(
                parentComment.children, function (childComment) {
                    return (childComment === comment);
                });
        } else {
            theDocument.comments = _.reject(theDocument.comments, function (
                childComment) {
                return (childComment === comment);
            });
        }

        flatCommentList = _.reject(flatCommentList, function (childComment) {
            return (childComment === comment);
        });

        commentHelpers.layoutComments();
        editorHelpers.documentHasChanged();

    };

    commentHelpers.fillFlatCommentList = function () {
        // We only operate with two levels of comments, so we will not try to find any comment beyodn the second level.
        var i, j;
        for (i = 0; i < theDocument.comments.length; i++) {
            flatCommentList.push(theDocument.comments[i]);
            for (j = 0; j < theDocument.comments[i]['children'].length; j++) {
                flatCommentList.push(theDocument.comments[i]['children'][j]);
            }
        }
    };

    commentHelpers.cleanCommentsList = function () {
        // Find all the nodes representing the different comments from the comments list and attach them.
        var commentId, commentReference, i;
        for (i = 0; i < theDocument.comments.length; i++) {
            commentId = theDocument.comments[i]['id'];
            commentReference = commentHelpers.findCommentReferrer(commentId);
            if (!commentReference) {
                // The reference to the comment does not exist in the text any more, so we go ahead and delete the comment
                commentHelpers.deleteComment(commentId);
            }

        }
    };

    commentHelpers.layoutCommentsAvoidOverlap = function () {
        // Avoid overlapping of comments.
        var activeComment = commentHelpers.findActive(),
            minOffsetTop,
            commentReferrer,
            lastOffsetTop,
            previousComments,
            nextComments,
            commentBox,
            initialCommentBox,
            foundComment,
            i;
        if (activeComment) {
            commentReferrer = commentHelpers.findCommentReferrer(activeComment[
                'id']);
            initialCommentBox = commentHelpers.findCommentBox(activeComment[
                'id']);
            lastOffsetTop = initialCommentBox.offsetTop;
            previousComments = [];
            nextComments = jQuery.makeArray(jQuery('.comment'));
            while (nextComments.length > 0) {
                foundComment = nextComments.shift();
                if (foundComment === commentReferrer) {
                    break;
                } else {
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
        } else {
            minOffsetTop = 0;
            nextComments = jQuery('.comment');
        }
        for (i = 0; i < nextComments.length; i++) {
            commentBox = commentHelpers.findCommentBox(commentHelpers.getCommentId(
                    nextComments[i]));
            if (commentBox.offsetTop < minOffsetTop) {
                jQuery(commentBox).css('top', minOffsetTop + 'px');
            }
            minOffsetTop = commentBox.offsetTop + commentBox.offsetHeight + 10;
        }
    };

    commentHelpers.layoutComments = function () {
        // Handle the layout of the comments on the screen.
        var activeCommentWrapper, activeCommentId;
        commentHelpers.cleanReferers();
        jQuery('#comment-box-container').html(_.template(tmp_comments,
                theDocument.comments));
        commentHelpers.layoutCommentsAvoidOverlap();
        jQuery('.comment').removeClass('active');
        activeCommentWrapper = jQuery('.comment-box.active');
        if (0 < activeCommentWrapper.size()) {
            activeCommentId = activeCommentWrapper.attr('data-id');
            jQuery('.comment[data-id=' + activeCommentId + ']').addClass(
                'active');
            activeCommentWrapper.find('.comment-answer-text').autoResize({
                    'extraSpace': 0
                });
        }

    };

    exports.commentHelpers = commentHelpers;

}).call(this);
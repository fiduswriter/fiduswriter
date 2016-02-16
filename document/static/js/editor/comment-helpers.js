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




    commentHelpers.submitComment = function () {
        // Handle a click on the submit button of the comment submit form.
        var commentTextBox, commentText, commentId;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        commentIsMajor = jQuery(this).siblings('.comment-is-major').prop('checked');
        commentText = commentTextBox.value;
        commentId = theEditor.editor.mod.commentStore.layout.getCommentId(commentTextBox);
        theEditor.editor.mod.commentStore.layout.updateComment(commentId, commentText, commentIsMajor);
    };

    commentHelpers.cancelSubmitComment = function () {
        // Handle a click on the cancel button of the comment submit form.
        var commentTextBox, id;
        commentTextBox = jQuery(this).siblings('.commentText')[0];
        if (commentTextBox) {
            id = theEditor.editor.mod.commentStore.layout.getCommentId(commentTextBox);
            if (theEditor.editor.mod.commentStore.comments[id].comment.length === 0) {
                theEditor.editor.mod.commentStore.layout.deleteComment(id);
            }
            else {
                theEditor.editor.mod.commentStore.layout.deactivateAll();
            }
        }
        else {
            theEditor.editor.mod.commentStore.layout.deactivateAll();
        }
        theEditor.editor.mod.commentStore.layout.layoutComments();
    };



    commentHelpers.bindEvents = function () {
        // Bind all the click events related to comments
        jQuery(document).on("click", ".submitComment", commentHelpers.submitComment);
        jQuery(document).on("click", ".cancelSubmitComment", commentHelpers
            .cancelSubmitComment);
        jQuery(document).on("click", ".comment-box.inactive", function () {
            var commentId;
            commentId = theEditor.editor.mod.commentStore.layout.getCommentId(this);
            theEditor.editor.mod.commentStore.layout.activateComment(commentId);
            theEditor.editor.mod.commentStore.layout.layoutComments();
        });
        jQuery(document).on("click", ".comments-enabled .comment", function () {
            var commentId;
            commentId = theEditor.editor.mod.commentStore.layout.getCommentId(this);
            theEditor.editor.mod.commentStore.layout.activateComment(commentId);
            theEditor.editor.mod.commentStore.layout.layoutComments();
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
            theEditor.editor.mod.commentStore.layout.editAnswer(parseInt(jQuery(this).attr(
                'data-id')), parseInt(jQuery(this).attr(
                'data-answer')));
        });
        jQuery(document).on('click', '.submit-comment-answer-edit',
            function () {
                var textArea = jQuery(this).prev(),
                    commentId = parseInt(textArea.attr('data-id')),
                    answerId = parseInt(textArea.attr('data-answer')),
                    theValue = textArea.val();
                theEditor.editor.mod.commentStore.layout.submitAnswerUpdate(commentId, answerId,
                    theValue);

            });
        jQuery(document).on("click", ".comment-answer-submit", function () {
            theEditor.editor.mod.commentStore.layout.submitAnswer();
        });

        jQuery(document).on('click', '.delete-comment', function () {
            commentHelpers.deleteComment(parseInt(jQuery(this).attr(
                'data-id')));
        });

        jQuery(document).on('click', '.delete-comment-answer', function () {
            theEditor.editor.mod.commentStore.layout.deleteCommentAnswer(parseInt(jQuery(this).attr(
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

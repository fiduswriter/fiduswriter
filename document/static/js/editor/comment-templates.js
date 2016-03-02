/**
 * @file Templates for the comment system.
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
/** A template to display all the comments */
var tmp_comments = _.template(
    '<% _.each(theComments,function(comment,key,list){ %>\
        <div id="comment-box-<%= comment.id %>" data-id="<%= comment.id %>"  data-user-id="<%= comment.user %>" \
        class="comment-box \
            <% if(comment.id===theEditor.mod.comments.layout.activeCommentId) { %>active<% } else { %>inactive<% } %>\
            <% if(comment["review:isMajor"] === true) { %>comment-is-major-bgc<% }%>\
            " style="top:<%= theEditor.mod.comments.layout.calculateCommentBoxOffset(comment) %>px;">\
            <% if (comment.id===theEditor.mod.comments.layout.activeCommentId || comment.comment.length > 0) { %>\
            <% if(0 === comment.comment.length) { %>\
                <%= tmp_first_comment({"comment": comment}) %>\
            <% } else { %>\
            <%= tmp_single_comment({"comment": comment, active: (comment.id===theEditor.mod.comments.layout.activeCommentId)}) %>\
            <% } %>\
            <% if (comment.answers && comment.answers.length) {\
               for (var i=0;i < comment.answers.length; i++) { %>\
                         <%= tmp_answer_comment({comment: comment, answer: comment.answers[i], active: (comment.id===theEditor.mod.comments.layout.activeCommentId)}) %>\
             <% }\
            } %>\
            <% if(comment.id===theEditor.mod.comments.layout.activeCommentId && 0 < comment.comment.length) { %>\
            <div class="comment-answer">\
                <textarea class="comment-answer-text" rows="1"></textarea>\
                <div class="comment-answer-btns">\
                    <button class="comment-answer-submit fw-button fw-dark" type="submit">' +
    gettext("Submit") +
    '</button>\
                    <button class="cancelSubmitComment fw-button fw-orange" type="submit">' +
    gettext("Cancel") +
    '</button>\
                </div>\
            </div>\
            <% } %>\
            <% if(comment.id===theEditor.mod.comments.layout.activeCommentId && (comment.user===theUser.id || theDocument.is_owner)) { %>\
                <span class="delete-comment-all delete-comment icon-cancel-circle" data-id="<%= comment.id %>"></span>\
            <% } %>\
            <% } %>\
        </div>\
    <% }); %>'
);
/** A template to show one individual comment */
var tmp_single_comment = _.template(
    '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment.userAvatar %>">\
            <h5 class="comment-user-name"><%= comment.userName %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(comment.date) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <p class="comment-p"><%= comment.comment %></p>\
            <div class="comment-form">\
                <textarea class="commentText" data-id="<%= comment.id %>" rows="5"></textarea>\
                <span class="submitComment fw-button fw-dark">' +
    gettext("Edit") +
    '</span>\
                <span class="cancelSubmitComment fw-button fw-orange">' +
    gettext("Cancel") +
    '</span>\
            </div>\
        </div>\
        <% if(active && comment.user===theUser.id) { %>\
        <p class="comment-controls">\
            <span class="edit-comment">' +
    gettext("Edit") +
    '</span>\
            <span class="delete-comment" data-id="<%= comment.id %>">' +
    gettext("Delete") + '</span>\
        </p>\
        <% } %>\
    </div>');
/** A template for an answer to a comment */
var tmp_answer_comment = _.template(
    '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= answer.userAvatar %>">\
            <h5 class="comment-user-name"><%= answer.userName %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(answer.date) %></p>\
        </div>\
        <% if (active && answer.id===theEditor.mod.comments.layout.activeCommentAnswerId) { %>\
            <div class="comment-text-wrapper">\
                <div class="comment-answer-form">\
                    <textarea class="commentAnswerText" data-id="<%= answer.commentId %>" data-answer="<%= answer.id %>" rows="3">\
                    <%= answer.answer %></textarea>\
                    <span class="submit-comment-answer-edit fw-button fw-dark">' +
    gettext("Edit") +
    '</span>\
                    <span class="cancelSubmitComment fw-button fw-orange">' +
    gettext("Cancel") +
    '</span>\
                </div>\
           </div>\
        <% } else { %>\
                <div class="comment-text-wrapper">\
                    <p class="comment-p"><%= answer.answer %></p>\
                </div>\
            <% if(active && (answer.user===theUser.id || theDocument.is_owner)) { %>\
                <p class="comment-controls">\
                    <span class="edit-comment-answer" data-id="<%= answer.commentId %>" data-answer="<%= answer.id %>">' + gettext("Edit") +'</span>\
                    <span class="delete-comment-answer" data-id="<%= answer.commentId %>" data-answer="<%= answer.id %>">' +
    gettext("Delete") +
    '</span>\
                </p>\
            <% } %>\
        <% } %>\
    </div>'
);
/** A template for the editor of a first comment before it has been saved (not an answer to a comment). */
var tmp_first_comment = _.template(
    '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment.userAvatar %>">\
            <h5 class="comment-user-name"><%= comment.userName %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(comment.date) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <textarea class="commentText" data-id="<%= comment.id %>" rows="5"></textarea>\
            <input class="comment-is-major" type="checkbox" name="isMajor" value="0" />Is major<br />\
            <span class="submitComment fw-button fw-dark">' +
    gettext("Submit") +
    '</span>\
            <span class="cancelSubmitComment fw-button fw-orange">' +
    gettext("Cancel") + '</span>\
        </div>\
    </div>');

var tmp_filter_by_user_box = _.template('<div id="comment-filter-byuser-box" title="Filter by user">\
        <select>\
            <% _.each(users, function(user) { %>\
                <option value="<%- user.user_id %>"><%- user.user_name %></option>\
            <% }) %>\
        </select>\
    </div>');

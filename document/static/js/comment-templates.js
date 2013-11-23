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
        <div id="comment-box-<%= comment.getAttribute("data-id") %>" data-id="<%= comment.getAttribute("data-id") %>" class="comment-box \
            <% if(comment.id==="comment-"+theDocument.activeCommentId) { %>active<% } else { %>inactive<% } %>\
            " style="top:<%= commentHelpers.calculateCommentBoxOffset(comment) %>px;">\
            <% if (comment.id==="comment-"+theDocument.activeCommentId || comment.getAttribute("data-comment").length > 0) { %>\
            <% if(0 === comment.getAttribute("data-comment").length) { %>\
                <%= tmp_first_comment({"comment": comment}) %>\
            <% } else { %>\
            <%= tmp_single_comment({"comment": comment, active: (comment.id==="comment-"+theDocument.activeCommentId)}) %>\
            <% } %>\
            <% var i=0; while (true) {\
                    if (comment.hasAttribute("data-comment-answer-"+i+"-comment")) { %>\
                        <%= tmp_answer_comment({comment: comment, answer: i, active: (comment.id==="comment-"+theDocument.activeCommentId)}) %>\
                <% i++;} else { break; }\
             } %>\
            <% if(comment.id==="comment-"+theDocument.activeCommentId && 0 < comment.getAttribute("data-comment").length) { %>\
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
            <% if(comment.id==="comment-"+theDocument.activeCommentId && (parseInt(comment.getAttribute("data-user"))===theUser.id || theDocument.is_owner)) { %>\
                <span class="delete-comment-all delete-comment icon-cancel-circle" data-id="<%= comment.getAttribute("data-id") %>"></span>\
            <% } %>\
            <% } %>\
        </div>\
    <% }); %>'
);
/** A template to show one individual comment */
var tmp_single_comment = _.template(
    '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment.getAttribute("data-user-avatar") %>">\
            <h5 class="comment-user-name"><%= comment.getAttribute("data-user-name") %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(comment.getAttribute("data-date")) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <p class="comment-p"><%= comment.getAttribute("data-comment") %></p>\
            <div class="comment-form">\
                <textarea class="commentText" data-id="<%= comment.getAttribute("data-id") %>" rows="5"></textarea>\
                <span class="submitComment fw-button fw-dark">' +
    gettext("Edit") +
    '</span>\
                <span class="cancelSubmitComment fw-button fw-orange">' +
    gettext("Cancel") +
    '</span>\
            </div>\
        </div>\
        <% if(active && parseInt(comment.getAttribute("data-user"))===theUser.id) { %>\
        <p class="comment-controls">\
            <span class="edit-comment">' +
    gettext("Edit") +
    '</span>\
            <span class="delete-comment" data-id="<%= comment.getAttribute("data-id") %>">' +
    gettext("Delete") + '</span>\
        </p>\
        <% } %>\
    </div>');
/** A template for an answer to a comment */
var tmp_answer_comment = _.template(
    '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment.getAttribute("data-comment-answer-"+answer+"-user-avatar") %>">\
            <h5 class="comment-user-name"><%= comment.getAttribute("data-comment-answer-"+answer+"-user-name") %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(comment.getAttribute("data-comment-answer-"+answer+"-date")) %></p>\
        </div>\
        <% if (active && answer===theDocument.activeCommentAnswerId) { %>\
            <div class="comment-text-wrapper">\
                <div class="comment-answer-form">\
                    <textarea class="commentAnswerText" data-id="<%= comment.getAttribute("data-id") %>" data-answer="<%= answer %>" rows="3"\
                    ><%= comment.getAttribute("data-comment-answer-"+answer+"-comment") %></textarea>\
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
                    <p class="comment-p"><%= comment.getAttribute("data-comment-answer-"+answer+"-comment") %></p>\
                </div>\
            <% if(active && (parseInt(comment.getAttribute("data-comment-answer-"+answer+"-user"))===theUser.id || theDocument.is_owner)) { %>\
                <p class="comment-controls">\
                    <span class="edit-comment-answer" data-id="<%= comment.getAttribute("data-id") %>" data-answer="<%= answer %>">' +
    gettext("Edit") +
    '</span>\
                    <span class="delete-comment-answer" data-id="<%= comment.getAttribute("data-id") %>" data-answer="<%= answer %>">' +
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
            <img class="comment-user-avatar" src="<%= comment.getAttribute("data-user-avatar") %>">\
            <h5 class="comment-user-name"><%= comment.getAttribute("data-user-name") %></h5>\
            <p class="comment-date"><%= jQuery.localizeDate(comment.getAttribute("data-date")) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <textarea class="commentText" data-id="<%= comment.getAttribute("data-id") %>" rows="5"></textarea>\
            <span class="submitComment fw-button fw-dark">' +
    gettext("Submit") +
    '</span>\
            <span class="cancelSubmitComment fw-button fw-orange">' +
    gettext("Cancel") + '</span>\
        </div>\
    </div>');
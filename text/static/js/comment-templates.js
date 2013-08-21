/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
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

var tmp_comments = '<% _.each(theDocument.comments,function(comment,key,list){ %>\
        <div id="comment-box-<%= comment["id"] %>" data-id="<%= comment["id"] %>" class="comment-box \
            <% if(comment["active"]) { %>active<% } else { %>inactive<% } %>\
            " style="top:<%= commentHelpers.calculateCommentBoxOffset(jQuery(".comment[data-id="+comment["id"]+"]")[0]) %>px;">\
            <% if(0 == comment["id"]) { %>\
            <%= _.template(tmp_first_comment, {"comment": comment}) %>\
            <% } else { %>\
            <%= _.template(tmp_single_comment, {"comment": comment, active: comment["active"]}) %>\
            <% } %>\
            <% _.each(comment.children, function(child_comment) { %>\
                <%= _.template(tmp_single_comment, {"comment": child_comment, active: comment["active"]}) %>\
            <% }) %>\
            <% if(comment["active"] && 0 < comment["id"]) { %>\
            <div class="comment-answer">\
                <textarea class="comment-answer-text" rows="1"></textarea>\
                <div class="comment-answer-btns">\
                    <button class="comment-answer-submit fw-button fw-dark" type="submit">' + gettext("Submit") + '</button>\
                    <button class="cancelSubmitComment fw-button fw-orange" type="submit">' + gettext("Cancel") + '</button>\
                </div>\
            </div>\
            <% } %>\
            <% if(comment["active"] && comment["editable"]) { %>\
            <span class="delete-comment-all delete-comment icon-cancel-circle" data-id="<%= comment["id"] %>"></span>\
            <% } %>\
        </div>\
    <% }); %>';

var tmp_single_comment = '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment["user_avatar"] %>">\
            <h5 class="comment-user-name"><%= comment["user_name"] %></h5>\
            <p class="comment-date"><%= commentHelpers.localizeDate(comment["date"]) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <p class="comment-p"><%= comment["comment"] %></p>\
            <div class="comment-form">\
                <textarea class="commentText" data-id="<%= comment["id"] %>" rows="5"></textarea>\
                <span class="submitComment fw-button fw-dark">' + gettext("Edit") + '</span>\
                <span class="cancelSubmitComment fw-button fw-orange">' + gettext("Cancel") + '</span>\
            </div>\
        </div>\
        <% if(active && comment["editable"]) { %>\
        <p class="commemt-controls">\
            <span class="edit-comment">' + gettext("Edit") + '</span>\
            <span class="delete-comment" data-id="<%= comment["id"] %>">' + gettext("Delete") + '</span>\
        </p>\
        <% } %>\
    </div>';

var tmp_first_comment =  '<div class="comment-item">\
        <div class="comment-user">\
            <img class="comment-user-avatar" src="<%= comment["user_avatar"] %>">\
            <h5 class="comment-user-name"><%= comment["user_name"] %></h5>\
            <p class="comment-date"><%= commentHelpers.localizeDate(comment["date"]) %></p>\
        </div>\
        <div class="comment-text-wrapper">\
            <textarea class="commentText" data-id="<%= comment["id"] %>" rows="5"></textarea>\
            <span class="submitComment fw-button fw-dark">' + gettext("Submit") + '</span>\
            <span class="cancelSubmitComment fw-button fw-orange">' + gettext("Cancel") + '</span>\
        </div>\
    </div>';

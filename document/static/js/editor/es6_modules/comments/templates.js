/** A template for an answer to a comment */
let answerCommentTemplatePart =
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
            <% if(active && (answer.user===theEditor.user.id || theEditor.docInfo.is_owner)) { %>\
                <p class="comment-controls">\
                    <span class="edit-comment-answer" data-id="<%= answer.commentId %>" data-answer="<%= answer.id %>">' + gettext("Edit") +'</span>\
                    <span class="delete-comment-answer" data-id="<%= answer.commentId %>" data-answer="<%= answer.id %>">' +
    gettext("Delete") +
    '</span>\
                </p>\
            <% } %>\
        <% } %>\
    </div>'

/** A template to show one individual comment */
let singleCommentTemplatePart =
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
        <% if(active && comment.user===theEditor.user.id) { %>\
        <p class="comment-controls">\
            <span class="edit-comment">' +
    gettext("Edit") +
    '</span>\
            <span class="delete-comment" data-id="<%= comment.id %>">' +
    gettext("Delete") + '</span>\
        </p>\
        <% } %>\
    </div>'


/** A template for the editor of a first comment before it has been saved (not an answer to a comment). */
let firstCommentTemplatePart =
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
    </div>'

/** A template to display all the comments */
export let commentsTemplate = _.template(
    '<% _.each(theComments,function(comment,key,list){ %>\
        <div id="comment-box-<%= comment.id %>" data-id="<%= comment.id %>"  data-user-id="<%= comment.user %>" \
        class="comment-box \
            <% if(comment.id===theEditor.mod.comments.layout.activeCommentId) { %>active<% } else { %>inactive<% } %>\
            <% if(comment["review:isMajor"] === true) { %>comment-is-major-bgc<% }%>\
            " style="top:<%= theEditor.mod.comments.layout.calculateCommentBoxOffset(comment) %>px;">\
            <% if (comment.id===theEditor.mod.comments.layout.activeCommentId || comment.comment.length > 0) { %>\
            <% if(0 === comment.comment.length) { %>'
                + firstCommentTemplatePart +
            '<% } else { \
               var active = (comment.id===theEditor.mod.comments.layout.activeCommentId);\
              %>'
                + singleCommentTemplatePart +
            '<% } %>\
            <% if (comment.answers && comment.answers.length) {\
               for (var i=0;i < comment.answers.length; i++) { \
                 var answer = comment.answers[i], active = (comment.id===theEditor.mod.comments.layout.activeCommentId)%>'
                + answerCommentTemplatePart +
             '<% }\
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
            <% if(comment.id===theEditor.mod.comments.layout.activeCommentId && (comment.user===theEditor.user.id || theEditor.docInfo.is_owner)) { %>\
                <span class="delete-comment-all delete-comment icon-cancel-circle" data-id="<%= comment.id %>"></span>\
            <% } %>\
            <% } %>\
        </div>\
    <% }); %>'
)

export let filterByUserBoxTemplate = _.template('<div id="comment-filter-byuser-box" title="Filter by user">\
        <select>\
            <% _.each(users, function(user) { %>\
                <option value="<%- user.user_id %>"><%- user.user_name %></option>\
            <% }) %>\
        </select>\
    </div>')

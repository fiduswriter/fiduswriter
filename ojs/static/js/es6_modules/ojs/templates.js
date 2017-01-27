/** Dialog to add a note to a revision before saving. */

export let journalDialogTemplate = _.template('\
    <div title="'+gettext('Choose journal for submission')+'">\
    <%  _.each(journals, function(journal, index) {%>\
        <div class="fw-radio">\
            <input type="radio" id="journal_<%= journal.id %>" name="journalList" value="<%= journal.id %>" <% if (index===0) { %>checked="checked"<% } %>>\
            <label for="journal_<%= journal.id %>"><%= journal.name %></label>\
        </div>\
   <% })  %> \
</div>\
')

export let revisionSubmitDialogTemplate = _.template('\
    <div title="'+gettext('Submitting the revision')+'">\
    <p>'+gettext('by pressing the submit button your revision will be sent to the editor')+'</p><br>\
</div>\
')


export let reviewSubmitDialogTemplate = _.template('\
    <div id="review-message" title="'+gettext('Leave your messages for editor and authors')+'">\
    <label for="editor">Message for editor:</label>\
    <p><textarea  id="message-editor" name="message-editor" class="message-reviewer" ></textarea></p><br>\
    <label for="editor-author">Message for editor and authors:</label>\
    <p><textarea  id="message-editor-author" class="message-reviewer" ></textarea></p>\
</div>\
')

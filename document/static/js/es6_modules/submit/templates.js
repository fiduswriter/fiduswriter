/** Dialog to add a note to a revision before saving. */
//export let journalDialogTemplate = _.template('<%  _.each(journals, function(journal) { alert(journal.name)%><div>Links:</div>    <% })  %>')
export let journalDialogTemplate = _.template('\
    <div title="'+gettext('Select a journal to submit the paper')+'"><%  _.each(journals, function(journal) {%>\
    <p><input type="radio" id="<%= journal.id %>" name="journalList" value="<%= journal.id %>"><label for="<%= journal.id %>"><%= journal.name %></label></p>\
   <% })  %> \
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


export let revisionSubmitDialogTemplate = _.template('\
    <div title="'+gettext('Submitting the revision')+'">\
    <p>'+gettext('by pressing the submit button your revision will be sent to the editor')+'</p><br>\
</div>\
')
//<div title="'+gettext('Select a journal to submit the paper')+'"><p><input type="text" class="revision-note" placeholder="'+gettext('Description (optional)')+'"><%= tt %></p></div>')

            /*<input type="radio" id="<%- journal.id %>" name="journalList" value="<%- journal.id %>"\
            <label for="<%- journal.id %>"><%= journal.name %></label>\*/
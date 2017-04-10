/** Dialog to add a note to a revision before saving. */

export let firstSubmissionDialogTemplate = _.template('\
    <div title="'+gettext('Complete details and choose journal')+'">\
        <table class="fw-dialog-table fw-dialog-table-wide">\
            <tbody>\
                <tr>\
                    <th><h4 class="fw-tablerow-title">'+gettext('First name')+'</h4></th>\
                    <td class="entry-field"><input type="text" id="submission-firstname" value="<%-first_name%>"></td>\
                </tr>\
                <tr>\
                    <th><h4 class="fw-tablerow-title">'+gettext('Last name')+'</h4></th>\
                    <td class="entry-field"><input type="text" id="submission-lastname" value="<%-last_name%>"></td>\
                </tr>\
                <tr>\
                    <th><h4 class="fw-tablerow-title">'+gettext('Affiliation')+'</h4></th>\
                    <td class="entry-field"><input type="text" id="submission-affiliation"></td>\
                </tr>\
                <tr>\
                    <th><h4 class="fw-tablerow-title">'+gettext('Webpage')+'</h4></th>\
                    <td class="entry-field"><input type="text" id="submission-webpage"></td>\
                </tr>\
            </tbody>\
        </table>\
        <%  _.each(journals, function(journal, index) {%>\
            <div class="fw-radio">\
                <input type="radio" id="journal_<%= journal.id %>" name="journalList" value="<%= journal.id %>" <% if (index===0) { %>checked="checked"<% } %>>\
                <label for="journal_<%= journal.id %>"><%= journal.name %></label>\
            </div>\
        <% })  %> \
    </div>\
')

export let resubmissionDialogTemplate = _.template('\
    <div title="'+gettext('Resubmit')+'">\
    <p>'+gettext('By pressing the submit button your resubmission will be sent to the journal')+'</p><br>\
    <p><b>'+gettext('Be aware that this action cannot be undone!')+'</b></p>\
</div>\
')


export let reviewSubmitDialogTemplate = _.template('\
    <div id="review-message" title="'+gettext('Leave your messages for editor and authors')+'">\
    <label for="editor">'+gettext('Message for editor')+':</label>\
    <p><textarea  id="message-editor" name="message-editor" class="message-reviewer" ></textarea></p><br>\
    <label for="editor-author">'+gettext('Message for editor and authors')+':</label>\
    <p><textarea  id="message-editor-author" class="message-reviewer" ></textarea></p><br>\
    <label for="recommendation">'+gettext('Recommendation')+':</label>\
    <p><select id="recommendation" class="fw-button fw-white fw-large" name="recommendation">\
		<option label="'+gettext('Choose One')+'" value="">'+gettext('Choose One')+'</option>\
        <option label="'+gettext('Accept Submission')+'" value="1">'+gettext('Accept Submission')+'</option>\
        <option label="'+gettext('Revisions Required')+'" value="2">'+gettext('Revisions Required')+'</option>\
        <option label="'+gettext('Resubmit for Review')+'" value="3">'+gettext('Resubmit for Review')+'</option>\
        <option label="'+gettext('Resubmit Elsewhere')+'" value="4">'+gettext('Resubmit Elsewhere')+'</option>\
        <option label="'+gettext('Decline Submission')+'" value="5">'+gettext('Decline Submission')+'</option>\
        <option label="'+gettext('See Comments')+'" value="6">'+gettext('See Comments')+'</option>\
    </select></p><br>\
    <p><strong>'+gettext('Be aware that this action cannot be undone!')+'</strong></p>\
</div>\
')

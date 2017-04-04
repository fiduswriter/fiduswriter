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

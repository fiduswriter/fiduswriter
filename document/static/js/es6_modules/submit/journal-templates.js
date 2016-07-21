/** Dialog to add a note to a revision before saving. */
//export let journalDialogTemplate = _.template('<%  _.each(journals, function(journal) { alert(journal.name)%><div>Links:</div>    <% })  %>')
export let journalDialogTemplate = _.template('\
    <div title="'+gettext('Select a journal to submit the paper')+'"><%  _.each(journals, function(journal) {%>\
    <p><input type="radio" id="<%= journal.id %>" name="journalList" value="<%= journal.id %>"><label for="<%= journal.id %>"><%= journal.name %></label></p>\
   <% })  %> \
</div>\
')

//<div title="'+gettext('Select a journal to submit the paper')+'"><p><input type="text" class="revision-note" placeholder="'+gettext('Description (optional)')+'"><%= tt %></p></div>')

            /*<input type="radio" id="<%- journal.id %>" name="journalList" value="<%- journal.id %>"\
            <label for="<%- journal.id %>"><%= journal.name %></label>\*/
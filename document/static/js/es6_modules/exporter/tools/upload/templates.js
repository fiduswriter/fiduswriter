/** Dialog to add a note to a revision before saving. */
export let revisionDialogTemplate = _.template('\
<div title="'+gettext('Revision description')+'"><p><input type="text" class="revision-note" placeholder="'+gettext('Description (optional)')+'"></p></div>')

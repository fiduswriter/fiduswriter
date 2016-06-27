import {linkDialogTemplate} from "./templates"
import  {commands} from "prosemirror/dist/edit/commands"

// TODO: turn into class (like FigureDialog)
export let linkDialog = function (mod) {

    let editor = mod.editor,
        dialogButtons = [],
        dialog,
        link = 'http://',
        linkTitle = '',
        defaultLink = 'http://',
        submitButtonText = 'Insert',
        linkElement = _.find(editor.currentPm.activeMarks(),function(mark){return (mark.type.name==='link')})


    if (linkElement) {
        submitButtonText = 'Update'
        linkTitle = linkElement.attrs.title
        link = linkElement.attrs.href
    }

    dialogButtons.push({
        text: gettext(submitButtonText),
        class: 'fw-button fw-dark',
        click: function() {

            let newLink = dialog.find('input.link').val(),
                linkTitle = dialog.find('input.linktitle').val(),
                linkNode

            if ((new RegExp(/^\s*$/)).test(newLink) || newLink === defaultLink) {
                // The link input is empty or hasn't been changed from the default value. Just close the dialog.
                dialog.dialog('close')
                editor.currentPm.focus()
                return
            }

            if ((new RegExp(/^\s*$/)).test(linkTitle)) {
                // The link title is empty. Make it the same as the link itself.
                linkTitle = newLink
            }
            dialog.dialog('close')
            let mark = editor.currentPm.schema.marks['link']
            let command = commands.toggleMark(mark, {href: newLink, title: linkTitle})
            command(editor.currentPm, true)
            editor.currentPm.focus()
            return

        }
    })

    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function() {
            dialog.dialog('close')
            editor.currentPm.focus()
        }
    })

    dialog = jQuery(linkDialogTemplate({
        linkTitle: linkTitle,
        link: link
    }))

    dialog.dialog({
        buttons: dialogButtons,
        modal: true,
        close: function() {
            jQuery(this).dialog('destroy').remove()
        }
    })



}

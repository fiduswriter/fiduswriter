import {linkDialogTemplate} from "./templates"

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
                // The link text is empty. Make it the same as the link itself.
                linkText = link
            }
            dialog.dialog('close')
            editor.currentPm.execCommand('link:set',[newLink, linkTitle])
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

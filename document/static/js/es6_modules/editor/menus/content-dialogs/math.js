import {mathDialogTemplate} from "./templates"

// TODO: turn into class (like FigureDialog)
export let mathDialog = function (mod) {

    let editor = mod.editor,
        dialog, dialogButtons = [],
        submitMessage = gettext('Insert'),
        insideMath = false,
        equation = 'x=2*y',
        node = editor.currentPm.selection.node


    if (node && node.type && node.type.name==='equation') {
        insideMath = true
        equation = node.attrs.equation
        submitMessage = gettext('Update')
        dialogButtons.push({
            text: gettext('Remove'),
            class: 'fw-button fw-orange',
            click: function () {
                insideMath = false
                dialog.dialog('close')
            }
        })
    }

    dialogButtons.push({
        text: submitMessage,
        class: 'fw-button fw-dark',
        click: function () {

            equation = dialog.find('input').val()

            if ((new RegExp(/^\s*$/)).test(equation)) {
                // The math input is empty. Delete a math node if it exist. Then close the dialog.
                if (insideMath) {
                    editor.currentPm.execCommand('deleteSelection')
                }
                dialog.dialog('close')
                return
            } else if (insideMath && equation === node.attrs.equation) {
                dialog.dialog('close')
                return
            }

            editor.currentPm.execCommand('equation:insert', [equation])

            dialog.dialog('close')
        }
    })


    dialogButtons.push({
        text: gettext('Cancel'),
        class: 'fw-button fw-orange',
        click: function () {
            dialog.dialog('close')
        }
    })

    dialog = jQuery(mathDialogTemplate({equation:equation}))


    dialog.dialog({
        buttons: dialogButtons,
        title: gettext('Latex equation'),
        modal: true,
        close: function () {
            jQuery(this).dialog('destroy').remove()
        }
    })


}

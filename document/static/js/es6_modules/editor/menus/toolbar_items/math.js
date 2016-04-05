import {mathDialogTemplate} from "./templates"
import {FormulaEditor} from '../../tools/formula-editor'

export let bindMath = function (editor) {

    // toolbar math
    jQuery(document).on('mousedown', '#button-math:not(.disabled), .equation', function (event) {

        let dialog, dialogButtons = [],
            submitMessage = gettext('Insert'),
            insideMath = false,
            equation = 'x=2*y',
            node = editor.pm.selection.node

        event.preventDefault()


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
                        editor.pm.execCommand('deleteSelection')
                    }
                    dialog.dialog('close')
                    return
                } else if (insideMath && equation === node.attrs.equation) {
                    dialog.dialog('close')
                    return
                }

                editor.pm.execCommand('equation:insert', [equation])

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

        let mathQuill = new FormulaEditor($(dialog).children("span")[0])
    })
}

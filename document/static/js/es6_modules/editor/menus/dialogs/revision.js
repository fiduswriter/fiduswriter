import {revisionDialogTemplate} from "./templates"
import {cancelPromise} from "../../../common"

export let revisionDialog = function() {

    let diaButtons = {}
    let dialogDonePromise = new Promise(resolve => {
        diaButtons[gettext("Save")] = function() {
            let note = jQuery(this).find('.revision-note').val()
            jQuery(this).dialog("close")
            return resolve(note)
        }

        diaButtons[gettext("Cancel")] = function() {
            jQuery(this).dialog("close")
            return resolve(cancelPromise())
        }
    })


    jQuery(revisionDialogTemplate()).dialog({
        autoOpen: true,
        height: 180,
        width: 300,
        modal: true,
        buttons: diaButtons,
        create: function() {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass(
                "fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass(
                "fw-button fw-orange")
        },
    })

    return dialogDonePromise
}

import {revisionDialogTemplate} from "./templates"
import {addAlert, csrfToken} from "../../../common/common"

/** Uploads a Fidus Writer document to the server.
 * @function uploadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
export let uploadFile = function(zipFilename, blob, editor) {

    let diaButtons = {}

    diaButtons[gettext("Save")] = function() {
        let data = new window.FormData()

        data.append('note', jQuery(this).find('.revision-note').val())
        data.append('file', blob, zipFilename)
        data.append('document_id', editor.doc.id)

        jQuery.ajax({
            url: '/document/upload/',
            data: data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function() {
                addAlert('success', gettext('Revision saved'))
            },
            error: function() {
                addAlert('error', gettext('Revision could not be saved.'))
            }
        })
        jQuery(this).dialog("close")

    }

    diaButtons[gettext("Cancel")] = function() {
        jQuery(this).dialog("close")
    }

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


}

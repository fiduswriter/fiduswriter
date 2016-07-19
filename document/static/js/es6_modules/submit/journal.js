import {journalDialogTemplate} from "./journal-templates"
import {addAlert, csrfToken} from "../common/common"

/** get the list of ojournal in ojs.
 * @function selectJournal
 * @param
*/
export let selectJournal = function(editor) {
        let list = null
        let diaButtons = {}
        diaButtons[gettext("Submit")] = function() {
            //alert(jQuery("input[type='radio'][name='journalList']:checked").val())
            let data = new window.FormData()

            //data.append('username', editor.user.id)
            data.append('journal_id', jQuery("input[type='radio'][name='rate']:checked").val())
            data.append('article_url', 'http://10.6.13.146:8000/document/'+editor.doc.id)
            jQuery.ajax({
                url: 'http://10.6.13.146/index.php/index/gateway/plugin/RestApiGatewayPlugin/articles',
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
                    addAlert('success','The paper was submitted to ojs')
                },
                error: function() {
                    addAlert('error', 'submission was not successful')
                }
            })
            jQuery(this).dialog("close")

        }

        diaButtons[gettext("Cancel")] = function() {
            jQuery(this).dialog("close")
        }
        jQuery.ajax({
                type: "GET",
                dataType: "json",
                url:'http://10.6.13.146/index.php/mda/gateway/plugin/RestApiGatewayPlugin/journals',
                success: function (result) {
                    list =result['journals']
                    let journal = null
                        jQuery(journalDialogTemplate({journals: list})).dialog({
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
        })

    /*let diaButtons = {}

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
    })*/


}

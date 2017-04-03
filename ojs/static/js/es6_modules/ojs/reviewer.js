import {addAlert, csrfToken} from "../common"
import {reviewSubmitDialogTemplate} from "./templates"

/*submit the review*/
export let reviewSubmit = function(editor) {
    let diaButtons = {}
    let submission_info = {}
    jQuery.ajax({
        url: '/ojs/reviewsubmit/',
        data: {
            document_id: editor.doc.id
        },
        type: 'POST',
        cache: false,
        contentType: false,
        processData: false,
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) =>
            xhr.setRequestHeader("X-CSRFToken", csrfToken),
        success: result => {
            submission_info = result['submission']
        },
        error: () =>
            addAlert('error', 'can not get the submission information')
    })

    diaButtons[gettext("Submit")] = function() {
        let dataToOjs = new window.FormData()
        dataToOjs.append('email', editor.user.email)
        dataToOjs.append('doc_id', editor.doc.id)
        dataToOjs.append('journal_id', submission_info["journal_id"])
        dataToOjs.append('submission_id', submission_info["submission_id"])
        dataToOjs.append('review_round', submission_info["version_id"])
        dataToOjs.append('editor_message', jQuery("#message-editor").val())
        dataToOjs.append('editor_author_message', jQuery("#message-editor-author").val())
        jQuery.ajax({
            url: window.ojsUrl + '/index.php/index/gateway/plugin/RestApiGatewayPlugin/articleReviews',
            data: dataToOjs,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: () =>
                addAlert('success', 'The editor will be informed that finished your review'),
            error: () => {
                addAlert('error', 'There is error while sending the signal of finishing review, please try it again')

                jQuery.ajax({
                    url: '/ojs/reviewsubmitundo/',
                    data: {
                        document_id: editor.doc.id
                    },
                    type: 'POST',
                    cache: false,
                    contentType: false,
                    processData: false,
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) =>
                        xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success: result => {
                        submission_info = result['submission']
                    },
                    error: () =>
                        addAlert('error', 'can not give back review rights since can not get the submission information')
                })
            }
        })
        jQuery(this).dialog("close")

    }
    diaButtons[gettext("Cancel")] = function() {
        jQuery(this).dialog("close")
    }
    jQuery("#review-message").remove()
    jQuery(reviewSubmitDialogTemplate()).dialog({
        autoOpen: true,
        height: 400,
        width: 350,
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

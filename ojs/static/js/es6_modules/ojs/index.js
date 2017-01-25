import {saveCopy} from "../exporter/native"
import {journalDialogTemplate, reviewSubmitDialogTemplate, revisionSubmitDialogTemplate} from "./templates"
import {addAlert, csrfToken} from "../common"

let setRights = function(orginalDocId, CopyDocId, user, access_rights) {
    let collaborators = [],
        rights = []
    access_rights.forEach((item, index) => {
        if (item.document_id === orginalDocId) {
            collaborators[collaborators.length] = item.user_id
        }
    })
    collaborators[collaborators.length] = user.id
    let postData = {
        'documentId': CopyDocId,
        'collaborators[]': collaborators,
    }
    jQuery.ajax({
        url: '/ojs/submitright/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) =>
            xhr.setRequestHeader("X-CSRFToken", csrfToken),
        success: response =>
            addAlert('success', gettext(
                'Access rights have been saved')),
        error: (jqXHR, textStatus, errorThrown) =>
            console.error(jqXHR.responseText)
    })
}

/** submit a document to ojs
 * @function submitDoc
 * @param
 */

let submitDoc = function(editor) {
    let journalId = jQuery("input[type='radio'][name='journalList']:checked").val()

    if (!journalId) {
        addAlert('error', gettext('Select a journal before submitting!'))
        return
    }
    journalId = parseInt(journalId)
    editor.save().then(

    )

    let oldBibDB = editor.bibDB.db
    let oldImageDB = editor.imageDB.db
//    let owner = {}
//    owner['id'] = 1
//    owner['name'] = 'fidus'
//    editor.removeBibDB()
//    editor.removeImageDB()
    editor.save().then(
//        () => editor.getBibDB(editor.user.id)
//    ).then(
//        () => editor.getImageDB(editor.user.id)
//    ).then(
        () => saveCopy(
            editor.doc,
            oldBibDB,
            oldImageDB,
            editor.bibDB.db,
            editor.imageDB.db,
            editor.user
        )
    ).then(
        ({
            doc,
            docInfo
        }) => {
            setRights(editor.doc.id, doc.id, editor.user, editor.doc.access_rights)
            //window.location.href = `/document/${doc.id}/`
            let dataToOjs = new window.FormData()
            dataToOjs.append('username', editor.user.username)
            dataToOjs.append('title', editor.doc.title)
            dataToOjs.append('first_name', editor.user.first_name)
            dataToOjs.append('last_name', editor.user.last_name)
            dataToOjs.append('email', editor.user.email)
            dataToOjs.append('affiliation', "sample affiliation")
            dataToOjs.append('author_url', "sample author_url")
            dataToOjs.append('journal_id', jQuery("input[type='radio'][name='journalList']:checked").val())
            dataToOjs.append('file_name', editor.doc.title)
            dataToOjs.append('article_url', window.location.origin + "/document/" + doc.id)
            if (editor.docInfo.submission.status == 'submitted') {
                dataToOjs.append('submission_id', editor.docInfo.submission.submission_id)
                dataToOjs.append('version_id', editor.docInfo.submission.version_id + 1)
            }
            jQuery.ajax({
                url: window.ojsUrl + '/index.php/index/gateway/plugin/RestApiGatewayPlugin/articles',
                data: dataToOjs,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: response => {
                    //addAlert('success','The paper was submitted to ojs')
                    let dataSubmission = new window.FormData()
                    dataSubmission.append('document_id', doc.id)
                    dataSubmission.append('pre_document_id', editor.doc.id)
                    if (editor.docInfo.submission.status == 'submitted') {
                        dataSubmission.append('submission_id', editor.docInfo.submission.submission_id)
                        dataSubmission.append('journal_id', editor.docInfo.submission.journal_id)
                    } else {
                        dataSubmission.append('journal_id', response.journal_id)
                        dataSubmission.append('submission_id', response.submission_id)
                    }
                    jQuery.ajax({
                        url: '/ojs/submissionversion/',
                        data: dataSubmission,
                        type: 'POST',
                        cache: false,
                        contentType: false,
                        processData: false,
                        crossDomain: false, // obviates need for sameOrigin test
                        beforeSend: (xhr, settings) =>
                            xhr.setRequestHeader("X-CSRFToken", csrfToken),
                        success: response =>
                            addAlert('success', 'The paper was submitted to ojs and version of submission has been saved'),
                        error: () =>
                            addAlert('error', 'version of submission has been not saved')
                    })
                },
                error: () => addAlert('error', 'submission was not successful')
            })
        }
    )
}



/** submit to journal selection dialog
 * @function selectJournal
 * @param
 */

export let selectJournal = function(editor) {
    let list = null
    let diaButtons = {}

    diaButtons[gettext("Submit")] = function() {
        submitDoc(editor)
        jQuery(this).dialog("close")
    }

    diaButtons[gettext("Cancel")] = function() {
        jQuery(this).dialog("close")
    }
    jQuery.ajax({
        type: "POST",
        dataType: "json",
        url: '/ojs/getJournals/',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: (xhr, settings) =>
            xhr.setRequestHeader("X-CSRFToken", csrfToken),
        success: response => {
            let journals = response['journals']
            jQuery(journalDialogTemplate({
                journals
            })).dialog({
                autoOpen: true,
                height: (journals.length * 45) + 140,
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

}

/*send the revision of submitted paper*/
export let submissionRevisionDone = function(editor) {
    let diaButtons = {}
    let submission_info = {}

    diaButtons[gettext("Submit")] = function() {
        submitDoc(editor)
        jQuery(this).dialog("close")
    }
    diaButtons[gettext("Cancel")] = function() {
        jQuery(this).dialog("close")
    }
    jQuery(revisionSubmitDialogTemplate()).dialog({
        autoOpen: true,
        height: 100,
        width: 300,
        modal: true,
        buttons: diaButtons,
        create: function() {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass(
                "fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass(
                "fw-button fw-orange")
        }
    })


}

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
        dataToOjs.append('message_editor_author', jQuery("#message-editor-author").val())
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
                addAlert('success', 'The editor will be informed about finishing your review'),
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

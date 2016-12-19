import {savecopy} from "../exporter/native/copy"
import {journalDialogTemplate,reviewSubmitDialogTemplate} from "./templates"
import {addAlert, csrfToken} from "../common/common"


let setRights = function(orginalDocId,CopyDocId,user,access_rights){
    let that = this
	let collaborators = [],
    rights = []
	access_rights.forEach(function(item,index){
	    if (item.document_id==orginalDocId){
	        collaborators[collaborators.length]=item.user_id
	    }

	})
	collaborators[collaborators.length]=user.id
	let postData = {
        'documentId': CopyDocId,
        'collaborators[]': collaborators,
    }
    jQuery.ajax({
        url: '/document/submitright/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        crossDomain: false, // obviates need for sameOrigin test
        beforeSend: function(xhr, settings) {
            xhr.setRequestHeader("X-CSRFToken", csrfToken)
        },
        success: function (response) {
            addAlert('success', gettext(
                'Access rights have been saved'))
        },
        error: function (jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.responseText)
        }
    })
}

/** get the list of ojournal in ojs.
 * @function selectJournal
 * @param
*/

export let selectJournal = function(editor) {
        let list = null
        let diaButtons = {}
        let userProfile = {}
        let data1 = new window.FormData()
        data1.append('user_id', editor.user.id)
        jQuery.ajax({
            url: '/document/profile/',
            data: data1,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function(result) {
                userProfile = result['user']
            },
            error: function() {
                addAlert('error', 'can not get the user information')
            }
        })


        diaButtons[gettext("Submit")] = function() {
            savecopy(editor.doc, editor.bibDB.db, editor.imageDB.db,
                editor.bibDB.db, editor.imageDB.db, editor.user,
                function(doc, docInfo, newBibEntries){
            		setRights(editor.doc.id,doc.id,editor.user,editor.doc.access_rights)
                    let dataToOjs = new window.FormData()
                    dataToOjs.append('username', userProfile["username"])
                    dataToOjs.append('title', editor.doc.title)
                    dataToOjs.append('first_name', userProfile["first_name"])
                    dataToOjs.append('last_name', userProfile["last_name"])
                    dataToOjs.append('email', userProfile["email"])
                    dataToOjs.append('affiliation', "sample affiliation")
                    dataToOjs.append('author_url', "sample author_url")
                    dataToOjs.append('journal_id', jQuery("input[type='radio'][name='journalList']:checked").val())
                    dataToOjs.append('file_name', editor.doc.title)
                    dataToOjs.append('article_url', window.location.origin+"/document/" + doc.id)

                    jQuery.ajax({
                        url: window.ojsUrl+'/index.php/index/gateway/plugin/RestApiGatewayPlugin/articles',
                        data: dataToOjs,
                        type: 'POST',
                        cache: false,
                        contentType: false,
                        processData: false,
                        crossDomain: false, // obviates need for sameOrigin test
                        beforeSend: function(xhr, settings) {
                            xhr.setRequestHeader("X-CSRFToken", csrfToken)
                        },
                        success: function(response) {
                            //addAlert('success','The paper was submitted to ojs')
                            let dataSubmission = new window.FormData()
                            dataSubmission.append('user_id',editor.user.id)
                            dataSubmission.append('document_id',doc.id)
                            dataSubmission.append('pre_document_id',editor.doc.id)
                            dataSubmission.append('document_id',doc.id)
                            dataSubmission.append('journal_id',response.journal_id)
                            dataSubmission.append('submission_id',response.submission_id)
                            jQuery.ajax({
                                url: '/document/submissionversion/',
                                data: dataSubmission,
                                type: 'POST',
                                cache: false,
                                contentType: false,
                                processData: false,
                                crossDomain: false, // obviates need for sameOrigin test
                                beforeSend: function(xhr, settings) {
                                    xhr.setRequestHeader("X-CSRFToken", csrfToken)
                                },
                                success: function(response) {
                                    addAlert('success','The paper was submitted to ojs and version of submission has been saved')
                                    console.log(response)
                                },
                                error: function() {
                                    addAlert('error', 'version of submission has been not saved')
                                }
                            })
                        },
                        error: function() {
                            addAlert('error', 'submission was not successful')
                        }
                    })
                })
            jQuery(this).dialog("close")

        }

        diaButtons[gettext("Cancel")] = function() {
            jQuery(this).dialog("close")
        }
        jQuery.ajax({
                type: "GET",
                dataType: "json",
                url: window.ojsUrl + '/index.php/index/gateway/plugin/RestApiGatewayPlugin/journals',
                success: function (result) {
                    list =result['journals']
                    let journal = null
                    jQuery(journalDialogTemplate({journals: list})).dialog({
                        autoOpen: true,
                        height: list.length*100,
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

/*submit the review*/
export let reviewSubmit = function(editor){
        let diaButtons = {}
        let submission_info = {}
        let userProfile = {}
        let submissionData = new window.FormData()
        submissionData.append('document_id', editor.doc.id)
        submissionData.append('user_id', editor.user.id)
        jQuery.ajax({
            url: '/document/reviewsubmit/',
            data: submissionData,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function(result) {
                submission_info = result['submission']
                userProfile = result['user']
            },
            error: function() {
                addAlert('error', 'can not get the submission information')
            }
        })

        diaButtons[gettext("Submit")] = function() {
            let dataToOjs = new window.FormData()
            dataToOjs.append('email', userProfile["email"])
            dataToOjs.append('doc_id', editor.doc.id)
            dataToOjs.append('journal_id', submission_info["journal_id"])
            dataToOjs.append('submission_id', submission_info["submission_id"])
            dataToOjs.append('review_round', submission_info["version_id"])
            dataToOjs.append('editor_message',jQuery("#message-editor").val())
            dataToOjs.append('message_editor_author',jQuery("#message-editor-author").val())
            jQuery.ajax({
                url: window.ojsUrl+'/index.php/index/gateway/plugin/RestApiGatewayPlugin/articleReviews',
                data: dataToOjs,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: function(xhr, settings) {
                    xhr.setRequestHeader("X-CSRFToken", csrfToken)
                },
                success: function() {
                    addAlert('success','The editor will be informed about finishing your review')
                },
                error: function() {
                    addAlert('error', 'There is error while sending the signal of finishing review, please try it again')

                    jQuery.ajax({
                        url: '/document/reviewsubmitundo/',
                        data: submissionData,
                        type: 'POST',
                        cache: false,
                        contentType: false,
                        processData: false,
                        crossDomain: false, // obviates need for sameOrigin test
                        beforeSend: function(xhr, settings) {
                            xhr.setRequestHeader("X-CSRFToken", csrfToken)
                        },
                        success: function(result) {
                        submission_info = result['submission']
                        userProfile = result['user']
                    },
                error: function() {
                    addAlert('error', 'can not give back reiview rights since can not get the submission information')
                }
            })
                }
            })
            jQuery(this).dialog("close")

        }
        diaButtons[gettext("Cancel")] = function() {
  console.log(jQuery('textarea[name=message]'))
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

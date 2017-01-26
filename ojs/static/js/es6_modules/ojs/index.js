import {SaveCopy} from "../exporter/native"
import {journalDialogTemplate, reviewSubmitDialogTemplate, revisionSubmitDialogTemplate} from "./templates"
import {addAlert, csrfToken} from "../common"
import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"


export class OJSSubmit {
    constructor(editor) {
        this.editor = editor
        this.journals = []
    }

    init() {
        return new Promise(resolve => {
            jQuery.ajax({
                type: "POST",
                dataType: "json",
                url: '/ojs/getJournals/',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: response => {
                    this.journals = response['journals']
                    resolve()
                }
            })
        }).then(
            () => this.setupUI()
        )

    }

    setupUI() {
        if (this.journals.length === 0) {
            return Promise.resolve()
        }
        jQuery('#file-menu').append(`
            <li>
                <span class="fw-pulldown-item submit-ojs icon-search" title="${gettext("submit the paper to ojs")}"> ${gettext("Submit paper")} </span>
            </li>
        `)
        jQuery(document).on('mousedown', '.submit-ojs:not(.disabled)', () => {
            this.openDialog()
        })
        return Promise.resolve()
    }

    openDialog() {
        let diaButtons = {}, that = this

        diaButtons[gettext("Submit")] = function() {
            let journalId = jQuery("input[type='radio'][name='journalList']:checked").val()
            if (!journalId) {
                addAlert('error', gettext('Select a journal before submitting!'))
                return
            }
            journalId = parseInt(journalId)
            that.submitDoc(journalId)
            jQuery(this).dialog("close")
        }

        diaButtons[gettext("Cancel")] = function() {
            jQuery(this).dialog("close")
        }

        jQuery(journalDialogTemplate({
            journals: this.journals
        })).dialog({
            autoOpen: true,
            height: (this.journals.length * 45) + 140,
            width: 300,
            modal: true,
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            }
        })
    }

    submitDoc(journalId) {
        let journal = this.journals.find(journal => journal.ojs_jid === journalId)
        let journalBibDB = new BibliographyDB(journal.editor_id)
        let journalImageDB = new ImageDB(journal.editor_id)
        this.editor.save().then(
            () => journalBibDB.getDB()
        ).then(
            () => journalImageDB.getDB()
        ).then(
            () => {
                let copier = new SaveCopy(
                    this.editor.doc,
                    this.editor.bibDB,
                    this.editor.imageDB,
                    journalBibDB,
                    journalImageDB,
                    this.editor.user
                )
                return copier.init()
            }
        ).then(
            ({doc,docInfo}) => {
                this.setRights(this.editor.doc.id, doc.id, this.editor.user, this.editor.doc.access_rights)
                //window.location.href = `/document/${doc.id}/`
                let dataToOjs = new window.FormData()
                dataToOjs.append('username', this.editor.user.username)
                dataToOjs.append('title', doc.title)
                dataToOjs.append('first_name', this.editor.user.first_name)
                dataToOjs.append('last_name', this.editor.user.last_name)
                dataToOjs.append('email', this.editor.user.email)
                dataToOjs.append('affiliation', "sample affiliation")
                dataToOjs.append('author_url', "sample author_url")
                dataToOjs.append('journal_id', journalId)
                dataToOjs.append('file_name', doc.title)
                dataToOjs.append('article_url', window.location.origin + "/document/" + doc.id)
                if (this.editor.docInfo.submission.status === 'submitted') {
                    // How can it already be submitted ??? I thought this was only for newly submitted documents.
                    dataToOjs.append('submission_id', this.editor.docInfo.submission.submission_id)
                    dataToOjs.append('version_id', this.editor.docInfo.submission.version_id + 1)
                }
                jQuery.ajax({
                    url: '/proxy/ojs/articles',
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
                        dataSubmission.append('pre_document_id', this.editor.doc.id)
                        if (this.editor.docInfo.submission.status == 'submitted') {
                            dataSubmission.append('submission_id', this.editor.docInfo.submission.submission_id)
                            dataSubmission.append('journal_id', this.editor.docInfo.submission.journal_id)
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

    // What is this doing???
    setRights (orginalDocId, copyDocId, user, access_rights) {
        let collaborators = [],
            rights = []
        access_rights.forEach((item, index) => {
            if (item.document_id === orginalDocId) {
                collaborators[collaborators.length] = item.user_id
            }
        })
        collaborators[collaborators.length] = user.id
        let postData = {
            'documentId': copyDocId,
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

import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {addAlert, csrfToken} from "../common"
import {SaveCopy} from "../exporter/native"
import {journalDialogTemplate, revisionSubmitDialogTemplate} from "./templates"

// Adds functions for authors to submit to OJS
export class AuthorOJS {
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
                <span class="fw-pulldown-item submit-ojs icon-search" title="${gettext("submit the paper to ojs")}">
                    ${gettext("Submit paper")}
                </span>
            </li>
        `)
        jQuery(document).on('mousedown', '.submit-ojs:not(.disabled)', () => {
            if (this.editor.docInfo.submission.status === 'submitted') {
                this.revisionSubmissionDialog()
            } else {
                this.firstSubmissionDialog()
            }

        })
        return Promise.resolve()
    }

    // Dialog for an article that has no submisison status. Includes selection of journal.
    firstSubmissionDialog() {
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

    /* Dialog for submission of all subsequent revisions */
    revisionSubmissionDialog() {
        let diaButtons = {}
        let submission_info = {}

        diaButtons[gettext("Submit")] = function() {
            this.submitDoc(this.editor.docInfo.submission.journal_id)
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

    // All the steps for submission of a document to oJS:
    // 1. copy,
    // 2. submission to OJS,
    // 3. registration of submission in FW
    submitDoc(journalId) {
        return this.saveDoc(journalId).then(
            ({doc,docInfo, journal}) => this.submitToOJS(doc, docInfo, journal)
        ).then(
            ({doc, docInfo, journal, submissionId}) => this.registerSubmission(
                doc,
                docInfo,
                journal,
                submissionId
            )
        )
    }
    // Make copy of doc with the owner set to the journal's editor account.
    saveDoc(journalId) {
        let journal = this.journals.find(journal => journal.id === journalId)
        let journalBibDB = new BibliographyDB(journal.editor_id)
        let journalImageDB = new ImageDB(journal.editor_id)
        return this.editor.save().then(
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
            ({doc, docInfo}) => Promise.resolve({doc, docInfo, journal})
        )
    }

    // Submit to OJS
    submitToOJS(doc, docInfo, journal) {
        this.setRights(this.editor.doc.id, doc.id, this.editor.user, this.editor.doc.access_rights)
        //window.location.href = `/document/${doc.id}/`
        let dataToOjs = new window.FormData()
        dataToOjs.append('j_id', journal.id) // Used to identify journal in FW
        dataToOjs.append('username', this.editor.user.username)
        dataToOjs.append('title', doc.title)
        dataToOjs.append('first_name', this.editor.user.first_name)
        dataToOjs.append('last_name', this.editor.user.last_name)
        dataToOjs.append('email', this.editor.user.email)
        dataToOjs.append('affiliation', "sample affiliation")
        dataToOjs.append('author_url', "sample author_url")
        dataToOjs.append('journal_id', journal.ojs_jid)
        dataToOjs.append('file_name', doc.title)
        dataToOjs.append('article_url', window.location.origin + "/document/" + doc.id)
        if (this.editor.docInfo.submission.status === 'submitted') {
            dataToOjs.append('submission_id', this.editor.docInfo.submission.submission_id)
            dataToOjs.append('version_id', this.editor.docInfo.submission.version_id + 1)
        }
        return new Promise(resolve => {
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
                    resolve({doc, docInfo, journal, submissionId: response.submission_id})
                },
                error: () => addAlert('error', 'submission was not successful')
            })
        })


    }

    // Register submission to OJS in FW
    registerSubmission(doc, docInfo, journal, submissionId) {
        let dataSubmission = new window.FormData()
        dataSubmission.append('document_id', doc.id)
        dataSubmission.append('pre_document_id', this.editor.doc.id)
        if (this.editor.docInfo.submission.status == 'submitted') {
            dataSubmission.append('submission_id', this.editor.docInfo.submission.submission_id)
            dataSubmission.append('journal_id', this.editor.docInfo.submission.journal_id)
        } else {
            dataSubmission.append('journal_id', journal.id)
            dataSubmission.append('submission_id', submissionId)
        }
        return new Promise ((resolve, reject) => {
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
                success: response => {
                    addAlert(
                        'success',
                        gettext('The document was submitted to OJS.')
                    )
                    resolve()
                },
                error: () => {
                    addAlert(
                        'error',
                        gettext('The document could not be submitted to OJS.')
                    )
                    reject()
                }
            })
        })
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

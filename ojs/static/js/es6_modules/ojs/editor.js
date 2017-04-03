import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {addAlert, csrfToken} from "../common"
import {SaveCopy} from "../exporter/native"
import {journalDialogTemplate, revisionSubmitDialogTemplate, reviewSubmitDialogTemplate} from "./templates"
import {SendDocSubmission} from "./submission"

// Adds functions for OJS to the editor
export class EditorOJS {
    constructor(editor) {
        this.editor = editor
        this.editor.ojs = this
        this.submission = false
        this.journals = false
    }

    init() {
        return new Promise(resolve => {
            jQuery.ajax({
                type: "POST",
                dataType: "json",
                data: {
                    doc_id: this.editor.doc.id
                },
                url: '/ojs/get_doc_info/',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: response => {
                    this.submission = response['submission']
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
            // This installation does not have any journals setup. Abort.
            return Promise.resolve()
        } else if (this.submission.status==='submitted' &! this.editor.docInfo.is_owner) {
            // Add large buttons for reviewers and authors to resubmit to OJS.
            jQuery('.editortoolbar').append(`
                <div class="fw-button fw-light fw-large submit-ojs" title="${gettext("Submit to OJS")}">
                    ${gettext("Send to journal")}
                </div>
            `);
            jQuery('#file-menu').append(`
                <li>
                    <span class="fw-pulldown-item submit-ojs icon-search" title="${gettext("Submit the paper to journal")}">
                        ${gettext("Send to journal")}
                    </span>
                </li>
            `)
        } else {
            jQuery('#file-menu').append(`
                <li>
                    <span class="fw-pulldown-item submit-ojs icon-search" title="${gettext("submit the paper to ojs")}">
                        ${gettext("Submit paper")}
                    </span>
                </li>
            `)
        }

        jQuery(document).on('mousedown', '.submit-ojs:not(.disabled)', () => {
            if (this.submission.status === 'submitted') {
                if (this.editor.docInfo.rights==='review') {
                    this.reviewerDialog()
                } else {
                    this.revisionSubmissionDialog()
                }
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
            this.submitDoc(this.submission.journal_id)
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

    submitDoc(journalId) {
        return this.editor.save().then(
            () => {
                let submitter = new SendDocSubmission(
                    this.editor.doc,
                    this.editor.imageDB,
                    this.editor.bibDB,
                    journalId,
                    this.submission.version,
                    this.submission_id
                )
                return submitter.init()
            }
        )
    }

    // The dialog for a document reviewer.
    reviewerDialog() {
        let buttons = [], dialog
        buttons.push({
            text: gettext('Cancel'),
            click: () => {
                dialog.dialog('close')
            },
            class: 'fw-button fw-orange'
        })
        buttons.push({
            text: gettext('Send'),
            click: () => {
                this.submitReview()
                dialog.dialog('close')
            },
            class: 'fw-button fw-dark'
        })
        jQuery("#review-message").remove()
        dialog = jQuery(reviewSubmitDialogTemplate()).dialog({
            autoOpen: true,
            height: 400,
            width: 350,
            modal: true,
            buttons
        })
    }

    // Send the opinion of the reviewer to OJS.
    submitReview() {
        let data = new window.FormData()
        data.append('doc_id', this.editor.doc.id)
        data.append('editor_message', jQuery("#message-editor").val())
        data.append('editor_author_message', jQuery("#message-editor-author").val())

        jQuery.ajax({
            url: '/proxy/ojs/reviewer_submit',
            data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: () => addAlert('success', gettext('Review submitted')),
            error: () => addAlert('error', gettext('Review could not be submitted.'))
        })
    }

}

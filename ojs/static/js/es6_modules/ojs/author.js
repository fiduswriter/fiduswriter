import {BibliographyDB} from "../bibliography/database"
import {ImageDB} from "../images/database"
import {addAlert, csrfToken} from "../common"
import {SaveCopy} from "../exporter/native"
import {journalDialogTemplate, revisionSubmitDialogTemplate} from "./templates"
import {SendAuthorSubmission} from "./submission"

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
    submitDoc(journalId) {
        return this.editor.save().then(
            () => {
                let submitter = new SendAuthorSubmission(
                    this.editor.doc,
                    this.editor.imageDB,
                    this.editor.bibDB,
                    journalId,
                    this.editor.docInfo.submission.version,
                    this.editor.docInfo.submission_id
                )
                return submitter.init()
            }
        )
    }

}

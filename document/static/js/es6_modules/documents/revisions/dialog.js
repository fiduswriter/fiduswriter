import {documentrevisionsTemplate, documentrevisionsConfirmDeleteTemplate} from "./templates"
import {ImportFidusFile} from "../../importer/file"
import {downloadFile} from "../../exporter/tools/file"
import {deactivateWait, addAlert, localizeDate, csrfToken} from "../../common/common"
import JSZipUtils from "jszip-utils"

/**
 * Functions for the recovering previously created document revisions.
 */
export class DocumentRevisionsDialog {
    constructor(documentId, documentList, user, bibDB, imageDB, callback) {
        this.documentId = documentId // documentId The id in documentList.
        this.documentList = documentList
        this.user = user
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.callback = callback
        this.createDialog()
    }

    /**
     * Create a dialog showing the existing revisions for a certain document.
     * @function createDialog
     * @param {number}
     */
    createDialog() {
        let that = this
        let diaButtons = {}

        diaButtons[gettext('Close')] = function() {
            jQuery(this).dialog("close")
        }
        let aDocument = _.findWhere(that.documentList, {
            id: that.documentId
        })



        jQuery(documentrevisionsTemplate({
            aDocument, localizeDate
        })).dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 620,
            height: 480,
            modal: true,
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-dark")
            },
            close: function() {
                jQuery(this).dialog('destroy').remove()
            }
        })
        this.bind()
    }


    bind() {
        let that = this
        jQuery('.download-revision').on('mousedown', function() {
            let revisionId = parseInt(jQuery(this).attr('data-id'))
            let revisionFilename = jQuery(this).attr('data-filename')
            that.download(revisionId, revisionFilename)
        })

        jQuery('.recreate-revision').on('mousedown', function() {
            let revisionId = parseInt(jQuery(this).attr('data-id'))
            that.recreate(revisionId, that.user)
        })

        jQuery('.delete-revision').on('mousedown', function() {
            let revisionId = parseInt(jQuery(this).attr('data-id'))
            that.delete(revisionId)
        })
    }

    /**
     * Recreate a revision.
     * @function recreate
     * @param {number} id The pk value of the document revision.
     */

    recreate(id, user) {
        let that = this
        JSZipUtils.getBinaryContent(`/document/get_revision/${id}/`, function(err, fidusFile) {
            new ImportFidusFile(
                fidusFile,
                user,
                false,
                that.bibDB,
                that.imageDB,
                function(noErrors, returnValue) {
                    deactivateWait()
                    if (noErrors) {
                        let doc = returnValue.aDocument
                        addAlert('info', doc.title + gettext(
                            ' successfully imported.'))
                        that.callback({
                            action: 'added-document',
                            doc
                        })
                    } else {
                        addAlert('error', returnValue)
                    }
                }
            )
        })
    }

    /**
     * Download a revision.
     * @function download
     * @param {number} id The pk value of the document revision.
     */

    download(id, filename) {
        JSZipUtils.getBinaryContent(`/document/get_revision/${id}/`, function(err, fidusFile) {
            downloadFile(filename, fidusFile)
        })
    }

    /**
     * Delete a revision.
     * @function delete
     * @param {number} id The pk value of the document revision.
     */

    delete(id) {
        let that = this

        let diaButtons = {},
            deleteRevision = function() {
                jQuery.ajax({
                    url: '/document/delete_revision/',
                    data: {
                        id: id
                    },
                    type: 'POST',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: function(xhr, settings) {
                        xhr.setRequestHeader("X-CSRFToken", csrfToken)
                    },
                    success: function() {
                        let thisTr = jQuery('tr.revision-' + id),
                            documentId = jQuery(thisTr).attr('data-document'),
                            aDocument = _.findWhere(that.documentList, {
                                id: parseInt(documentId)
                            })
                        jQuery(thisTr).remove()
                        addAlert('success', gettext('Revision deleted'))
                        that.callback({
                            action: 'deleted-revision',
                            id: id,
                            doc: aDocument
                        })
                    },
                    error: function() {
                        addAlert('error', gettext('Could not delete revision.'))
                    }
                })
            }
        diaButtons[gettext('Delete')] = function() {
            jQuery(this).dialog("close")
            deleteRevision()
        }

        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog("close")
        }

        jQuery(documentrevisionsConfirmDeleteTemplate()).dialog({
            resizable: false,
            height: 180,
            modal: true,
            appendTo: "#revisions-dialog",
            close: function() {
                jQuery(this).dialog('destroy').remove()
            },
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

}

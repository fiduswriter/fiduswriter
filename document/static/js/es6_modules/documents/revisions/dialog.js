import {documentrevisionsTemplate, documentrevisionsConfirmDeleteTemplate} from "./templates"
import {ImportFidusFile} from "../../importer/file"

/**
 * Functions for the recovering previously created document revisions.
 */
export class DocumentRevisionsDialog {
    constructor(documentId, documentList, user, callback) {
        this.documentId = documentId // documentId The id in documentList.
        this.documentList = documentList
        this.user = user
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
            aDocument: aDocument
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
            that.recreate(revisionId, theDocumentList, that.user)
        })

        jQuery('.delete-revision').on('mousedown', function() {
            let revisionId = parseInt(jQuery(this).attr('data-id'))
            that.delete(revisionId, theDocumentList)
        })
    }

    /**
     * Recreate a revision.
     * @function recreate
     * @param {number} id The pk value of the document revision.
     */

    recreate(id, user) {
        let that = this
            // Have to use XMLHttpRequest rather than jQuery.ajax as it's the only way to receive a blob.
        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                let fidusFile = this.response

                new ImportFidusFile(
                    fidusFile,
                    user,
                    true,
                    function(noErrors, returnValue) {
                        $.deactivateWait()
                        if (noErrors) {
                            let aDocument = returnValue.aDocument
                            jQuery.addAlert('info', aDocument.title + gettext(
                                ' successfully imported.'))
                            that.callback({
                                action: 'added-document',
                                doc: aDocument
                            })
                        } else {
                            jQuery.addAlert('error', returnValue)
                        }
                    }
                )
            }
        }

        xhr.open('POST', '/document/download/')
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
        xhr.setRequestHeader("X-CSRFToken", jQuery("input[name='csrfmiddlewaretoken']").val())
        xhr.responseType = 'blob'
        xhr.send("id=" + id)


    }

    /**
     * Download a revision.
     * @function download
     * @param {number} id The pk value of the document revision.
     */

    download(id, filename) {
        // Have to use XMLHttpRequest rather than jQuery.ajax as it's the only way to receive a blob.

        let xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
            if (this.readyState == 4 && this.status == 200) {
                exporter.downloadFile(filename, this.response)
            }
        }

        xhr.open('POST', '/document/download/')
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded")
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest")
        xhr.setRequestHeader("X-CSRFToken", jQuery("input[name='csrfmiddlewaretoken']").val())
        xhr.responseType = 'blob'
        xhr.send("id=" + id)
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
                    success: function() {
                        let thisTr = jQuery('tr.revision-' + id),
                            documentId = jQuery(thisTr).attr('data-document'),
                            aDocument = _.findWhere(that.documentList, {
                                id: parseInt(documentId)
                            })
                        console.log([documentId, aDocument])
                        jQuery.addAlert('success', gettext('Revision deleted'))
                        that.callback({
                            action: 'deleted-revision',
                            id: id,
                            doc: aDocument
                        })
                    },
                    error: function() {
                        jQuery.addAlert('error', gettext('Could not delete revision.'))
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

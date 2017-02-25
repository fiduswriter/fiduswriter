import {documentrevisionsTemplate, documentrevisionsConfirmDeleteTemplate} from "./templates"
import {ImportFidusFile} from "../../importer/file"
import {deactivateWait, addAlert, localizeDate, csrfToken, cancelPromise} from "../../common"
import JSZipUtils from "jszip-utils"
import download from "downloadjs"

/**
 * Functions for the recovering previously created document revisions.
 */
export class DocumentRevisionsDialog {
    constructor(documentId, documentList, user, bibDB, imageDB) {
        this.documentId = documentId // documentId The id in documentList.
        this.documentList = documentList
        this.user = user
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.dialog = false
    }

    /**
     * Create a dialog showing the existing revisions for a certain document.
     * @function createDialog
     * @param {number}
     */
    init() {

        let doc = _.findWhere(this.documentList, {
            id: this.documentId
        })

        let buttons = [
            {
                text: gettext('Close'),
                class: "fw-button fw-dark",
                click: () => this.dialog.dialog("close")
            }
        ]

        this.dialog = jQuery(documentrevisionsTemplate({
            doc, localizeDate
        }))

        this.dialog.dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 620,
            height: 480,
            modal: true,
            buttons,
            close: () => this.dialog.dialog('destroy').remove()
        })
        return this.bind()
    }


    bind() {
        let that = this
        jQuery('.download-revision').on('mousedown', function() {
            let revisionId = parseInt(jQuery(this).attr('data-id'))
            let revisionFilename = jQuery(this).attr('data-filename')
            that.download(revisionId, revisionFilename)
        })
        return new Promise(resolve => {
            jQuery('.recreate-revision').on('mousedown', function() {
                let revisionId = parseInt(jQuery(this).attr('data-id'))
                resolve(that.recreate(revisionId, that.user))
            })

            jQuery('.delete-revision').on('mousedown', function() {
                let revisionId = parseInt(jQuery(this).attr('data-id'))
                resolve(that.delete(revisionId))
            })
        })
    }

    /**
     * Recreate a revision.
     * @function recreate
     * @param {number} id The pk value of the document revision.
     */

    recreate(id, user) {
        return new Promise (resolve => {
            JSZipUtils.getBinaryContent(
                `/document/get_revision/${id}/`,
                (err, fidusFile) => {
                    let importer = new ImportFidusFile(
                        fidusFile,
                        user,
                        false,
                        this.bibDB,
                        this.imageDB
                    )
                    resolve(
                        importer.init().then(
                            ({doc, docInfo}) => {
                                deactivateWait()
                                addAlert('info', doc.title + gettext(
                                    ' successfully imported.'))
                                return Promise.resolve({
                                    action: 'added-document',
                                    doc
                                })
                            },
                            errorMessage => addAlert('error', errorMessage)
                        )
                    )
                }
            )
        })
    }

    /**
     * Download a revision.
     * @param {number} id The pk value of the document revision.
     */

    download(id, filename) {
        JSZipUtils.getBinaryContent(
            `/document/get_revision/${id}/`,
            (err, fidusFile) => download(fidusFile, filename, 'application/fidus+zip')
        )
    }

    /**
     * Delete a revision.
     * @param {number} id The pk value of the document revision.
     */

    delete(id) {
        let diaButtons = {}, that = this
        let returnPromise = new Promise(resolve => {
            diaButtons[gettext('Delete')] = function() {
                jQuery(this).dialog("close")
                resolve(that.deleteRevision(id))
            }

            diaButtons[gettext('Cancel')] = function() {
                jQuery(this).dialog("close")
                resolve(cancelPromise())
            }
        })

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

        return returnPromise

    }

    deleteRevision(id) {
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                url: '/document/delete_revision/',
                data: {id},
                type: 'POST',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) => {
                    xhr.setRequestHeader("X-CSRFToken", csrfToken)
                },
                success: () => {
                    let thisTr = jQuery(`tr.revision-${id}`),
                        documentId = jQuery(thisTr).attr('data-document'),
                        doc = _.findWhere(this.documentList, {
                            id: parseInt(documentId)
                        })
                    jQuery(thisTr).remove()
                    addAlert('success', gettext('Revision deleted'))
                    resolve({
                        action: 'deleted-revision',
                        id,
                        doc
                    })
                },
                error: () => {
                    addAlert('error', gettext('Could not delete revision.'))
                    reject()
                }
            })
        })

    }

}

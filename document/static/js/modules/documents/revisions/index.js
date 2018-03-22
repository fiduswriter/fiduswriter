import JSZipUtils from "jszip-utils"
import download from "downloadjs"

import {documentrevisionsTemplate, documentrevisionsConfirmDeleteTemplate} from "./templates"
import {ImportFidusFile} from "../../importer/file"
import {deactivateWait, addAlert, post, cancelPromise, findTarget} from "../../common"

/**
 * Functions for the recovering previously created document revisions.
 */
export class DocumentRevisionsDialog {
    constructor(documentId, documentList, user) {
        this.documentId = documentId // documentId The id in documentList.
        this.documentList = documentList
        this.user = user
        this.dialog = false
    }

    /**
     * Create a dialog showing the existing revisions for a certain document.
     * @function createDialog
     * @param {number}
     */
    init() {

        let doc = this.documentList.find(doc => doc.id === this.documentId)

        let buttons = [
            {
                text: gettext('Close'),
                class: "fw-button fw-dark",
                click: () => this.dialog.dialog("close")
            }
        ]

        this.dialog = jQuery(documentrevisionsTemplate({
            doc
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
        let dialogEl = this.dialog[0]

        return new Promise(resolve => {
            dialogEl.addEventListener('click', event => {
                let el = {}, revisionId
                switch (true) {
                    case findTarget(event, '.download-revision', el):
                        revisionId = parseInt(el.target.dataset.id)
                        let revisionFilename = el.target.dataset.filename
                        this.download(revisionId, revisionFilename)
                        break
                    case findTarget(event, '.recreate-revision', el):
                        revisionId = parseInt(el.target.dataset.id)
                        resolve(this.recreate(revisionId, this.user))
                        break
                    case findTarget(event, '.delete-revision', el):
                        revisionId = parseInt(el.target.dataset.id)
                        resolve(this.delete(revisionId))
                        break
                    default:
                        break
                }
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
                        user
                    )
                    resolve(
                        importer.init().then(
                            ({doc, docInfo}) => {
                                deactivateWait()
                                addAlert('info', `${doc.title} ${gettext('successfully imported.')}`)
                                return {
                                    action: 'added-document',
                                    doc
                                }
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
        let buttons = [], that = this
        let returnPromise = new Promise(resolve => {
            buttons.push({
                text: gettext('Delete'),
                class: "fw-button fw-dark",
                click: function() {
                    jQuery(this).dialog("close")
                    resolve(that.deleteRevision(id))
                }
            })
            buttons.push({
                text: gettext('Cancel'),
                class: "fw-button fw-orange",
                click: function() {
                    jQuery(this).dialog("close")
                    resolve(cancelPromise())
                }
            })
        })

        jQuery(documentrevisionsConfirmDeleteTemplate()).dialog({
            resizable: false,
            height: 180,
            modal: true,
            appendTo: "#revisions-dialog",
            close: function() {
                jQuery(this).dialog('destroy').remove()
            },
            buttons
        })

        return returnPromise

    }

    deleteRevision(id) {
        return post(
            '/document/delete_revision/',
            {id}
        ).then(
            () => {
                let thisTr = document.querySelector(`tr.revision-${id}`),
                documentId = thisTr.getAttribute('data-document'),
                doc = this.documentList.find(doc => doc.id === parseInt(documentId))
                thisTr.parentElement.removeChild(thisTr)
                addAlert('success', gettext('Revision deleted'))
                return Promise.resolve({
                    action: 'deleted-revision',
                    id,
                    doc
                })
            }
        ).catch(
            () => {
                addAlert('error', gettext('Could not delete revision.'))
                return Promise.reject()
            }
        )

    }

}

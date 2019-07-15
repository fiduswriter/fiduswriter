import download from "downloadjs"

import {documentrevisionsTemplate} from "./templates"
import {ImportFidusFile} from "../../importer/file"
import {deactivateWait, addAlert, post, cancelPromise, findTarget, Dialog, escapeText} from "../../common"

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
        const doc = this.documentList.find(doc => doc.id === this.documentId)
        this.dialog = new Dialog({
            title: `${gettext('Saved revisions of')} ${escapeText(doc.title)}`,
            id: 'revisions-dialog',
            width: 620,
            height: 480,
            buttons: [{type: 'close'}],
            body: documentrevisionsTemplate({doc})
        })
        this.dialog.open()
        return this.bind()
    }


    bind() {
        const dialogEl = this.dialog.dialogEl

        return new Promise(resolve => {
            dialogEl.addEventListener('click', event => {
                const el = {}
                let revisionId, revisionFilename
                switch (true) {
                    case findTarget(event, '.download-revision', el):
                        revisionId = parseInt(el.target.dataset.id)
                        revisionFilename = el.target.dataset.filename
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
        return new Promise (resolve =>
            import("jszip-utils").then(({default: JSZipUtils}) => {
                JSZipUtils.getBinaryContent(
                    `/document/get_revision/${id}/`,
                    (err, fidusFile) => {
                        const importer = new ImportFidusFile(
                            fidusFile,
                            user
                        )
                        resolve(
                            importer.init().then(
                                ({ok, statusText, doc}) => {
                                    deactivateWait()
                                    if (ok) {
                                        addAlert('info', statusText)
                                        return {
                                            action: 'added-document',
                                            doc
                                        }
                                    } else {
                                        addAlert('error', statusText)
                                        return Promise.reject(new Error(statusText))
                                    }

                                }
                            )
                        )
                    }
                )
            })
        )
    }

    /**
     * Download a revision.
     * @param {number} id The pk value of the document revision.
     */

    download(id, filename) {
        import("jszip-utils").then(({default: JSZipUtils}) => {
            JSZipUtils.getBinaryContent(
                `/document/get_revision/${id}/`,
                (err, fidusFile) => download(fidusFile, filename, 'application/fidus+zip')
            )
        })
    }

    /**
     * Delete a revision.
     * @param {number} id The pk value of the document revision.
     */

    delete(id) {
        const buttons = []
        const returnPromise = new Promise(resolve => {

            buttons.push({
                text: gettext('Delete'),
                classes: "fw-dark",
                click: () => {
                    revisionsConfirmDeleteDialog.close()
                    resolve(this.deleteRevision(id))
                }
            })
            buttons.push({
                type: 'cancel',
                click: () => {
                    revisionsConfirmDeleteDialog.close()
                    resolve(cancelPromise())
                }
            })
        })

        const revisionsConfirmDeleteDialog = new Dialog({
            id: 'confirmdeletion',
            title: gettext('Confirm deletion'),
            icon: 'exclamation-triangle',
            body: `${gettext('Do you really want to delete the revision?')}`,
            height: 80,
            buttons
        })
        revisionsConfirmDeleteDialog.open()

        return returnPromise

    }

    deleteRevision(id) {
        return post(
            '/api/document/delete_revision/',
            {id}
        ).then(
            () => {
                const thisTr = document.querySelector(`tr.revision-${id}`),
                documentId = thisTr.dataset.document,
                doc = this.documentList.find(doc => doc.id === parseInt(documentId))
                thisTr.parentElement.removeChild(thisTr)
                addAlert('success', gettext('Revision deleted'))
                return Promise.resolve({
                    action: 'deleted-revision',
                    id,
                    doc
                })
                // TODO: Remove from overview menu as well
            }
        ).catch(
            () => {
                addAlert('error', gettext('Could not delete revision.'))
                return Promise.reject(new Error('Could not delete revision.'))
            }
        )

    }

}

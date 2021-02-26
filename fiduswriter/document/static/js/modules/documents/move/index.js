import {moveTemplate, newFolderTemplate} from "./templates"
import {addAlert, postJson, Dialog, FileSelector} from "../../common"
import {getDocTitle, moveDoc} from "../tools"
/**
* Functions for the document move dialog.
*/

export class DocumentMoveDialog {

    constructor(documentOverview, movingDocs, allDocs) {
        this.documentOverview = documentOverview
        this.movingDocs = movingDocs
        this.allDocs = allDocs
        this.path = this.getPath()
        this.fileSelector = false
    }

    getPath() {
        if (this.movingDocs.length === 1) {
            let path = this.movingDocs[0].path
            if (path.endsWith('/')) {
                path += this.movingDocs[0].title || gettext('Untitled')
            }
            return path
        }
        // We are moving several files. We assume they are all in the same directory
        // so we only need to take the file of the first file.
        return this.movingDocs[0].path.split('/').slice(0, -1).join('/') + '/'
    }

    updatePathDir(path) {
        const fileName = this.dialog.dialogEl.querySelector('#path').value.split('/').pop()
        this.dialog.dialogEl.querySelector('#path').value = path + fileName
    }

    init() {

        this.dialog = new Dialog({
            title: this.movingDocs.length > 1 ? gettext('Move documents') : gettext('Move document'),
            id: 'move-dialog',
            width: 820,
            height: 440,
            body: moveTemplate({
                path: this.path
            }),
            buttons: [
                {
                    text: gettext('New folder'),
                    classes: "fw-dark",
                    click: () => {
                        const newFolderDialog = new Dialog({
                            title: gettext('New folder'),
                            id: 'new-folder',
                            width: 400,
                            height: 150,
                            body: newFolderTemplate(),
                            buttons: [
                                {type: 'cancel'},
                                {
                                    text: gettext('Create folder'),
                                    classes: "fw-dark",
                                    click: () => {
                                        const folderName = newFolderDialog.dialogEl.querySelector('#new-folder-name').value
                                        newFolderDialog.close()
                                        if (
                                            !folderName.length ||
                                            !this.fileSelector
                                        ) {
                                            return
                                        }
                                        this.fileSelector.addFolder(folderName)
                                    }
                                }
                            ]
                        })

                        newFolderDialog.open()

                    }
                },
                {type: 'cancel'},
                {
                    text: gettext('Submit'),
                    classes: "fw-dark",
                    click: () => {
                        //apply the current state to server
                        let path = this.dialog.dialogEl.querySelector('#path').value
                        this.dialog.close()

                        if (path === this.path) {
                            // No change
                        }
                        if (this.movingDocs.length > 1) {
                            if (!path.endsWith('/')) {
                                path += '/'
                            }
                        }
                        this.movingDocs.forEach(doc => this.moveDocument(doc, path))
                    }
                }
            ]
        })
        this.dialog.open()

        this.fileSelector = new FileSelector({
            dom: this.dialog.dialogEl.querySelector('.file-selector'),
            files: this.allDocs,
            showFiles: false,
            selectDir: path => this.updatePathDir(path)
        })
        this.fileSelector.init()
    }

    moveDocument(doc, requestedPath) {
        return moveDoc(doc.id, doc.title, requestedPath).then(
            path => {
                addAlert('success', `${gettext('Document has been moved')}: '${getDocTitle(doc)}'`)
                doc.path = path
                this.documentOverview.initTable()
            }
        ).catch(
            () => {
                addAlert('error', `${gettext('Could not move document')}: '${getDocTitle(doc)}'`)
            }
        )
    }
}

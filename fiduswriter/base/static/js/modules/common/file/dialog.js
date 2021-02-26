import {moveTemplate, newFolderTemplate} from "./templates"
import {addAlert, Dialog, FileSelector} from "../../common"
import {shortFileTitle, moveFile} from "./tools"
/**
* Functions for the document move dialog.
*/

export class FileDialog {

    constructor({
        title = '', // Dialog title
        movingFiles = [], // Array of all files that are to be moved.
        allFiles = [], // Array of all existing files.
        moveUrl = '', // URL to use for moving files
        successMessage = '', // Message for success
        errorMessage = '', // Message for failure
        succcessCallback = (_file, _path) => {}, // Callback on success
        fileIcon = 'far fa-file-alt'
    }) {
        this.title = title
        this.movingFiles = movingFiles
        this.allFiles = allFiles
        this.moveUrl = moveUrl
        this.successMessage = successMessage
        this.errorMessage = errorMessage
        this.succcessCallback = succcessCallback
        this.fileIcon = fileIcon

        this.path = this.getPath()
        this.fileSelector = false
    }

    getPath() {
        if (this.movingFiles.length === 1) {
            let path = this.movingFiles[0].path
            if (path.endsWith('/')) {
                path += this.movingFiles[0].title || gettext('Untitled')
            }
            return path
        }
        // We are moving several files. We assume they are all in the same directory
        // so we only need to take the file of the first file.
        return this.movingFiles[0].path.split('/').slice(0, -1).join('/') + '/'
    }

    updatePathDir(path) {
        const fileName = this.dialog.dialogEl.querySelector('#path').value.split('/').pop()
        this.dialog.dialogEl.querySelector('#path').value = path + fileName
    }

    init() {

        this.dialog = new Dialog({
            title: this.title,
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
                        if (this.movingFiles.length > 1) {
                            if (!path.endsWith('/')) {
                                path += '/'
                            }
                        }
                        this.movingFiles.forEach(doc => this.moveFile(doc, path))
                    }
                }
            ]
        })
        this.dialog.open()

        this.fileSelector = new FileSelector({
            dom: this.dialog.dialogEl.querySelector('.file-selector'),
            files: this.allFiles,
            showFiles: false,
            selectDir: path => this.updatePathDir(path),
            fileIcon: this.fileIcon
        })
        this.fileSelector.init()
    }

    moveFile(file, requestedPath) {
        return moveFile(file.id, file.title, requestedPath, this.moveUrl).then(
            path => {
                addAlert('success', `${this.successMessage}: '${shortFileTitle(file.title, path)}'`)
                this.succcessCallback(file, path)
            }
        ).catch(
            () => {
                addAlert('error', `${this.errorMessage}: '${shortFileTitle(file.title, file.path)}'`)
            }
        )
    }
}

import {moveTemplate} from "./templates"
import {addAlert, postJson, Dialog} from "../../common"
import {getDocTitle} from "../tools"
/**
* Functions for the document move dialog.
*/

export class DocumentMoveDialog {

    constructor(documentOverview, docs) {
        this.documentOverview = documentOverview
        this.docs = docs
        this.path = this.docs.length === 1 ? this.docs[0].path : this.docs[0].path.split('/').slice(0, -1).join('/') + '/'
    }

    init() {

        this.dialog = new Dialog({
            title: this.docs.length > 1 ? gettext('Move documents') : gettext('Move document'),
            id: 'move-dialog',
            width: 820,
            height: 440,
            body: moveTemplate({
                path: this.path
            }),
            buttons: [
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
                        if (this.docs.length > 1 && !path.endsWith('/')) {
                            path += '/'
                        }
                        this.docs.forEach(doc => this.moveDocument(doc, path))
                    }
                }
            ]
        })
        this.dialog.open()
    }

    moveDocument(doc, path) {
        if (doc.path.length && path.endsWith('/') && !doc.path.endsWith('/')) {
            path += doc.path.split('/').pop()
        }
        if (path.length && !path.startsWith('/')) {
            path = '/' + path
        }
        path = path.replace(/\/{2,}/g, '/') // replace multiple backslashes
        postJson(
            '/api/document/move/',
            {id: doc.id, path}
        ).then(
            ({json}) => {
                if (json.done) {
                    addAlert('success', `${gettext('Document has been moved')}: '${getDocTitle(doc)}'`)
                    doc.path = path
                    this.documentOverview.initTable()
                } else {
                    addAlert('error', `${gettext('Could not move document')}: '${getDocTitle(doc)}'`)
                }
            }
        )
    }
}

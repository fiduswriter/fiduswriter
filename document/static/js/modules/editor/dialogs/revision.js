import {revisionDialogTemplate} from "./templates"
import {cancelPromise, Dialog} from "../../common"

export class RevisionDialog {
    constructor() {
        this.dialog = false
    }

    init() {
        let buttons = []
        let dialogDonePromise = new Promise(resolve => {
            buttons.push({
                text: gettext("Save"),
                classes: "fw-dark",
                click: () => {
                    let note = this.dialog.dialogEl.querySelector('.revision-note').value
                    this.dialog.close()
                    return resolve(note)
                }
            })

            buttons.push({
                type: 'cancel'
            })
        })

        this.dialog = new Dialog({
            title: gettext('Revision description'),
            body: revisionDialogTemplate(),
            height: 100,
            width: 300,
            buttons
        })
        this.dialog.open()

        return dialogDonePromise
    }
}

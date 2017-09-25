import {revisionDialogTemplate} from "./templates"
import {cancelPromise} from "../../common"

export class RevisionDialog {
    constructor() {
        this.dialog = false
    }

    init() {
        let buttons = []
        let dialogDonePromise = new Promise(resolve => {
            buttons.push({
                text: gettext("Save"),
                class: "fw-button fw-dark",
                click: () => {
                    let note = this.dialog.find('.revision-note').val()
                    this.dialog.dialog("close")
                    return resolve(note)
                }
            })

            buttons.push({
                text: gettext("Cancel"),
                class: "fw-button fw-orange",
                click: () => {
                    this.dialog.dialog("close")
                    return resolve(cancelPromise())
                }
            })
        })

        this.dialog = jQuery(revisionDialogTemplate())
        this.dialog.dialog({
            autoOpen: true,
            height: 180,
            width: 300,
            modal: true,
            buttons
        })

        return dialogDonePromise
    }
}

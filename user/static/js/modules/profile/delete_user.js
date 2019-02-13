import {deleteUserDialogTemplate} from "./templates"
import {Dialog, activateWait, deactivateWait, postBare, addAlert} from "../common"

export class DeleteUserDialog {
    constructor(username) {
        this.username = username
    }

    init() {
        const buttons = [
            {
                text: gettext('Delete'),
                classes: "fw-dark",
                click: () => {
                    const usernamefieldValue = document.getElementById('username-confirmation').value
                    const passwordfieldValue = document.getElementById('password').value
                    if (usernamefieldValue===this.username && passwordfieldValue.length) {
                        this.deleteCurrentUser(passwordfieldValue)
                    }
                }
            },
            {
                type: 'cancel'
            }
        ]
        this.dialog = new Dialog({
            id: 'confirmaccountdeletion',
            title: gettext('Confirm deletion'),
            body: deleteUserDialogTemplate(),
            icon: 'exclamation-triangle',
            buttons,
            height: 250
        })
        this.dialog.open()
    }

    deleteCurrentUser(password) {
       activateWait()

       postBare(
           '/account/delete/',
           {password}
       ).then(
           response => {
               switch (response.status) {
                   case 204:
                        window.location = '/account/login/'
                        break
                    case 403:
                        addAlert('error', gettext('Staff accounts have to be deleted through the admin interface.'))
                        break
                    case 401:
                        addAlert('error', gettext('Password incorrect.'))
                        break
                    default:
                        addAlert('error', gettext('Could not delete user account.'))
                        break
               }
               deactivateWait()
           }
       )
   }

}

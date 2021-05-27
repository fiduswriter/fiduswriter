import {postJson, Dialog} from "../common"

//dialog for removing a user from contacts
export class DeleteContactDialog {
    constructor(contactIds) {
        this.contactIds = contactIds
    }

    init() {
        const buttons = [
            {
                text: gettext('Delete'),
                classes: "fw-dark",
                click: () => {
                    const ids = this.contactIds
                    postJson(
                        '/api/user/contacts/delete/',
                        {
                            'contacts': ids
                        }
                    ).then(
                        ({status}) => {
                            if (status == 200) { //user removed from contacts
                                document.querySelectorAll(`#user-${ids.join(', #user-')}`).forEach(
                                    el => el.parentElement.removeChild(el)
                                )
                            }
                            dialog.close()
                        }
                    )
                }
            },
            {
                type: 'cancel'
            }
        ]
        const dialog = new Dialog({
            title: gettext('Confirm deletion'),
            id: 'confirmdeletion',
            body: `<p>${gettext('Remove from contacts')}?</p>`,
            height: 60,
            buttons
        })
        dialog.open()
    }
}

import {AddContactDialog} from "./add_dialog"
import {DeleteContactDialog} from "./delete_dialog"
import {teammemberTemplate} from "./templates"

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete selected contacts.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    const dialog = new DeleteContactDialog(ids)
                    dialog.init()
                }
            },
            disabled: overview => !overview.getSelected().length
        }
    ]
})

export const menuModel = () => ({
    content: [
        {
            type: 'text',
            title: gettext('Add new contact'),
            action: overview => {
                const dialog = new AddContactDialog(overview.registrationOpen)
                dialog.init().then(memberData => {
                    document.querySelector('#team-table tbody').insertAdjacentHTML(
                        'beforeend',
                        teammemberTemplate({
                            members: [memberData]
                        })
                    )
                })
            },
            order: 0
        }
    ]
})

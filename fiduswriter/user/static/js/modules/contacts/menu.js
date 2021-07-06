import {AddContactDialog} from "./add_dialog"
import {DeleteContactDialog} from "./delete_dialog"

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete selected contacts.'),
            action: overview => {
                const selected = overview.getSelected()
                if (selected.length) {
                    const dialog = new DeleteContactDialog(selected)
                    dialog.init().then(() => {
                        overview.contacts = overview.contacts.filter(
                            ocontact => !selected.some(
                                scontact => scontact.id == ocontact.id &&
                                    scontact.type == ocontact.type
                            )
                        )
                        overview.initializeView()
                    })
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
            title: gettext('Invite contact'),
            action: overview => {
                const dialog = new AddContactDialog()
                dialog.init().then(contacts => {
                    contacts.forEach(contact => overview.contacts.push(contact))
                    overview.initializeView()
                })
            },
            order: 0
        }
    ]
})

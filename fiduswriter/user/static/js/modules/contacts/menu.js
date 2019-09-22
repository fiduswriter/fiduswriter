import {AddContactDialog} from "./add_dialog"
import {DeleteContactDialog} from "./delete_dialog"
import {teammemberTemplate} from "./templates"

export const bulkModel = [
    {
        title: gettext('Delete selected'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                const dialog = new DeleteContactDialog(ids)
                dialog.init()
            }
        }
    }
]

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

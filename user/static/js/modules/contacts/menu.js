import {addMemberDialog, deleteMemberDialog} from "./manage"
import {teammemberTemplate} from "./templates"

export const bulkModel = [
    {
        title: gettext('Delete selected'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                deleteMemberDialog(ids)
            }
        }
    }
]

export const menuModel = () => ({
    content: [
        {
            type: 'text',
            title: gettext('Add new contact'),
            action: _overview => {
                addMemberDialog().then(memberData => {
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

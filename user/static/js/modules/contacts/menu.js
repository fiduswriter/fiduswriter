import {addMemberDialog, deleteMemberDialog} from "./manage"
import {teammemberTemplate} from "./templates"

export const menuModel = () => ({
    content: [
        {
            type: 'select-action-dropdown',
            id: 'contact_selector',
            open: false,
            checked: false,
            checkAction: _overview => {
                const checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = true)
            },
            uncheckAction: _overview => {
                const checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = false)
            },
            content: [
                {
                    title: gettext('Delete selected'),
                    action: overview => {
                        const ids = overview.getSelected()
                        if (ids.length) {
                            deleteMemberDialog(ids)
                        }
                    },
                    order: 0
                }
            ],
            order: 0
        },
        {
            type: 'button',
            icon: 'plus-circle',
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
            order: 1
        }
    ]
})

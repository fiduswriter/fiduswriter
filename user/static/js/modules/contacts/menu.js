import {addMemberDialog, deleteMemberDialog} from "./manage"
import {teammemberTemplate} from "./templates"

export let menuModel = {
    content: [
        {
            type: 'select-action-dropdown',
            id: 'contact_selector',
            open: false,
            checked: false,
            checkAction: overview => {
                let checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = true)
            },
            uncheckAction: overview => {
                let checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = false)
            },
            content: [
                {
                    title: gettext('Delete selected'),
                    action: overview => {
                        let ids = overview.getSelected()
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
            action: overview => {
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
}

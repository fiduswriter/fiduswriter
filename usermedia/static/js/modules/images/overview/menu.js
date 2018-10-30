import {ImageEditDialog} from "../edit_dialog"

export let menuModel = () => ({
    content: [
        {
            type: 'select-action-dropdown',
            id: 'bib_selector',
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
                            overview.deleteImageDialog(ids)
                        }
                    },
                    order: 0
                }
            ],
            order: 0
        },
        {
            type: 'dropdown',
            id: 'cat_selector',
            content : [
                {
                    title: gettext('All categories'),
                    action: overview => {
                        let trs = document.querySelectorAll('#imagelist > tbody > tr')
                        trs.forEach(tr => tr.style.display = '')
                    }
                }
            ],
            order: 1
        },
        {
            type: 'button',
            icon: 'pencil',
            title: gettext('Edit categories'),
            action: overview => overview.mod.categories.editCategoryDialog(),
            order: 2
        },
        {
            type: 'button',
            icon: 'plus-circle',
            title: gettext('Upload new image'),
            action: overview => {
                let imageUpload = new ImageEditDialog(
                    overview.imageDB
                )
                imageUpload.init().then(
                    imageId => {
                        overview.updateTable([imageId])
                    }
                )
            },
            order: 3
        },
        {
            type: 'search',
            icon: 'search',
            title: gettext('Search images'),
            input: (overview, text) => overview.table.search(text),
            order: 4
        }
    ]
})

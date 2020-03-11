export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete selected images.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.deleteImageDialog(ids)
                }
            },
            disabled: overview => !overview.getSelected().length
        }
    ]
})

export const menuModel = () => ({
    content: [
        {
            type: 'dropdown',
            id: 'cat_selector',
            content : [
                {
                    title: gettext('All categories'),
                    action: _overview => {
                        const trs = document.querySelectorAll('#imagelist > tbody > tr')
                        trs.forEach(tr => tr.style.display = '')
                    }
                }
            ],
            order: 1
        },
        {
            type: 'text',
            title: gettext('Edit categories'),
            action: overview => overview.mod.categories.editCategoryDialog(),
            order: 2
        },
        {
            type: 'text',
            title: gettext('Upload new image'),
            action: overview => {
                import("../edit_dialog").then(({ImageEditDialog}) => {
                    const imageUpload = new ImageEditDialog(
                        overview.app.imageDB
                    )
                    imageUpload.init().then(
                        imageId => {
                            overview.updateTable([imageId])
                        }
                    )
                })
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

import {addAlert} from "../common"

export const menuModel = () => ({
    content: [
        {
            type: 'text',
            title: gettext('Create new document template'),
            action: overview => {
                overview.app.goTo('/templates/0/')
            }
        }
    ]
})

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete selected document templates.'),
            action: overview => {
                const ids = overview.getSelected()
                const ownIds = ids.filter(id => {
                    const docTemplate = overview.templateList.find(docTemplate => docTemplate.id = id)
                    return docTemplate.is_owner
                })
                if (ownIds.length !== ids.length) {
                    addAlert('error', gettext('You cannot delete system document templates.'))
                }
                if (ownIds.length) {
                    overview.mod.actions.deleteDocTemplatesDialog(ownIds)
                }
            },
            disabled: overview => !overview.getSelected().length
        },
        {
            title: gettext('Duplicate selected'),
            tooltip: gettext('Duplicate selected document templates.'),
            action: overview => {
                const ids = overview.getSelected()
                ids.forEach(id =>
                    overview.mod.actions.copyDocTemplate(
                        overview.templateList.find(docTemplate => docTemplate.id === id)
                    )
                )
            },
            disabled: overview => !overview.getSelected().length
        }
    ]
})

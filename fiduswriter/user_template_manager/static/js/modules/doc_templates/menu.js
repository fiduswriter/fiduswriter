import {addAlert} from "../common"

export const menuModel = () => ({
    content: [
        {
            type: 'text',
            title: gettext('Create new document template'),
            action: overview => {
                overview.getImageDB().then(() => {
                    overview.mod.actions.createBookDialog(0, overview.imageDB)
                })
            }
        }
    ]
})

export const bulkModel = [
    {
        title: gettext('Delete selected'),
        action: overview => {
            const ids = overview.getSelected()
            const ownIds = ids.filter(id => {
                const docTemplate = overview.templateList.find(docTemplate => docTemplate.id=id)
                return docTemplate.is_owner
            })
            if (ownIds.length !== ids.length) {
                addAlert('error', gettext('You cannot delete system document templates.'))
            }
            if (ownIds.length) {
                overview.mod.actions.deleteDocTemplatesDialog(ownIds)
            }
        }
    },
    {
        title: gettext('Copy selected'),
        action: overview => {
            const ids = overview.getSelected()
            ids.forEach(id =>
                overview.mod.actions.copyDocTemplate(
                    overview.templateList.find(docTemplate => docTemplate.id===id)
                )
            )
        }
    }
]

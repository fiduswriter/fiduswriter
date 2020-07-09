import {DocumentAccessRightsDialog} from "../access_rights"
import {addAlert} from "../../common"

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete the documents that have been selected.'),
            action: overview => {
                const ids = overview.getSelected()
                const ownIds = ids.filter(id => overview.documentList.find(doc => doc.id === id).is_owner)
                if (ownIds.length !== ids.length) {
                    addAlert('error', gettext('You cannot delete documents of other users'))
                }
                if (ownIds.length) {
                    overview.mod.actions.deleteDocumentDialog(ownIds)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 0
        },
        {
            title: gettext('Share selected'),
            tooltip: gettext('Share the documents that have been selected.'),
            action: overview => {
                const ids = overview.getSelected()
                const ownIds = ids.filter(id => overview.documentList.find(doc => doc.id === id).is_owner)
                if (ownIds.length !== ids.length) {
                    addAlert('error', gettext('You cannot share documents of other users'))
                }
                if (ownIds.length) {
                    const dialog = new DocumentAccessRightsDialog(
                        ids,
                        overview.teamMembers,
                        memberDetails => overview.teamMembers.push(memberDetails)
                    )
                    dialog.init()
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 1
        },
        {
            title: gettext('Copy selected'),
            tooltip: gettext('Copy the documents that have been selected.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.copyFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 2
        },
        {
            title: gettext('Export selected as Epub'),
            tooltip: gettext('Export the documents that have been selected as Epub files.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.downloadEpubFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 3
        },
        {
            title: gettext('Export selected as HTML'),
            tooltip: gettext('Export the documents that have been selected as HTML files.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.downloadHtmlFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 4
        },
        {
            title: gettext('Export selected as LaTeX'),
            tooltip: gettext('Export the documents that have been selected as LaTeX files.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.downloadLatexFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 5
        },
        {
            title: gettext('Export selected as JATS'),
            tooltip: gettext('Export the documents that have been selected as JATS files.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.downloadJATSFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 6
        },
        {
            title: gettext('Export selected as FIDUS'),
            tooltip: gettext('Export the documents that have been selected as FIDUS files.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    overview.mod.actions.downloadNativeFiles(ids)
                }
            },
            disabled: overview => !overview.getSelected().length || overview.app.isOffline(),
            order: 7
        }
    ]
})

export const menuModel = () => ({
    content: [
        {
            type: 'text',
            id: 'new_document',
            title: gettext('Create new document'),
            action: overview => overview.goToNewDocument('new'),
            order: 1
        },
        {
            type: 'text',
            title: gettext('Upload Fidus document'),
            action: overview => overview.mod.actions.importFidus(),
            order: 2
        },
        {
            type: 'search',
            icon: 'search',
            title: gettext('Search documents'),
            input: (overview, text) => overview.table.search(text),
            order: 3
        }
    ]
})

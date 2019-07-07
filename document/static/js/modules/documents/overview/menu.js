import {DocumentAccessRightsDialog} from "../access_rights"
import {addAlert} from "../../common"

export const bulkModel = [
    {
        title: gettext('Delete selected'),
        action: overview => {
            const ids = overview.getSelected()
            const ownIds = ids.filter(id => overview.documentList.find(doc => doc.id===id).is_owner)
            if (ownIds.length !== ids.length) {
                addAlert('error', gettext('You cannot delete documents of other users'))
            }
            if (ownIds.length) {
                overview.mod.actions.deleteDocumentDialog(ownIds)
            }
        },
        order: 0
    },
    {
        title: gettext('Share selected'),
        action: overview => {
            const ids = overview.getSelected()
            const ownIds = ids.filter(id => overview.documentList.find(doc => doc.id===id).is_owner)
            if (ownIds.length !== ids.length) {
                addAlert('error', gettext('You cannot share documents of other users'))
            }
            if (ownIds.length) {
                const dialog = new DocumentAccessRightsDialog(
                    ids,
                    overview.teamMembers,
                    memberDetails => overview.teamMembers.push(memberDetails),
                    overview.registrationOpen
                )
                dialog.init()
            }
        },
        order: 1
    },
    {
        title: gettext('Copy selected'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                overview.mod.actions.copyFiles(ids)
            }
        },
        order: 2
    },
    {
        title: gettext('Export selected as Epub'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                overview.mod.actions.downloadEpubFiles(ids)
            }
        },
        order: 3
    },
    {
        title: gettext('Export selected as HTML'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                overview.mod.actions.downloadHtmlFiles(ids)
            }
        },
        order: 4
    },
    {
        title: gettext('Export selected as LaTeX'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                overview.mod.actions.downloadLatexFiles(ids)
            }
        },
        order: 5
    },
    {
        title: gettext('Download selected as Fidus document'),
        action: overview => {
            const ids = overview.getSelected()
            if (ids.length) {
                overview.mod.actions.downloadNativeFiles(ids)
            }
        },
        order: 6
    }
]

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

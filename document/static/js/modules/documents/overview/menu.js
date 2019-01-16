import {DocumentAccessRightsDialog} from "../access_rights"
import {addAlert} from "../../common"

export let menuModel = () => ({
    content: [
        {
            type: 'select-action-dropdown',
            id: 'doc_selector',
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
                        let ids = overview.getSelected()
                        let ownIds = ids.filter(id => overview.documentList.find(doc => doc.id===id).is_owner)
                        if (ownIds.length !== ids.length) {
                            addAlert('error', gettext('You cannot share documents of other users'))
                        }
                        if (ownIds.length) {
                            new DocumentAccessRightsDialog(
                                ids,
                                overview.accessRights,
                                overview.teamMembers,
                                newAccessRights => overview.accessRights = newAccessRights
                            )
                        }
                    },
                    order: 1
                },
                {
                    title: gettext('Copy selected'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.copyFiles(ids)
                        }
                    },
                    order: 2
                },
                {
                    title: gettext('Export selected as Epub'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadEpubFiles(ids)
                        }
                    },
                    order: 3
                },
                {
                    title: gettext('Export selected as HTML'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadHtmlFiles(ids)
                        }
                    },
                    order: 4
                },
                {
                    title: gettext('Export selected as LaTeX'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadLatexFiles(ids)
                        }
                    },
                    order: 5
                },
                {
                    title: gettext('Download selected as Fidus document'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadNativeFiles(ids)
                        }
                    },
                    order: 6
                }
            ],
            order: 0
        },
        {
            type: 'button',
            icon: 'plus-circle',
            title: gettext('Create new document'),
            action: _overview => window.location.href = '/document/new/',
            order: 1
        },
        {
            type: 'button',
            icon: 'upload',
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

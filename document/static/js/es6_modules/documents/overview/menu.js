import {DocumentAccessRightsDialog} from "../access-rights"
import {addAlert} from "../../common"

export let menuModel = {
    content: [
        {
            type: 'select-action-dropdown',
            id: 'doc_selector',
            open: false,
            checked: false,
            checkAction: overview => {
                let checkboxes = [].slice.call(document.querySelectorAll('input.entry-select[type=checkbox]'))
                checkboxes.forEach(checkbox => checkbox.checked = true)
            },
            uncheckAction: overview => {
                let checkboxes = [].slice.call(document.querySelectorAll('input.entry-select[type=checkbox]'))
                checkboxes.forEach(checkbox => checkbox.checked = false)
            },
            content: [
                {
                    title: gettext('Delete selected'),
                    action: overview => {
                        let ids = overview.getSelected()
                        let ownIds = ids.filter(id => overview.documentList[id].is_owner)
                        if (ownIds.length !== ids.length) {
                            addAlert('error', gettext('You cannot delete documents of other users'))
                        }
                        if (ownIds.length) {
                            overview.mod.actions.deleteDocumentDialog(ownIds)
                        }
                    }
                },
                {
                    title: gettext('Share selected'),
                    action: overview => {
                        let ids = overview.getSelected()
                        let ownIds = ids.filter(id => overview.documentList[id].is_owner)
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
                    }
                },
                {
                    title: gettext('Copy selected'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.copyFiles(ids)
                        }
                    }
                },
                {
                    title: gettext('Export selected as Epub'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadEpubFiles(ids)
                        }
                    }
                },
                {
                    title: gettext('Export selected as HTML'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadHtmlFiles(ids)
                        }
                    }
                },
                {
                    title: gettext('Export selected as LaTeX'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadLatexFiles(ids)
                        }
                    }
                },
                {
                    title: gettext('Download selected as Fidus document'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            overview.mod.actions.downloadNativeFiles(ids)
                        }
                    }
                }
            ]
        },
        {
            type: 'button',
            icon: 'plus-circle',
            title: gettext('Create new document'),
            action: overview => window.location.href = '/document/new/'
        },
        {
            type: 'button',
            icon: 'upload',
            title: gettext('Upload Fidus document'),
            action: overview => overview.mod.actions.importFidus()
        }
    ]
}

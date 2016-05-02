import {DocumentAccessRightsDialog} from "../access-rights/dialog"

export class DocumentOverviewMenus {
    constructor (documentOverview) {
        documentOverview.mod.menus = this
        this.documentOverview = documentOverview
        this.bind()
    }

    bind() {
        let that = this
        jQuery(document).ready(function () {
            jQuery(document).on('mousedown', '.delete-document', function () {
                let DocumentId = jQuery(this).attr('data-id')
                that.documentOverview.mod.actions.deleteDocumentDialog([DocumentId])
            })

            jQuery(document).on('mousedown', '.owned-by-user .rights', function () {
                let documentId = parseInt(jQuery(this).attr('data-id'))
                new DocumentAccessRightsDialog([documentId], that.documentOverview.accessRights, that.documentOverview.teamMembers, function (newAccessRights) {
                    that.documentOverview.accessRights = newAccessRights
                }, function(memberDetails){
                    that.documentOverview.teamMembers.push(memberDetails)
                })
            })

            jQuery(document).on('mousedown', '.revisions', function () {
                let documentId = parseInt(jQuery(this).attr('data-id'))
                that.documentOverview.mod.actions.revisionsDialog(documentId)
            })

            //select all entries
            jQuery('#select-all-entry').bind('change', function () {
                let newBool = false
                if (jQuery(this).prop("checked"))
                    newBool = true
                jQuery('.entry-select').not(':disabled').each(function () {
                    this.checked = newBool
                })
            })

            //open dropdown for selecting action
            $.addDropdownBox(jQuery('#select-action-dropdown-documents'), jQuery(
                '#action-selection-pulldown-documents'))

            //submit action for selected document
            jQuery('#action-selection-pulldown-documents li > span').bind('mousedown',
                function () {
                    let actionName = jQuery(this).attr('data-action'),
                        ids = []
                    if ('' == actionName || 'undefined' == typeof (actionName))
                        return
                    jQuery('.entry-select:checked').not(':disabled').each(function () {
                        if (that.documentOverview.user.id != jQuery(this).attr('data-owner') && (
                            actionName === 'delete' || actionName ===
                            'share')) {
                            let theTitle = jQuery(this).parent().parent().parent()
                                .find(
                                    '.doc-title').text()
                            theTitle = $.trim(theTitle).replace(/[\t\n]/g, '')
                            $.addAlert('error', gettext(
                                'You cannot delete or share: ') + theTitle)
                            //return true
                        } else {
                            ids[ids.length] = parseInt(jQuery(this).attr(
                                'data-id'))
                        }
                    })
                    if (0 == ids.length)
                        return
                    switch (actionName) {
                    case 'delete':
                        that.documentOverview.mod.actions.deleteDocumentDialog(ids)
                        break
                    case 'share':
                        new DocumentAccessRightsDialog(ids, that.documentOverview.accessRights, that.documentOverview.teamMembers, function (newAccessRights) {
                            that.documentOverview.accessRights = newAccessRights
                        })
                        break
                    case 'epub':
                        that.documentOverview.mod.actions.downloadEpubFiles(ids)
                        break
                    case 'latex':
                        that.documentOverview.mod.actions.downloadLatexFiles(ids)
                        break
                    case 'html':
                        that.documentOverview.mod.actions.downloadHtmlFiles(ids)
                        break
                    case 'native':
                        that.documentOverview.mod.actions.downloadNativeFiles(ids)
                        break
                    case 'copy':
                        that.documentOverview.mod.actions.copyFiles(ids)
                        break
                    }

                })

            //import a fidus filw
            jQuery('.import-fidus').bind('mousedown', function () {that.documentOverview.mod.actions.importFidus() })
        })
    }

}

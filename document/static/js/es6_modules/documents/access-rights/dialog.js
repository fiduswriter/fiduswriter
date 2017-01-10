import {accessRightOverviewTemplate, accessRightTrTemplate, collaboratorsTemplate} from "./templates"
import {addMemberDialog} from "../../contacts/manage"
import {addDropdownBox, setCheckableLabel, addAlert, csrfToken} from "../../common/common"

/**
* Functions for the document access rights dialog.
*/

export class DocumentAccessRightsDialog {

    constructor(documentIds, accessRights, teamMembers, callback, createContactCallback) {
        this.documentIds = documentIds
        this.accessRights = accessRights
        this.teamMembers = teamMembers
        this.callback = callback
        this.createContactCallback = createContactCallback
        this.createAccessRightsDialog()
    }

    createAccessRightsDialog() {
        let dialogHeader = gettext('Share your document with others')
        let documentCollaborators = {}
        let len = this.accessRights.length

        for (let i = 0; i < len; i++) {
            if (_.include(this.documentIds, this.accessRights[i].document_id)) {
                if ('undefined' == typeof (documentCollaborators[
                    this.accessRights[i].user_id])) {
                    documentCollaborators[this.accessRights[i].user_id] =
                        this.accessRights[i]
                    documentCollaborators[this.accessRights[i].user_id].count =
                        1
                } else {
                    if (documentCollaborators[this.accessRights[i].user_id].rights !=
                        this.accessRights[i].rights)
                    documentCollaborators[this.accessRights[i].user_id].rights =
                        'read'
                    documentCollaborators[this.accessRights[i].user_id].count +=
                        1
                }
            }
        }
        documentCollaborators = _.select(
            documentCollaborators,
            obj => obj.count === this.documentIds.length
        )

        let dialogBody = accessRightOverviewTemplate({
            dialogHeader: dialogHeader,
            contacts: accessRightTrTemplate({contacts: this.teamMembers}),
            collaborators: collaboratorsTemplate({
                collaborators: documentCollaborators
            })
        })
        jQuery('body').append(dialogBody)

        let diaButtons = {}
        diaButtons[gettext('Add new contact')] = () => {
            addMemberDialog(memberData => {
                jQuery('#my-contacts .fw-document-table-body').append(
                    accessRightTrTemplate({contacts: [memberData]})
                )
                jQuery('#share-member table tbody').append(
                    collaboratorsTemplate({'collaborators': [{
                        user_id: memberData.id,
                        user_name: memberData.name,
                        avatar: memberData.avatar,
                        rights: 'read'
                    }]})
                )
                this.collaboratorFunctionsEvent()
                if (this.createContactCallback) {
                    this.createContactCallback(memberData)
                }
            })
        }
        let that = this
        diaButtons[gettext('Submit')] = function () {
            //apply the current state to server
            let collaborators = [],
                rights = []
            jQuery('#share-member .collaborator-tr').each(function () {
                collaborators[collaborators.length] = jQuery(this).attr(
                    'data-id')
                rights[rights.length] = jQuery(this).attr('data-right')
            })
            that.submitAccessRight(collaborators, rights)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
        }

        jQuery('#access-rights-dialog').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 820,
            height: 540,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-light fw-add-button")
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(1)").addClass("fw-button fw-dark")
                theDialog.find(".ui-dialog-buttonset .ui-button:eq(2)").addClass("fw-button fw-orange")
            },
            close: function () {
                jQuery('#access-rights-dialog').dialog('destroy').remove()
            }
        })
        this.bindDialogEvents()
        this.collaboratorFunctionsEvent()
    }

    bindDialogEvents() {
        let that = this
        jQuery('#add-share-member').unbind('click')
        jQuery('#add-share-member').bind('click', function () {
            let selectedMembers = jQuery('#my-contacts .fw-checkable.checked')
            let selectedData = []
            selectedMembers.each(function () {
                let memberId = jQuery(this).attr('data-id')
                let collaborator = jQuery('#collaborator-' + memberId)
                if (0 === collaborator.length) {
                    selectedData[selectedData.length] = {
                        'user_id': memberId,
                        'user_name': jQuery(this).attr('data-name'),
                        'avatar': jQuery(this).attr('data-avatar'),
                        'rights': 'read'
                    }
                } else if ('delete' == collaborator.attr('data-right')) {
                    collaborator.removeClass('delete').addClass('read').attr(
                        'data-right', 'read')
                }
            })
            jQuery('#my-contacts .checkable-label.checked').removeClass('checked')
            jQuery('#share-member table tbody').append(collaboratorsTemplate({
                'collaborators': selectedData
            }))
            that.collaboratorFunctionsEvent()
        })
    }

    collaboratorFunctionsEvent() {
        jQuery('.fw-checkable').unbind('click')
        jQuery('.fw-checkable').bind('click', function () {
            setCheckableLabel(jQuery(this))
        })
        jQuery('.edit-right').unbind('click')
        jQuery('.edit-right').each(function () {
            addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'))
        })
        let spans = jQuery(
            '.edit-right-wrapper .fw-pulldown-item, .delete-collaborator')
        spans.unbind('mousedown')
        spans.bind('mousedown', function () {
            let newRight = jQuery(this).attr('data-right')
            let colRow = jQuery(this).closest('.collaborator-tr')
            colRow.attr('data-right', newRight)
            colRow.find('.icon-access-right').attr('class',
                'icon-access-right icon-access-' + newRight)
        })
    }

    submitAccessRight(newCollaborators, newAccessRights) {
        let postData = {
            'documents[]': this.documentIds,
            'collaborators[]': newCollaborators,
            'rights[]': newAccessRights
        }
        jQuery.ajax({
            url: '/document/accessright/save/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: response => {
                this.accessRights = response.access_rights
                this.callback(this.accessRights)
                addAlert('success', gettext(
                    'Access rights have been saved'))
            },
            error: (jqXHR, textStatus, errorThrown) => {
                console.error(jqXHR.responseText)
            }
        })
    }
}

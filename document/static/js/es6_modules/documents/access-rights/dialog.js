import {accessRightOverviewTemplate, accessRightTrTemplate, collaboratorsTemplate} from "./templates"
import {addMemberDialog} from "../../contacts/manage"
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
        let that = this
        let dialogHeader = gettext('Share your document with others')
        let documentCollaborators = {}
        let len = this.accessRights.length

        for (let i = 0; i < len; i++) {
            if (_.include(that.documentIds, that.accessRights[i].document_id)) {
                if ('undefined' == typeof (documentCollaborators[
                    that.accessRights[i].user_id])) {
                    documentCollaborators[that.accessRights[i].user_id] =
                        that.accessRights[i]
                    documentCollaborators[that.accessRights[i].user_id].count =
                        1
                } else {
                    if (documentCollaborators[that.accessRights[i].user_id].rights !=
                        that.accessRights[i].rights)
                    documentCollaborators[that.accessRights[i].user_id].rights =
                        'r'
                    documentCollaborators[that.accessRights[i].user_id].count +=
                        1
                }
            }
        }
        documentCollaborators = _.select(documentCollaborators, function (obj) {
            return obj.count == that.documentIds.length
        })

        let dialogBody = accessRightOverviewTemplate({
            'dialogHeader': dialogHeader,
            'contacts': accessRightTrTemplate({'contacts': that.teamMembers}),
            'collaborators': collaboratorsTemplate({
                'collaborators': documentCollaborators
            })
        })
        jQuery('body').append(dialogBody)

        let diaButtons = {}
        diaButtons[gettext('Add new contact')] = function () {
            addMemberDialog(function(memberData){
                jQuery('#my-contacts .fw-document-table-body').append(accessRightTrTemplate({'contacts': [memberData]}))
                jQuery('#share-member table tbody').append(collaboratorsTemplate({'collaborators': [{
                    'user_id': memberData.id,
                    'user_name': memberData.name,
                    'avatar': memberData.avatar,
                    'rights': 'r'
                }]}))
                that.collaboratorFunctionsEvent()
                if (that.createContactCallback) {
                    that.createContactCallback(memberData)
                }
            })
        }
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
                if (0 == collaborator.size()) {
                    selectedData[selectedData.length] = {
                        'user_id': memberId,
                        'user_name': jQuery(this).attr('data-name'),
                        'avatar': jQuery(this).attr('data-avatar'),
                        'rights': 'r'
                    }
                } else if ('d' == collaborator.attr('data-right')) {
                    collaborator.removeClass('d').addClass('r').attr(
                        'data-right', 'r')
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
            $.setCheckableLabel(jQuery(this))
        })
        jQuery('.edit-right').unbind('click')
        jQuery('.edit-right').each(function () {
            $.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'))
        })
        let spans = jQuery(
            '.edit-right-wrapper .fw-pulldown-item, .delete-collaborator')
        spans.unbind('mousedown')
        spans.bind('mousedown', function () {
            let newRight = jQuery(this).attr('data-right')
            jQuery(this).closest('.collaborator-tr').attr('class',
                'collaborator-tr ' + newRight)
            jQuery(this).closest('.collaborator-tr').attr('data-right',
                newRight)
        })
    }

    submitAccessRight(newCollaborators, newAccessRights) {
        let that = this
        let postData = {
            'documents[]': that.documentIds,
            'collaborators[]': newCollaborators,
            'rights[]': newAccessRights
        }
        $.ajax({
            url: '/document/accessright/save/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (response) {
                that.accessRights = response.access_rights
                that.callback(that.accessRights)
                $.addAlert('success', gettext(
                    'Access rights have been saved'))
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText)
            }
        })
    }

}

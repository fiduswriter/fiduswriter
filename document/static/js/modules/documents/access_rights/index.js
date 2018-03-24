import {accessRightOverviewTemplate, accessRightTrTemplate, collaboratorsTemplate} from "./templates"
import {addMemberDialog} from "../../contacts/manage"
import {addDropdownBox, setCheckableLabel, addAlert, postJson} from "../../common"

/**
* Functions for the document access rights dialog.
*/

export class DocumentAccessRightsDialog {

    constructor(documentIds, accessRights, contacts, modifiedRightsCall, newContactCall) {
        this.documentIds = documentIds
        this.accessRights = accessRights
        this.contacts = contacts
        this.modifiedRightsCall = modifiedRightsCall // a function to be called when access rights are modified with the new rights
        this.newContactCall = newContactCall // a function to be called when a new contact has been added with contact details
        this.createAccessRightsDialog()
    }

    createAccessRightsDialog() {
        let dialogHeader = gettext('Share your document with others')
        let documentCollaborators = {}
        let len = this.accessRights.length

        for (let i = 0; i < len; i++) {
            if (this.documentIds.includes(this.accessRights[i].document_id)) {
                if ('undefined' == typeof (
                    documentCollaborators[this.accessRights[i].user_id]
                )) {
                    documentCollaborators[this.accessRights[i].user_id] =
                        this.accessRights[i]
                    documentCollaborators[this.accessRights[i].user_id].count = 1
                } else {
                    if (
                        documentCollaborators[this.accessRights[i].user_id].rights !=
                        this.accessRights[i].rights
                    )
                    documentCollaborators[this.accessRights[i].user_id].rights ='read'
                    documentCollaborators[this.accessRights[i].user_id].count +=1
                }
            }
        }

        let collaborators = Object.values(documentCollaborators).filter(
            col => col.count === this.documentIds.length
        )


        let dialogBody = accessRightOverviewTemplate({
            dialogHeader,
            contacts: this.contacts,
            collaborators
        })
        document.body.insertAdjacentHTML(
            'beforeend',
            dialogBody
        )
        let that = this
        let buttons = [
            {
                text: gettext('Add new contact'),
                class: "fw-button fw-light fw-add-button",
                click: () => {
                    addMemberDialog().then(
                        memberData => {
                            document.querySelector('#my-contacts .fw-document-table-body').insertAdjacentHTML(
                                'beforeend',
                                accessRightTrTemplate({contacts: [memberData]})
                            )
                            document.querySelector('#share-member table tbody').insertAdjacentHTML(
                                'beforeend',
                                collaboratorsTemplate({'collaborators': [{
                                    user_id: memberData.id,
                                    user_name: memberData.name,
                                    avatar: memberData.avatar,
                                    rights: 'read'
                                }]})
                            )
                            this.collaboratorFunctionsEvent()
                            this.newContactCall(memberData)
                        }
                    )
                }
            },
            {
                text: gettext('Submit'),
                class: "fw-button fw-dark",
                click: function () {
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
            },
            {
                text: gettext('Cancel'),
                class: "fw-button fw-orange",
                click: function () {
                    jQuery(this).dialog("close")
                }
            }
        ]
        jQuery('#access-rights-dialog').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 820,
            height: 540,
            modal: true,
            buttons,
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
            let selectedData = []
            document.querySelectorAll('#my-contacts .fw-checkable.checked').forEach(el => {
                let memberId = el.getAttribute('data-id')
                let collaboratorEl = document.getElementById(`collaborator-${memberId}`)
                if (collaboratorEl) {
                    if (collaboratorEl.getAttribute('data-right') === 'delete') {
                        collaboratorEl.classList.remove('delete')
                        collaboratorEl.classList.addClass('read')
                        collaboratorEl.setAttribute('data-right', 'read')
                    }
                } else {
                    selectedData.push({
                        'user_id': memberId,
                        'user_name': this.getAttribute('data-name'),
                        'avatar': this.getAttribute('data-avatar'),
                        'rights': 'read'
                    })
                }
            })

            document.querySelectorAll('#my-contacts .checkable-label.checked').forEach(el => el.classList.remove('checked'))
            document.querySelector('#share-member table tbody').insertHTML(
                'beforeend',
                collaboratorsTemplate({
                    'collaborators': selectedData
                })
            )
            that.collaboratorFunctionsEvent()
        })
    }

    collaboratorFunctionsEvent() {
        jQuery('.fw-checkable').unbind('click')
        jQuery('.fw-checkable').bind('click', function () {
            setCheckableLabel(this)
        })
        jQuery('.edit-right').unbind('click')
        jQuery('.edit-right').each(function () {
            addDropdownBox(this, this.parentElement.querySelector('.fw-pulldown'))
        })
        let spans = jQuery(
            '.edit-right-wrapper .fw-pulldown-item, .delete-collaborator')
        spans.unbind('mousedown')
        spans.bind('mousedown', function () {
            let newRight = this.dataset.right
            let colRow = this.closest('.collaborator-tr')
            colRow.setAttribute('data-right', newRight)
            colRow.querySelector('.icon-access-right').setAttribute('class',
                'icon-access-right icon-access-' + newRight)
        })
    }

    submitAccessRight(newCollaborators, newAccessRights) {
        postJson(
            '/document/accessright/save/',
            {
                'documents': this.documentIds,
                'collaborators': newCollaborators,
                'rights': newAccessRights
            }
        ).then(
            response => {
                this.accessRights = response.access_rights
                this.modifiedRightsCall(this.accessRights)
                addAlert('success', gettext(
                    'Access rights have been saved'))
            }
        ).catch(
            () => addAlert('error', gettext('Access rights could not be saved'))
        )

    }
}

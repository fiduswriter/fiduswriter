import {accessRightOverviewTemplate, contactsTemplate, collaboratorsTemplate} from "./templates"
import {addMemberDialog} from "../../contacts/manage"
import {openDropdownBox, findTarget, setCheckableLabel, addAlert, postJson, Dialog} from "../../common"

/**
* Functions for the document access rights dialog.
*/

export class DocumentAccessRightsDialog {

    constructor(documentIds, contacts, newContactCall) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall // a function to be called when a new contact has been added with contact details
    }

    init() {
        postJson(
            '/api/document/get_access_rights/',
            {document_ids: this.documentIds}
        ).catch(
            error => {
                addAlert('error', gettext('Cannot load document access data.'))
                throw error
            }
        ).then(
            ({json}) => {
                this.accessRights = json.access_rights
                this.createAccessRightsDialog()
            }
        )
    }

    createAccessRightsDialog() {

        const docCollabs = {}

        // We are potentially dealing with access rights of several documents, so
        // we first need to find out which users have access on all of the documents.
        // Those are the access rights we will display in the dialog.
        this.accessRights.forEach(ar => {
            if (!this.documentIds.includes(ar.document_id)) {
                return
            }
            if (!docCollabs[ar.user_id]) {
                docCollabs[ar.user_id] = Object.assign({}, ar)
                docCollabs[ar.user_id].count = 1
            } else {
                if (docCollabs[ar.user_id].rights != ar.rights) {
                    // We use read rights if the user has different rights on different docs.
                    docCollabs[ar.user_id].rights ='read'
                }
                docCollabs[ar.user_id].count +=1
            }
        })

        const collaborators = Object.values(docCollabs).filter(
            col => col.count === this.documentIds.length
        )

        const buttons = [
            {
                text: gettext('Add new contact'),
                classes: "fw-light fw-add-button",
                click: () => {
                    addMemberDialog().then(
                        memberData => {
                            document.querySelector('#my-contacts .fw-data-table-body').insertAdjacentHTML(
                                'beforeend',
                                contactsTemplate({contacts: [memberData]})
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
                            this.newContactCall(memberData)
                        }
                    )
                }
            },
            {
                text: gettext('Submit'),
                classes: "fw-dark",
                click: () => {
                    //apply the current state to server
                    const accessRights = []
                    document.querySelectorAll('#share-member .collaborator-tr').forEach(el => {
                        accessRights.push({user_id: parseInt(el.dataset.id), rights: el.dataset.rights})
                    })
                    this.submitAccessRight(accessRights)
                    this.dialog.close()
                }
            },
            {
                type: 'cancel'
            }
        ]
        this.dialog = new Dialog({
            title: gettext('Share your document with others'),
            id: 'access-rights-dialog',
            width: 820,
            height: 440,
            body: accessRightOverviewTemplate({
                contacts: this.contacts,
                collaborators
            }),
            buttons
        })
        this.dialog.open()
        this.bindDialogEvents()
    }

    bindDialogEvents() {
        this.dialog.dialogEl.querySelector('#add-share-member').addEventListener('click', () => {
            const selectedData = []
            document.querySelectorAll('#my-contacts .fw-checkable.checked').forEach(el => {
                const memberId = parseInt(el.dataset.id)
                const collaboratorEl = document.getElementById(`collaborator-${memberId}`)
                if (collaboratorEl) {
                    if (collaboratorEl.dataset.rights === 'delete') {
                        collaboratorEl.classList.remove('delete')
                        collaboratorEl.classList.addClass('read')
                        collaboratorEl.dataset.rights = 'read'
                    }
                } else {
                    const collaborator = this.contacts.find(contact => contact.id === memberId)
                    selectedData.push({
                        user_id: memberId,
                        user_name: collaborator.name,
                        avatar: collaborator.avatar,
                        rights: 'read'
                    })
                }
            })

            document.querySelectorAll('#my-contacts .checkable-label.checked').forEach(el => el.classList.remove('checked'))
            document.querySelector('#share-member table tbody').insertAdjacentHTML(
                'beforeend',
                collaboratorsTemplate({
                    'collaborators': selectedData
                })
            )
        })
        this.dialog.dialogEl.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '.fw-checkable', el):
                    setCheckableLabel(el.target)
                    break
                case findTarget(event, '.edit-right-wrapper .fw-pulldown-item, .delete-collaborator', el): {
                    const newRight = el.target.dataset.rights
                    const colRow = el.target.closest('.collaborator-tr')
                    colRow.dataset.rights = newRight
                    colRow.querySelector('.icon-access-right').setAttribute(
                        'class',
                        `icon-access-right icon-access-${newRight}`
                    )
                    break
                }
                case findTarget(event, '.edit-right', el): {
                    const box = el.target.parentElement.querySelector('.fw-pulldown')
                    if (!box.clientWidth) {
                        openDropdownBox(box)
                    }
                    break
                }
                default:
                    break
            }
        })

    }

    submitAccessRight(newAccessRights) {
        postJson(
            '/api/document/save_access_rights/',
            {
                document_ids: JSON.stringify(this.documentIds),
                access_rights: JSON.stringify(newAccessRights)
            }
        ).then(
            () => {
                addAlert('success', gettext(
                    'Access rights have been saved'))
            }
        ).catch(
            () => addAlert('error', gettext('Access rights could not be saved'))
        )

    }
}

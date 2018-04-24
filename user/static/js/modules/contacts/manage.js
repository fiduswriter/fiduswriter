import {addTeammemberTemplate, teammemberTemplate} from "./templates"
import {postJson, cancelPromise, Dialog} from "../common"

/**
 * Sets up the contacts management. Helper functions for adding and removing contacts.
 */

//add a user to contact per ajax
let addMember = function(userString) {
    if (null === userString || 'undefined' == typeof(userString)) {
        return cancelPromise()
    }

    userString = userString.trim()
    document.querySelectorAll('#add-new-member .warning').forEach(el => el.parentElement.removeChild(el))
    if ('' === userString) {
        return cancelPromise()
    }

    return postJson(
        '/account/teammember/add',
        {
            user_string: userString
        }
    ).then(
        ({json, status}) => {
            if (status == 201) { //user added to the contacts
                return json.member
            } else { //user not found
                let responseHtml

                if (json.error === 1) {
                    responseHtml = gettext('You cannot add yourself to your contacts!')
                } else if (json.error === 2) {
                    responseHtml = gettext('This person is already in your contacts')
                } else if (userString.indexOf('@') != -1 && userString.indexOf('.') != -1) {
                    responseHtml = gettext('No user is registered with the given email address.') +
                        '<br />' +
                        gettext('Please invite him/her ') +
                        `<a href="mailto:${userString}?subject=` +
                            `${encodeURIComponent(gettext('Fidus Writer'))}&body=` +
                            `${encodeURIComponent(gettext('Hey, I would like you to sign up for a Fidus Writer account.'))} ` +
                            `${encodeURIComponent(gettext('Please register at'))} ${window.location.origin}">` +
                        `${gettext('by sending an email')}</a>!`
                } else {
                    responseHtml = gettext('User is not registered.')
                }
                document.getElementById('add-new-member').insertAdjacentHTML(
                    'beforeend',
                    `<div class="warning" style="padding: 8px;">${responseHtml}</div>`
                )
                return cancelPromise()
            }
        }
    )
}

//dialog for adding a user to contacts
export let addMemberDialog = function() {

    return new Promise(resolve => {
        let buttons = [
            {
                text: gettext('Submit'),
                classes: "fw-dark",
                click: () => {
                    addMember(document.getElementById('new-member-user-string').value, dialog).then(
                        memberData => {
                            dialog.close()
                            resolve(memberData)
                            return
                        }
                    )
                }
            },
            {
                type: 'cancel'
            }
        ]

        let dialog = new Dialog({
            id: 'add-new-member',
            title: gettext('Add a user to your contacts'),
            body: addTeammemberTemplate(),
            width: 350,
            height: 250,
            buttons
        })

        dialog.open()

        document.getElementById('new-member-user-string').style.width = '340'
    })
}

let deleteMember = function(ids) {

    postJson(
        '/account/teammember/remove',
        {
            'members[]': ids
        }
    ).then(
        ({json, status}) => {
            if (status == 200) { //user removed from contacts
                document.querySelectorAll(`#user-${ids.join(', #user-')}`).forEach(
                    el => el.parentElement.removeChild(el)
                )
            }
        }
    )
}

//dialog for removing a user from contacts
export let deleteMemberDialog = function(memberIds) {
    let buttons = [
        {
            text: gettext('Delete'),
            classes: "fw-dark",
            click: () => {
                deleteMember(memberIds)
                dialog.close()
            }
        },
        {
            type: 'cancel'
        }
    ]
    let dialog = new Dialog({
        title: gettext('Confirm deletion'),
        id: 'confirmdeletion',
        body: `<p>${gettext('Remove from the contacts')}?</p>`,
        height: 200,
        buttons
    })
    dialog.open()
}

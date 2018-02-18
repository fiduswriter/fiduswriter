import {addTeammemberTemplate, teammemberTemplate} from "./templates"
import {postJsonStatus, cancelPromise} from "../common"

/**
 * Sets up the contacts management. Helper functions for adding and removing contacts.
 */

//add a user to contact per ajax
let addMember = function(userString) {
    if (null === userString || 'undefined' == typeof(userString)) {
        return cancelPromise()
    }

    userString = jQuery.trim(userString)
    jQuery('#add-new-member .warning').detach()
    if ('' === userString) {
        return cancelPromise()
    }

    return postJsonStatus(
        '/account/teammember/add',
        {
            user_string: userString
        }
    ).then(
        ({json, status}) => {
            if (status == 201) { //user added to the contacts
                jQuery("#add-new-member").dialog('close')
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
                jQuery('#add-new-member').append(`<div class="warning" style="padding: 8px;">${responseHtml}</div>`)
                return cancelPromise()
            }
        }
    )
}

//dialog for adding a user to contacts
export let addMemberDialog = function() {
    let dialogHeader = gettext('Add a user to your contacts')
    jQuery('body').append(addTeammemberTemplate({
        'dialogHeader': dialogHeader
    }))

    return new Promise(resolve => {
        let diaButtons = {}
        diaButtons[gettext('Submit')] = () => {
            addMember(jQuery('#new-member-user-string').val()).then(
                memberData => {
                    resolve(memberData)
                    return
                }
            )
        }
        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog('close')
        }

        jQuery("#add-new-member").dialog({
            resizable: false,
            width: 350,
            height: 250,
            modal: true,
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
                jQuery('#new-member-user-string').css('width', 340)
            },
            close: () => {
                jQuery("#add-new-member").dialog('destroy').remove()
            }
        })
    })
}

let deleteMember = function(ids) {

    postJsonStatus(
        '/account/teammember/remove',
        {
            'members[]': ids
        }
    ).then(
        ({json, status}) => {
            if (status == 200) { //user removed from contacts
                Array.slice.call(document.querySelectorAll('#user-' + ids.join(', #user-'))).forEach(
                    el => el.parentElement.removeChild(el)
                )
                jQuery("#confirmdeletion").dialog('close')
            }
        }
    )
}

//dialog for removing a user from contacts
export let deleteMemberDialog = function(memberIds) {
    jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p>' + gettext('Remove from the contacts') + '?</p></div>')
    let diaButtons = {}
    diaButtons[gettext('Delete')] = () => {
        deleteMember(memberIds)
    }
    diaButtons[gettext('Cancel')] = () => {
        jQuery(this).dialog('close')
    }
    jQuery("#confirmdeletion").dialog({
        resizable: false,
        height: 200,
        modal: true,
        buttons: diaButtons,
        create: function() {
            let theDialog = jQuery(this).closest(".ui-dialog")
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
        },
        close: () => jQuery("#confirmdeletion").dialog('destroy').remove()
    })
}

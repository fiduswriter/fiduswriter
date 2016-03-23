import {bookCollaboratorsTemplate, bookAccessRightOverviewTemplate} from "./templates"

/**
* Helper functions to deal with the book access rights dialog.
*/

export let createAccessRightsDialog = function (bookIds) {
        let dialogHeader = gettext('Share your book with others')
        let bookCollaborators = {}

        let theAccessRights = window.theAccessRights

        let len = theAccessRights.length

        let theTeamMembers = window.theTeamMembers



        for (let i = 0; i < len; i++) {
            if (_.include(bookIds, theAccessRights[i].book_id)) {
                if (!(theAccessRights[i].user_id in bookCollaborators)) {
                    bookCollaborators[theAccessRights[i].user_id] = theAccessRights[i]
                    bookCollaborators[theAccessRights[i].user_id].count = 1

                } else {
                    if (bookCollaborators[theAccessRights[i].user_id].rights !=
                        theAccessRights[i].rights)
                    bookCollaborators[theAccessRights[i].user_id].rights =
                        'r'
                    bookCollaborators[theAccessRights[i].user_id].count +=
                        1
                }
            }
        }
        bookCollaborators = _.select(bookCollaborators, function (obj) {
            return obj.count == bookIds.length
        })



        let dialogBody = bookAccessRightOverviewTemplate({
            'dialogHeader': dialogHeader,
            'contacts': theTeamMembers,
            'collaborators': bookCollaboratorsTemplate({
                'collaborators': bookCollaborators
            })
        })
        jQuery('body').append(dialogBody)
        let diaButtons = {}
        diaButtons[gettext('Submit')] = function () {
            //apply the current state to server
            let collaborators = [],
                rights = []
            jQuery('#share-member .collaborator-tr').each(function () {
                collaborators[collaborators.length] = jQuery(this).attr(
                    'data-id')
                rights[rights.length] = jQuery(this).attr('data-right')
            })
            submitAccessRight(bookIds,
                collaborators, rights)
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
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: function () {
                jQuery('#access-rights-dialog').dialog('destroy').remove()
            }
        })
        jQuery('.fw-checkable').bind('click', function () {
            $.setCheckableLabel(jQuery(this))
        })
        jQuery('#add-share-member').bind('click', function () {
            let selectedMembers = jQuery(
                '#my-contacts .fw-checkable.checked')
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
            jQuery('#my-contacts .checkable-label.checked').removeClass(
                'checked')
            jQuery('#share-member table tbody').append(bookCollaboratorsTemplate({
                'collaborators': selectedData
            }))
            collaboratorFunctionsEvent()
        })
        collaboratorFunctionsEvent()
    }


    let collaboratorFunctionsEvent = function () {
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

    let submitAccessRight = function (books,
        collaborators, rights) {
        let postData = {
            'books[]': books,
            'collaborators[]': collaborators,
            'rights[]': rights
        }
        $.ajax({
            url: '/book/accessright/save/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (response) {
                theAccessRights = response.access_rights
                $.addAlert('success', gettext(
                    'Access rights have been saved'))
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText)
            }
        })
    }

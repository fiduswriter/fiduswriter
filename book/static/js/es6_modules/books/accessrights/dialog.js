import {bookCollaboratorsTemplate, bookAccessRightOverviewTemplate} from "./templates"


/**
* Helper functions to deal with the book access rights dialog.
*/


export let createAccessRightsDialog = function (bookIds) {
        let dialogHeader = gettext('Share your book with others');
        var book_collaborators = {}

        let theAccessRights = window.theAccessRights;

        let len = theAccessRights.length

        let theTeamMembers = window.theTeamMembers;



        for (let i = 0; i < len; i++) {
            if (_.include(bookIds, theAccessRights[i].book_id)) {
                if ('undefined' == typeof (book_collaborators[
                    theAccessRights[i].user_id])) {
                    book_collaborators[theAccessRights[i].user_id] =
                        theAccessRights[i];
                    book_collaborators[theAccessRights[i].user_id].count =
                        1;
                } else {
                    if (book_collaborators[theAccessRights[i].user_id].rights !=
                        theAccessRights[i].rights);
                    book_collaborators[theAccessRights[i].user_id].rights =
                        'r';
                    book_collaborators[theAccessRights[i].user_id].count +=
                        1;
                }
            }
        }
        book_collaborators = _.select(book_collaborators, function (obj) {
            return obj.count == bookIds.length;
        });



        var dialogBody = bookAccessRightOverviewTemplate({
            'dialogHeader': dialogHeader,
            'contacts': theTeamMembers,
            'collaborators': bookCollaboratorsTemplate({
                'collaborators': book_collaborators
            })
        });
        $('body').append(dialogBody);
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function () {
            //apply the current state to server
            var collaborators = [],
                rights = [];
            $('#share-member .collaborator-tr').each(function () {
                collaborators[collaborators.length] = $(this).attr(
                    'data-id');
                rights[rights.length] = $(this).attr('data-right');
            });
            submitAccessRight(bookIds,
                collaborators, rights);
            $(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function () {
            $(this).dialog("close");
        }
        $('#access-rights-dialog').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 820,
            height: 540,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
            close: function () {
                $('#access-rights-dialog').dialog('destroy').remove();
            }
        });
        $('.fw-checkable').bind('click', function () {
            $.setCheckableLabel($(this));
        });
        $('#add-share-member').bind('click', function () {
            var $selected_members = $(
                '#my-contacts .fw-checkable.checked');
            var selected_data = [];
            $selected_members.each(function () {
                var member_id = $(this).attr('data-id');
                var $collaborator = $('#collaborator-' + member_id);
                if (0 == $collaborator.size()) {
                    selected_data[selected_data.length] = {
                        'user_id': member_id,
                        'user_name': $(this).attr('data-name'),
                        'avatar': $(this).attr('data-avatar'),
                        'rights': 'r'
                    }
                } else if ('d' == $collaborator.attr('data-right')) {
                    $collaborator.removeClass('d').addClass('r').attr(
                        'data-right', 'r');
                }
            });
            $('#my-contacts .checkable-label.checked').removeClass(
                'checked');
            $('#share-member table tbody').append(tmp_book_collaborators({
                'collaborators': selected_data
            }));
            collaboratorFunctionsEvent();
        });
        collaboratorFunctionsEvent();
    };


    let collaboratorFunctionsEvent = function () {
        $('.edit-right').unbind('click');
        $('.edit-right').each(function () {
            $.addDropdownBox($(this), $(this).siblings('.fw-pulldown'));
        });
        var $spans = $(
            '.edit-right-wrapper .fw-pulldown-item, .delete-collaborator');
        $spans.unbind('mousedown');
        $spans.bind('mousedown', function () {
            var new_right = $(this).attr('data-right');
            $(this).closest('.collaborator-tr').attr('class',
                'collaborator-tr ' + new_right);
            $(this).closest('.collaborator-tr').attr('data-right',
                new_right);
        });
    };

    let submitAccessRight = function (books,
        collaborators, rights) {
        var post_data = {
            'books[]': books,
            'collaborators[]': collaborators,
            'rights[]': rights
        }
        $.ajax({
            url: '/book/accessright/save/',
            data: post_data,
            type: 'POST',
            dataType: 'json',
            success: function (response) {
                theAccessRights = response.access_rights;
                $.addAlert('success', gettext(
                    'Access rights have been saved'));
            },
            error: function (jqXHR, textStatus, errorThrown) {
                console.log(jqXHR.responseText);
            }
        });
    };

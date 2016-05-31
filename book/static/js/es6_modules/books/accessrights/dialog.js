import {bookCollaboratorsTemplate, bookAccessRightOverviewTemplate} from "./templates"
import {addDropdownBox, setCheckableLabel, addAlert, csrfToken} from "../../common/common"

/**
* Helper functions to deal with the book access rights dialog.
*/

export class BookAccessRightsDialog {
      constructor(bookIds, teamMembers, accessRights, callback) {
          this.bookIds = bookIds
          this.teamMembers = teamMembers
          this.accessRights = accessRights
          this.callback = callback
          this.createAccessRightsDialog()
      }

      createAccessRightsDialog() {
          let that = this
          let dialogHeader = gettext('Share your book with others')
          let bookCollaborators = {}

          let len = this.accessRights.length

          for (let i = 0; i < len; i++) {
              if (_.include(this.bookIds, this.accessRights[i].book_id)) {
                  if (!(this.accessRights[i].user_id in bookCollaborators)) {
                      bookCollaborators[this.accessRights[i].user_id] = this.accessRights[i]
                      bookCollaborators[this.accessRights[i].user_id].count = 1

                  } else {
                      if (bookCollaborators[this.accessRights[i].user_id].rights !=
                          this.accessRights[i].rights)
                      bookCollaborators[this.accessRights[i].user_id].rights =
                          'read'
                      bookCollaborators[this.accessRights[i].user_id].count +=
                          1
                  }
              }
          }
          bookCollaborators = _.select(bookCollaborators, function (obj) {
              return obj.count == that.bookIds.length
          })



          let dialogBody = bookAccessRightOverviewTemplate({
              'dialogHeader': dialogHeader,
              'contacts': that.teamMembers,
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
              that.submitAccessRight(that.bookIds, collaborators, rights)
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
              setCheckableLabel(jQuery(this))
          })
          jQuery('#add-share-member').bind('click', function () {
              let selectedMembers = jQuery(
                  '#my-contacts .fw-checkable.checked')
              let selectedData = []
              selectedMembers.each(function () {
                  let memberId = jQuery(this).attr('data-id')
                  let collaborator = jQuery('#collaborator-' + memberId)
                  if (0 === collaborator.size()) {
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
              jQuery('#my-contacts .checkable-label.checked').removeClass(
                  'checked')
              jQuery('#share-member table tbody').append(bookCollaboratorsTemplate({
                  'collaborators': selectedData
              }))
              that.collaboratorFunctionsEvent()
          })
          that.collaboratorFunctionsEvent()
      }


      collaboratorFunctionsEvent() {
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

      submitAccessRight(books, collaborators, rights) {
          let that = this
          let postData = {
              'books[]': books,
              'collaborators[]': collaborators,
              'rights[]': rights
          }
          jQuery.ajax({
              url: '/book/accessright/save/',
              data: postData,
              type: 'POST',
              dataType: 'json',
              crossDomain: false, // obviates need for sameOrigin test
              beforeSend: function(xhr, settings) {
                  xhr.setRequestHeader("X-CSRFToken", csrfToken)
              },
              success: function (response) {
                  that.callback(response.access_rights)
                  addAlert('success', gettext(
                      'Access rights have been saved'))
              },
              error: function (jqXHR, textStatus, errorThrown) {
                  console.log(jqXHR.responseText)
              }
          })
      }

}

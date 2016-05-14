import {teammemberTemplate} from "./templates"
import {addMemberDialog, deleteMemberDialog} from "./manage"

export let contactsOverview = function () {

    jQuery(document).ready(function() {
        //intialize the teammember table
        jQuery('#team-table tbody').append(teammemberTemplate({'members': window.teammembers}))

        //select all members
        jQuery('#select-all-entry').bind('change', function() {
            let new_bool = false
            if(jQuery(this).prop("checked"))
                new_bool = true
            jQuery('.entry-select').not(':disabled').each(function() {
                this.checked = new_bool
            })
        })

        jQuery('.add-contact').bind('click', function(){
            addMemberDialog(function(memberData){
                jQuery('#team-table tbody').append(
                    teammemberTemplate({
                        'members': [memberData]
                    })
                )
            })
        })

        $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'))
        jQuery('#action-selection-pulldown span').bind('mousedown', function() {
            let ids = [], action_name = jQuery(this).attr('data-action')
            if('' == action_name || 'undefined' == typeof(action_name))
                return
            jQuery('.entry-select:checked').each(function() {
                ids[ids.length] = parseInt(jQuery(this).attr('data-id'))
            })
            deleteMemberDialog(ids)
        })

        //delete single user
        jQuery(document).on('click', '.delete-single-member', function() {
            deleteMemberDialog([jQuery(this).attr('data-id')])
        })

    })
}

/**
 * @file Sets team member page
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */


jQuery(function() {
    //intialize the teammember table
    jQuery('#team-table tbody').append(contactHelpers.tmp_teammember({'members': teammembers}));

    //select all members
    jQuery('#select-all-entry').bind('change', function() {
        var new_bool = false;
        if(jQuery(this).prop("checked"))
            new_bool = true;
        jQuery('.entry-select').not(':disabled').each(function() {
            this.checked = new_bool
        });
    });

    jQuery('.add-contact').bind('click', contactHelpers.addMemberDialog);

    $.addDropdownBox(jQuery('#select-action-dropdown'), jQuery('#action-selection-pulldown'));
    jQuery('#action-selection-pulldown span').bind('click', function() {
        var ids = [], action_name = jQuery(this).attr('data-action');
        if('' == action_name || 'undefined' == typeof(action_name))
            return;
        jQuery('.entry-select:checked').each(function() {
            ids[ids.length] = parseInt(jQuery(this).attr('data-id'));
        });
        contactHelpers.deleteMemberDialog(ids);
    });

    //delete single user
    jQuery(document).on('click', '.delete-single-member', function() {
        contactHelpers.deleteMemberDialog([jQuery(this).attr('data-id')]);
    });
});

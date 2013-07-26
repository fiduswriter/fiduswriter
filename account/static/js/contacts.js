$(function() {
    //intialize the teammember table
    $('#team-table tbody').append(contactHelpers.tmp_teammember({'members': teammembers}));

    //select all members
    $('#select-all-entry').bind('change', function() {
        var new_bool = false;
        if($(this).prop("checked"))
            new_bool = true;
        $('.entry-select').not(':disabled').each(function() {
            this.checked = new_bool
        });
    });

    $('.add-contact').bind('click', contactHelpers.addMemberDialog);

    $.addDropdownBox($('#select-action-dropdown'), $('#action-selection-pulldown'));
    $('#action-selection-pulldown span').bind('click', function() {
        var ids = [], action_name = $(this).attr('data-action');
        if('' == action_name || 'undefined' == typeof(action_name))
            return;
        $('.entry-select:checked').each(function() {
            ids[ids.length] = parseInt($(this).attr('data-id'));
        });
        contactHelpers.deleteMemberDialog(ids);
    });

    //delete single user
    $(document).on('click', '.delete-single-member', function() {
        contactHelpers.deleteMemberDialog([$(this).attr('data-id')]);
    });
});

/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

jQuery(document).ready(function () {
    jQuery(document).on('click', '.delete-book', function () {
        var BookId = jQuery(this).attr('data-id');
        bookHelpers.deleteBookDialog([BookId]);
    });

    jQuery(document).on('click', '.owned-by-user .rights', function () {
        var BookId = parseInt(jQuery(this).attr('data-id'));
        bookaccessrightsHelpers.createAccessRightsDialog([BookId]);
    });

    //select all entries
    jQuery('#select-all-entry').bind('change', function () {
        var new_bool = false;
        if (jQuery(this).prop("checked"))
            new_bool = true;
        jQuery('.entry-select').not(':disabled').each(function () {
            this.checked = new_bool
        });
    });

    //open dropdown for selecting action
    $.addDropdownBox(jQuery('#select-action-dropdown-books'), jQuery(
        '#action-selection-pulldown-books'));

    //submit action for selected document
    jQuery('#action-selection-pulldown-books li > span').bind('click',
        function () {
            var action_name = jQuery(this).attr('data-action'),
                ids = [],
                aBook;
            if ('' == action_name || 'undefined' == typeof (action_name))
                return;
            jQuery('.entry-select:checked').not(':disabled').each(function () {
                if (theUser.id != jQuery(this).attr('data-owner') && (
                    action_name === 'delete' || action_name ===
                    'share')) {
                    var the_title = jQuery(this).parent().parent().parent()
                        .find(
                            '.book-title').text()
                    the_title = $.trim(the_title).replace(/[\t\n]/g, '');
                    $.addAlert('error', gettext(
                        'You cannot delete or share: ') + the_title);
                    //return true;
                } else {
                    ids[ids.length] = parseInt(jQuery(this).attr(
                        'data-id'));
                }
            });
            if (0 == ids.length)
                return;
            switch (action_name) {
            case 'delete':
                bookHelpers.deleteBookDialog(ids);
                break;
            case 'share':
                bookaccessrightsHelpers.createAccessRightsDialog(ids);
                break;
            case 'epub':
                for (i = 0; i < ids.length; i++) {
                    aBook = _.findWhere(
                        theBookList, {
                            id: ids[i]
                        });
                    $.addAlert('info', aBook.title + ': ' + gettext(
                        'Epub export has been initiated.'));
                    bookExporter.downloadEpub(aBook);
                }
                break;
            case 'latex':
                for (i = 0; i < ids.length; i++) {
                    aBook = _.findWhere(
                        theBookList, {
                            id: ids[i]
                        });
                    $.addAlert('info', aBook.title + ': ' + gettext(
                        'Latex export has been initiated.'));
                    bookExporter.downloadLatex(aBook);
                }
                break;
            case 'html':
                for (i = 0; i < ids.length; i++) {
                    aBook = _.findWhere(
                        theBookList, {
                            id: ids[i]
                        });
                    $.addAlert('info', aBook.title + ': ' + gettext(
                        'HTML export has been initiated.'));
                    bookExporter.downloadHtml(aBook);
                }
                break;
            case 'copy':
                for (i = 0; i < ids.length; i++) {
                    bookHelpers.copy(_.findWhere(
                        theBookList, {
                            id: ids[i]
                        }));
                }
                break;
            case 'print':
                for (i = 0; i < ids.length; i++) {
                    window.open('/book/print/'+_.findWhere(
                        theBookList, {
                            id: ids[i]
                        }).id+'/');
                }
                break;    
            }

        });

    jQuery('.create-new-book').bind('click', function () {
        bookHelpers.createBookDialog(0);
    });

    jQuery(document).on('click', '.book-title', function () {
        var bookId = parseInt(jQuery(this).attr('data-id'));
        bookHelpers.createBookDialog(bookId);
    });
});
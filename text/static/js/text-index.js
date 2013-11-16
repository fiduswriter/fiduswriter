/**
 * @license This file is part of Fidus Writer <http://www.fiduswriter.org>
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
    jQuery(document).on('click', '.delete-document', function () {
        var DocumentId = jQuery(this).attr('data-id');
        documentHelpers.deleteDocumentDialog([DocumentId]);
    });

    jQuery(document).on('click', '.owned-by-user .rights', function () {
        var DocumentId = parseInt(jQuery(this).attr('data-id'));
        accessrightsHelpers.createAccessRightsDialog([DocumentId]);
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
    $.addDropdownBox(jQuery('#select-action-dropdown-documents'), jQuery(
        '#action-selection-pulldown-documents'));

    //submit action for selected document
    jQuery('#action-selection-pulldown-documents li > span').bind('click',
        function () {
            var action_name = jQuery(this).attr('data-action'),
                ids = [];
            if ('' == action_name || 'undefined' == typeof (action_name))
                return;
            jQuery('.entry-select:checked').not(':disabled').each(function () {
                if (theUser.id != jQuery(this).attr('data-owner') && (
                    action_name === 'delete' || action_name ===
                    'share')) {
                    var the_title = jQuery(this).parent().parent().parent()
                        .find(
                            '.doc-title').text()
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
                documentHelpers.deleteDocumentDialog(ids);
                break;
            case 'share':
                accessrightsHelpers.createAccessRightsDialog(ids);
                break;
            case 'epub':
                documentHelpers.getMissingDocumentListData(ids, function () {
                    for (i = 0; i < ids.length; i++) {
                        exporter.downloadEpub(_.findWhere(
                            theDocumentList, {
                                id: ids[i]
                            }));
                    }
                });
                break;
            case 'latex':
                documentHelpers.getMissingDocumentListData(ids, function () {
                    for (i = 0; i < ids.length; i++) {
                        exporter.downloadLatex(_.findWhere(
                            theDocumentList, {
                                id: ids[i]
                            }));
                    }
                });
                break;
            case 'html':
                documentHelpers.getMissingDocumentListData(ids, function () {
                    for (i = 0; i < ids.length; i++) {
                        exporter.downloadHtml(_.findWhere(
                            theDocumentList, {
                                id: ids[i]
                            }));
                    }
                });
                break;
            case 'native':
                documentHelpers.getMissingDocumentListData(ids, function () {
                    for (i = 0; i < ids.length; i++) {
                        exporter.downloadNative(_.findWhere(
                            theDocumentList, {
                                id: ids[i]
                            }));
                    }
                });
                break;
            case 'copy':
                documentHelpers.getMissingDocumentListData(ids, function () {
                    for (i = 0; i < ids.length; i++) {
                        exporter.savecopy(_.findWhere(theDocumentList, {
                            id: ids[i]
                        }));
                    }
                });
                break;
            }

        });

    //import a fidus filw
    jQuery('.import-fidus').bind('click', documentHelpers.importFidus);
});
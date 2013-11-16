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

(function () {
    var exports = this,
        documentHelpers = {};

    documentHelpers.deleteDocument = function (id) {
        var postData = {};
        postData['id'] = id;
        $.ajax({
            url: '/text/delete/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                documentHelpers.stopDocumentTable();
                jQuery('#Text_' + id).detach();
                theDocumentList = _.reject(theDocumentList, function (
                    document) {
                    return document.id == id;
                });
                documentHelpers.startDocumentTable();
            },
        });
    };


    documentHelpers.deleteDocumentDialog = function (ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') +
            '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
            gettext('Delete the document(s)?') + '</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function () {
            for (var i = 0; i < ids.length; i++) {
                documentHelpers.deleteDocument(ids[i]);
            }
            jQuery(this).dialog("close");
            $.addAlert('success', gettext(
                'The document(s) have been deleted'));
        };

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        }

        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function () {
                jQuery("#confirmdeletion").detach();
            },
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
        });
    };


    documentHelpers.importFidus = function () {
        jQuery('body').append(tmp_import_fidus());
        diaButtons = {};
        diaButtons[gettext('Import')] = function () {
            var fidus_file = jQuery('#fidus-uploader')[0].files;
            if (0 == fidus_file.length) {
                console.log('no file found');
                return false;
            }
            fidus_file = fidus_file[0];
            if (104857600 < fidus_file.size) {
                //TODO: This is an arbitrary size. What should be done with huge import files?
                console.log('file too big');
                return false;
            }
            $.activateWait();
            var reader = new FileReader();
            reader.onerror = function (e) {
                console.log('error', e.target.error.code);
            };
            importer.init(fidus_file);
            //reader.onload = importer.unzip;
            //reader.readAsText(fidus_file);
            jQuery(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close');
        };
        jQuery("#importfidus").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
                jQuery('#fidus-uploader').bind('change', function () {
                    jQuery('#import-fidus-name').html(jQuery(this).val()
                        .replace(
                            /C:\\fakepath\\/i, ''));
                });
                jQuery('#import-fidus-btn').bind('click', function () {
                    jQuery('#fidus-uploader').trigger('click');
                });
            },
            close: function () {
                jQuery("#importfidus").dialog('destroy').remove();
            }
        });


    };

    documentHelpers.stopDocumentTable = function () {
        jQuery('#document-table').dataTable().fnDestroy();
    };

    documentHelpers.startDocumentTable = function () {
        // The document table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.

        jQuery('#document-table').dataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": false,
            "bAutoWidth": false,
            "oLanguage": {
                "sSearch": ''
            },
            "aoColumnDefs": [{
                "bSortable": false,
                "aTargets": [0, 5, 6]
            }],
        });

        $('#document-table_wrapper .dataTables_filter input').attr('placeholder', gettext('Search for Document'));
        $('#document-table_wrapper .dataTables_filter input').unbind('focus, blur')
        $('#document-table_wrapper .dataTables_filter input').bind('focus', function() {
            $(this).parent().addClass('focus');
        });
        $('#document-table_wrapper .dataTables_filter input').bind('blur', function() {
            $(this).parent().removeClass('focus');
        });

        var autocomplete_tags = [];
        jQuery('#document-table .fw-searchable').each(function() {
            autocomplete_tags.push(this.innerText);
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        $("#document-table_wrapper .dataTables_filter input").autocomplete({
            source: autocomplete_tags
        });
    };



    documentHelpers.getDocumentListData = function (id) {
        $.ajax({
            url: '/text/documentlist/',
            data: {},
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                theDocumentList = _.uniq(response.documents, true, function(obj) { return obj.id; });
                theTeamMembers = response.team_members;
                theAccessRights = response.access_rights;
                theUser = response.user;
                jQuery.event.trigger({
                    type: "documentDataLoaded",
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };

    documentHelpers.getMissingDocumentListData = function (ids, callback) {
        // get extra data for the documents identified by the ids.
        var i, incompleteIds = [],
            aDocument;
        for (i = 0; i < ids.length; i++) {
            if (!(_.findWhere(theDocumentList, {
                id: parseInt(ids[i])
            }).hasOwnProperty('contents'))) {
                incompleteIds.push(parseInt(ids[i]));
            }
        }
        if (incompleteIds.length > 0) {
            $.ajax({
                url: '/text/documentlist/extra/',
                data: {
                    ids: incompleteIds.join(',')
                },
                type: 'POST',
                dataType: 'json',
                success: function (response, textStatus, jqXHR) {
                    for (i = 0; i < response.documents.length; i++) {
                        aDocument = _.findWhere(theDocumentList, {
                            id: response.documents[i].id
                        });
                        aDocument.contents = response.documents[i].contents;
                        aDocument.metadata = jQuery.parseJSON(response.documents[
                            i].metadata);
                        aDocument.settings = jQuery.parseJSON(response.documents[
                            i].settings);
                    }
                    if (callback) {
                        callback();
                    }
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function () {
                    $.deactivateWait();
                }
            });
        } else {
            callback();
        }

    };



    documentHelpers.bind = function () {
        window.theDocumentList = undefined;
        window.theTeamMembers = undefined;
        window.theAccessRights = undefined;
        window.theUser = undefined;
        jQuery(document).ready(function () {

            documentHelpers.getDocumentListData();
        });

        jQuery(document).bind('documentDataLoaded', function () {
            jQuery('#document-table tbody').html(tmp_documents_list());
            documentHelpers.startDocumentTable();
        });
    };

    exports.documentHelpers = documentHelpers;

}).call(this);
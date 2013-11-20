/**
 * @file Handles recovering document revisions
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Johannes Wilm.
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
(function () {
    var exports = this,
        /** 
         * Functions for the recovering previously created document revisions.
         * @namespace documentrevisionsHelpers
         */
        documentrevisionsHelpers = {};


    /**
     * Create a dialog showing the existing revisions for a certain document.
     * @function createDialog
     * @memberof documentrevisionsHelpers
     * @param {number} documentId The id in theDocumentList of the document.
     */
    documentrevisionsHelpers.createDialog = function (documentId) {
        var diaButtons = {};

        diaButtons[gettext('Close')] = function () {
            $(this).dialog("close");
        }
        aDocument = _.findWhere(theDocumentList, {
            id: documentId
        });



        jQuery(tmp_documentrevisions({
            aDocument: aDocument
        })).dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 620,
            height: 480,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = $(this).closest(".ui-dialog");
                $the_dialog.find(".ui-dialog-buttonset .ui-button:eq(0)").addClass("fw-button fw-dark");
            },
            close: function () {
                $(this).dialog('destroy').remove();
            }
        });
    };
    /**
     * Recreate a revision.
     * @function recreate
     * @memberof documentrevisionsHelpers
     * @param {number} id The pk value of the document revision.
     */

    documentrevisionsHelpers.recreate = function (id) {
        // Have to use XMLHttpRequest rather than jQuery.ajax as it's the only way to receive a blob.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                importer.initZipFileRead(this.response);
            }
        }

        xhr.open('POST', '/document/download/');
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-CSRFToken", jQuery("input[name='csrfmiddlewaretoken']").val());
        xhr.responseType = 'blob';
        xhr.send("id=" + id);


    };

    /**
     * Download a revision.
     * @function download
     * @memberof documentrevisionsHelpers
     * @param {number} id The pk value of the document revision.
     */

    documentrevisionsHelpers.download = function (id, filename) {
        // Have to use XMLHttpRequest rather than jQuery.ajax as it's the only way to receive a blob.
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function () {
            if (this.readyState == 4 && this.status == 200) {
                exporter.downloadFile(filename, this.response);
            }
        }

        xhr.open('POST', '/document/download/');
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
        xhr.setRequestHeader("X-CSRFToken", jQuery("input[name='csrfmiddlewaretoken']").val());
        xhr.responseType = 'blob';
        xhr.send("id=" + id);
    };

    /**
     * Delete a revision.
     * @function delete
     * @memberof documentrevisionsHelpers
     * @param {number} id The pk value of the document revision.
     */

    documentrevisionsHelpers.delete = function (id) {

        var diaButtons = {},
            deleteRevision = function () {
                jQuery.ajax({
                    url: '/document/delete_revision/',
                    data: {
                        id: id
                    },
                    type: 'POST',
                    success: function () {
                        jQuery('tr.revision-' + id).remove();
                        jQuery.addAlert('success', gettext('Revision deleted'));
                    },
                    error: function () {
                        jQuery.addAlert('error', gettext('Could not delete revision.'));
                    }
                });
            };;
        diaButtons[gettext('Delete')] = function () {
            jQuery(this).dialog("close");
            deleteRevision();
        };

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        }

        jQuery(tmp_documentrevisions_confirm_delete()).dialog({
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

    exports.documentrevisionsHelpers = documentrevisionsHelpers;

}).call(this);
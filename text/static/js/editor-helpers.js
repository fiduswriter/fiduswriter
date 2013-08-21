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

(function () {
    var exports = this,
        editorHelpers = {};

    editorHelpers.getDocumentData = function (id) {
        $.ajax({
            url: '/text/document/',
            data: {
                'id': id
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                editorHelpers.fillEditorPage(response.document);

                if (response.hasOwnProperty('user')) {
                    theUser = response.user;
                } else {
                    theUser = theDocument.owner;
                }
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

    editorHelpers.layoutMetadata = function () {
        var i;
        jQuery('.metadata-menu-item').removeClass('selected');

        for (i in theDocument.settings.metadata) {
            if (theDocument.settings.metadata[i]) {
                jQuery('.metadata-menu-item.metadata-' + i).addClass(
                    'selected');
            }
        }
        jQuery('#document-metadata').html(tmp_metadata({
            settings: theDocument.settings.metadata,
            metadata: theDocument.metadata
        }));
    };

    editorHelpers.switchMetadata = function () {
        var metadata = jQuery(this).attr('data-metadata');
        theDocument.settings.metadata[metadata] = !theDocument.settings.metadata[
            metadata];
        editorHelpers.layoutMetadata();
        editorHelpers.documentHasChanged();
    };

    /*   editorHelpers.toggleDel = function (el) {
    var body = document.getElementById('flow');
    var button = jQuery(el);
    if (jQuery(body).hasClass('CT-hide')) {
        jQuery(body).removeClass('CT-hide');
    } else {
        jQuery(body).addClass('CT-hide');
    }
};*/


    editorHelpers.fillEditorPage = function (document) {
        theDocument = document;
        jQuery('#document-title').html(theDocument.title);

        if ('' == jQuery.trim(theDocument.title)) {
            $('#header h1').html(gettext('Untitled document'));
        } else {
            $('#header h1').html(theDocument.title);
        }
        jQuery('#document-contents').html(theDocument.contents);
        theDocument.changed = false;
        theDocument.settings = jQuery.parseJSON(theDocument.settings);
        theDocument.metadata = jQuery.parseJSON(theDocument.metadata);
        theDocument.comments = jQuery.parseJSON(theDocument.comments);
    };

    editorHelpers.documentHasChanged = function () {
        theDocument.changed = true;
        jQuery('.save').removeClass('disabled');
    };

    editorHelpers.saveDocument = function (callback) {
        var documentData = {};

        theDocument.title = jQuery('#document-title').html().trim();
        theDocument.contents = jQuery('#document-contents').html().trim();

        documentData.id = theDocument.id;
        documentData.currently_open = true;
        documentData.settings = JSON.stringify(theDocument.settings);
        documentData.metadata = JSON.stringify(theDocument.metadata);
        documentData.comments = JSON.stringify(theDocument.comments);
        documentData.title = theDocument.title;
        documentData.contents = theDocument.contents;

        var ajaxData = {
            url: '/text/save/',
            data: documentData,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status === 201) {
                    theDocument.id = response.text_id;
                    jQuery('.savecopy').removeClass('disabled');
                    window.history.replaceState("", "", "/text/" +
                        theDocument.id + "/");
                }
                editorHelpers.updatePingTimer(callback);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', gettext('Document could not be saved'));
            },
        }

        $.ajax(ajaxData);
        return true;

    };

    editorHelpers.saveDocumentIfChanged = function (callback) {
        var currentTime = new Date().getTime();
        if (currentTime - timeOfLastServerPing < 600000) {
            if (theDocument.changed) {
                theDocument.changed = false;
                jQuery('.save').addClass('disabled');
                editorHelpers.saveDocument(callback);
            } else if (currentTime - timeOfLastServerPing > 550000) {
                editorHelpers.pingServer(callback);
            } else if (callback) {
                callback();
            }
        } else {
            window.clearInterval(saveTimer);
            editorHelpers.noConnectionToServer();
        }
    };

    editorHelpers.updatePingTimer = function (callback) {
        timeOfLastServerPing = new Date().getTime();
        if (callback) {
            callback();
        }
    };
    
    editorHelpers.setPlaceholders = function (currentElement) {
        var placeHolderCss='';
        if (jQuery('#document-title')[0].innerText.length===0 && currentElement != 'document-title') {
            placeHolderCss += '#document-title:before {content: "'+gettext('Title...')+'"}\n'; 
        }
        if (jQuery('#document-contents')[0].innerText.replace(/(\r\n|\n|\r)/gm,"").length===0 && currentElement != 'document-contents') {
            placeHolderCss += '#document-contents:before {content: "'+gettext('Contents...')+'"}\n'; 
        }
        if (jQuery('#metadata-subtitle').length > 0 && jQuery('#metadata-subtitle')[0].innerText.length===0 && currentElement != 'metadata-subtitle') {
            placeHolderCss += '#metadata-subtitle:before {content: "'+gettext('Subtitle...')+'"}\n'; 
        }
        if (jQuery('#metadata-abstract').length > 0 && jQuery('#metadata-abstract')[0].innerText.length===0 && currentElement != 'metadata-abstract') {
            placeHolderCss += '#metadata-abstract:before {content: "'+gettext('Abstract...')+'"}\n'; 
        }
        jQuery('#placeholderStyles')[0].innerHTML = placeHolderCss;
    };
    

    editorHelpers.noConnectionToServer = function () {
        // If we come right out fo the print dialog, permit immediate reloading.
        if (toPrint) location.reload();

        var noConnectionDialog = document.createElement('div');
        noConnectionDialog.id = 'no-connection-dialog';
        noConnectionDialog.innerHTML = '<p>' + gettext(
            'Sorry, but the connection to the server has been lost. Please reload to ensure that no date is being lost.'
        ) +
            '</p>';

        document.body.appendChild(noConnectionDialog);
        diaButtons = {};

        diaButtons[gettext('Ok')] = function () {
            jQuery(this).dialog("close");
        };


        jQuery("#no-connection-dialog").dialog({
            resizable: false,
            width: 400,
            height: 180,
            modal: true,
            buttons: diaButtons,
            autoOpen: true,
            title: gettext('No connection to server'),
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "dark");
            },
            close: function () {
                location.reload();
            },
        });

        setTimeout(function () {
                location.reload()
            },
            20000)
    };

    editorHelpers.pingServer = function (callback) {
        var DocumentData = {};
        DocumentData.id = theDocument.id;
        $.ajax({
            url: '/text/ping/',
            data: DocumentData,
            type: 'POST',
            dataType: 'json',
            success: function () {
                editorHelpers.updatePingTimer(callback);
            },
            error: function () {
                if (failedPingAttempts < 10) {
                    // The ping was unsuccesful. Try again every second for 9 seconds;
                    setTimeout(function () {
                            editorHelpers.pingServer(callback);
                        },
                        1000);
                } else {
                    failedPingAttempts = 0;
                }
            }
        });

    };

    editorHelpers.bind = function () {
        window.theDocument = undefined;
        window.theUser = undefined;
        $(document).ready(function () {
            var pathnameParts = window.location.pathname.split('/'),
                documentId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10);

            if (isNaN(documentId)) {
                documentId = 0;
            }
            editorHelpers.getDocumentData(documentId);
        });
    };

    exports.editorHelpers = editorHelpers;

}).call(this);
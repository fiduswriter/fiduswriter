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
        var theMetadata = jQuery(this).attr('data-metadata');
        editorHelpers.switchMetadataDocumentData(theMetadata);
        editorHelpers.setMetadataDisplay(theMetadata);
    };

    editorHelpers.switchMetadataDocumentData = function (theMetadata) {
        editorHelpers.setDocumentData('settings.metadata.' + theMetadata, !theDocument.settings.metadata[
                theMetadata]);
    };

    editorHelpers.setMetadataDisplay = function () {
        editorHelpers.layoutMetadata();
        editorHelpers.documentHasChanged();
    };

    editorHelpers.fillEditorPage = function (aDocument) {
        var DEFAULTS, i;
        
        theDocument = aDocument;
        theDocument.changed = false;
        theDocument.settings = jQuery.parseJSON(theDocument.settings);
        theDocument.metadata = jQuery.parseJSON(theDocument.metadata);
        theDocument.history = jQuery.parseJSON('[' + theDocument.history +
            ']');
        theDocument.lastHistory = [];

        DEFAULTS = [
            ['metadata.title', theDocument.title],
            ['settings.papersize', '1117'],
            ['settings.citationstyle', 'apa'],
            ['settings.tracking', false],
            ['settings.documentstyle', 'elephant'],
            ['settings.metadata', {}]
        ];

        for (i = 0; i < DEFAULTS.length; i++) {
            // TODO: Find a way to do this without eval.
            if (eval("undefined===theDocument." + DEFAULTS[i][0])) {
                if ('string' === typeof (DEFAULTS[i][1])) {
                    eval("theDocument." + DEFAULTS[i][0] + "=unescape('" +
                        escape(DEFAULTS[i][1]) + "')");
                }
                else {
                    eval("theDocument." + DEFAULTS[i][0] + "=" + JSON.stringify(
                        DEFAULTS[i][1]));
                }
            }

        }

        if (theDocument.is_new) {
            // If the document is new, change the url. Then forget that the document is new.
            window.history.replaceState("", "", "/text/" + theDocument.id +
                "/");
            delete theDocument.is_new;
        }

        editorHelpers.setDisplay.document('contents', theDocument.contents);
        editorHelpers.setDisplay.document('metadata.title', theDocument.metadata
            .title);
    };

    editorHelpers.documentHasChanged = function () {
        theDocument.changed = true;
        jQuery('.save').removeClass('disabled');
    };

    editorHelpers.setDisplay = {};


    editorHelpers.setDisplay.settingsDocumentstyle = function (theValue) {

        jQuery("#header-navigation .style.selected").removeClass('selected');
        jQuery('span[data-style=' + theValue + ']').addClass('selected');

        // Remove all available style classes from flow
        jQuery("#header-navigation .style").each(function () {
            var thisStyle = jQuery(this).attr('data-style');
            jQuery('#flow').removeClass(thisStyle);
        });

        jQuery('#flow').addClass(theValue);

        paginationConfig.outerMargin = paginationConfigList[theValue].outerMargin;
        paginationConfig.innerMargin = paginationConfigList[theValue].innerMargin;
        paginationConfig.contentsTopMargin = paginationConfigList[theValue]
            .contentsTopMargin;
        paginationConfig.headerTopMargin = paginationConfigList[theValue].headerTopMargin;
        paginationConfig.contentsBottomMargin = paginationConfigList[
            theValue].contentsBottomMargin;
        paginationConfig.pagenumberBottomMargin = paginationConfigList[
            theValue].pagenumberBottomMargin;
        pagination.setPageStyle();
        set_document_style_timer = setTimeout(function () {
            clearTimeout(set_document_style_timer);
            if (document.webkitGetNamedFlows) {
                document.webkitGetNamedFlows()[0].dispatchEvent(
                    pagination.events.escapesNeedMove);
            }
        }, 200);

        commentHelpers.layoutComments();

    };

    editorHelpers.setDisplay.settingsCitationstyle = function (theValue) {
        jQuery("#header-navigation .citationstyle.selected").removeClass(
            'selected');
        jQuery('span[data-citationstyle=' + theValue + ']').addClass(
            'selected');
        citationHelpers.formatCitationsInDoc();
    };

    editorHelpers.setDisplay.settingsPapersize = function (theValue) {
        jQuery("#header-navigation .papersize.selected").removeClass(
            'selected');
        jQuery('span[data-paperheight=' + theValue +
            ']').addClass('selected');
        paginationConfig['pageHeight'] = theValue;
        pagination.setPageStyle();
        commentHelpers.layoutComments();
        set_document_style_timer = setTimeout(function () {
            clearTimeout(set_document_style_timer);
            if (document.webkitGetNamedFlows && document.webkitGetNamedFlows()
                .length > 0) {
                document.webkitGetNamedFlows()[0].dispatchEvent(
                    pagination.events.escapesNeedMove);
            }
        }, 100);

    };

    editorHelpers.setDisplay.id = function (theValue) {
        if (0 === theValue) {
            jQuery('.savecopy').addClass('disabled');
        }
        else {
            jQuery('.savecopy').removeClass('disabled');
        }
    };

    editorHelpers.setDisplay.settingsTracking = function (theValue) {
        if (theValue) {
            jQuery('.ice-track').addClass('selected');
        }
        else {
            jQuery('.ice-track').removeClass('selected');
        }
    };

    editorHelpers.setDisplay.settingsTrackingShow = function (theValue) {
        if (theValue) {
            jQuery('.ice-display').addClass('selected');
            jQuery('#flow').removeClass('CT-hide');
        }
        else {
            jQuery('.ice-display').removeClass('selected');
            jQuery('#flow').addClass('CT-hide');
        }
    };

    editorHelpers.setDisplay.contents = function (theValue) {
        document.getElementById('document-contents').innerHTML = theValue;
    };

    editorHelpers.setDisplay.metadataTitle = function (theValue) {
        var titleEl = document.getElementById('document-title')
        titleEl.innerHTML = theValue;
        editorHelpers.setDisplay.document('title', titleEl.innerText.trim());
    };

    editorHelpers.setDisplay.title = function (theValue) {
        var theTitle = theValue;
        if (theTitle.length === 0) {
            theTitle = gettext('Untitled Document');
        }
        jQuery('title').html('Fidus Writer - ' + theTitle);
        jQuery('#header h1').html(theTitle);
    };
     
    
    editorHelpers.setDisplay.FIELDS = {
        // A list of the functions used to update various fields to e called by editorHelpers.setDisplay.document
        'title': editorHelpers.setDisplay.title,
        'metadata.title': editorHelpers.setDisplay.metadataTitle,
        'contents': editorHelpers.setDisplay.contents,
        'settings.tracking': editorHelpers.setDisplay.settingsTracking,
        'settings.tracking_show': editorHelpers.setDisplay.settingsTrackingShow,
        'settings.papersize': editorHelpers.setDisplay.settingsPapersize,
        'settings.citationstyle': editorHelpers.setDisplay.settingsCitationstyle,
        'settings.documentstyle': editorHelpers.setDisplay.settingsDocumentstyle,
        'settings.metadata.subtitle': editorHelpers.layoutMetadata,
        'settings.metadata.abstract': editorHelpers.layoutMetadata,
        'id': editorHelpers.setDisplay.id
    };

    editorHelpers.setDisplay.document = function (theName, theValue) {
        editorHelpers.setDisplay.FIELDS[theName](theValue);
    };

    editorHelpers.TEXT_FIELDS = ['contents', 'metadata.title',
        'metadata.subtitle', 'metadata.abstract'
    ];

    editorHelpers.setDocumentData = function (theName, newValue, skipSendChange, aUserId) {
        var dmp, diff, theChange, currentValue;
        if (undefined===aUserId) {
            aUserId=theUser.id;
        }
        currentValue = eval('theDocument.' + theName);
        if (editorHelpers.TEXT_FIELDS.indexOf(theName) !== -1) {
            if (undefined === currentValue) {
                currentValue = '';
            }
            dmp = new diff_match_patch();
            diff = dmp.diff_main(currentValue, newValue);
            if (((diff.length) === 1 && (diff[0][0] === 0)) || diff.length === 0) {
                // Don't create a history entry if nothing has changed
                return false;
            }
            dmp.diff_cleanupEfficiency(diff);
        }
        else {
            if (currentValue === newValue) {
                // Don't create a history entry if nothing has changed
                return false;
            }
            diff = [currentValue, newValue];
        }
        if ('string' === typeof (newValue)) {
            // TODO: Using eval and escaping-unescaping is not very beautiful. If possible this should be done differently.
            eval("theDocument." + theName + "=unescape('" + escape(newValue) +
                "')");
        }
        else {
            eval("theDocument." + theName + "=" + JSON.stringify(newValue));
        }
        theChange = [aUserId, new Date().getTime(), theName, diff];
        theDocument.history.push(theChange);
        theDocument.lastHistory.push(theChange);
        if (!skipSendChange) {
            ws.send(JSON.stringify({
                type: 'transform',
                change: theChange
            }));
        }

        return true;
    };

    editorHelpers.setDiffChange = function (aUserId,field,diffs) {
        var theElement;
        if (field==='contents') {
            theElement = document.getElementById('document-contents');
        } else if (field==='metadata.title') {
            theElement = document.getElementById('document-title');
        } else {
            theElement = document.getElementById(field.replace(".","-"));
        }
        var dmp = new diff_match_patch();
        editorHelpers.getUpdatesFromInputFields();
        var savedSel = rangy.saveSelection();
        /* option 1
        if (savedSel.rangeInfos[0].collapsed) {
            document.getElementById(savedSel.rangeInfos[0].markerId).outerHTML='\u59fa';
        } else {
            document.getElementById(savedSel.rangeInfos[0].startMarkerId).outerHTML='\u59fb';
            document.getElementById(savedSel.rangeInfos[0].endMarkerId).outerHTML='\u59fa';
        }
        var theValue = dmp.patch_apply(
            dmp.patch_make(diffs), theElement.innerHTML)[0];
        if (savedSel.rangeInfos[0].collapsed) {
            theValue = theValue.replace(/\u59fa/g,'<span id="'+savedSel.rangeInfos[0].markerId+'"></span>');
        } else {
            theValue = theValue.replace(/\u59fb/g,'<span id="'+savedSel.rangeInfos[0].startMarkerId+'"></span>');
            theValue = theValue.replace(/\u59fa/g,'<span id="'+savedSel.rangeInfos[0].endMarkerId+'"></span>');
        }
        */
        /* option 2 */
        var currentValue = eval("theDocument."+field);
        var caretDiff = dmp.diff_main(currentValue,theElement.innerHTML);
        var theValueWithoutCaret = dmp.patch_apply(
            dmp.patch_make(diffs), currentValue)[0];
        var theValue = dmp.patch_apply(
            dmp.patch_make(caretDiff), theValueWithoutCaret)[0];
        /* end option 2 */
        editorHelpers.setDisplay.document(field,theValue);
        rangy.restoreSelection(savedSel);
        editorHelpers.getUpdatesFromInputFields(false,true,aUserId);
    };

    editorHelpers.applyDocumentDataChanges = function (data) {
        if (editorHelpers.TEXT_FIELDS.indexOf(data.change[2]) != -1) {
            editorHelpers.setDiffChange(data.change[0], data.change[2], data.change[3]);
        } else {
            editorHelpers.getUpdatesFromInputFields();
            editorHelpers.setDocumentData(data.change[2], data.change[3][1], true);
            editorHelpers.setDisplay.document(data.change[2], data.change[3][1]);
            editorHelpers.getUpdatesFromInputFields(false, true, data.change[0]);
        }
    };

    editorHelpers.getUpdatesFromInputFields = function (callback,skipSendChange,aUser) {

        editorHelpers.setDocumentData('metadata.title', jQuery(
            '#document-title').html().trim(),skipSendChange,aUser);

        editorHelpers.setDocumentData('contents', jQuery(
            '#document-contents').html().trim(),skipSendChange,aUser);

        jQuery('#document-metadata .metadata').each(function () {
            editorHelpers.setDocumentData('metadata.' + jQuery(this).attr(
                'data-metadata'), jQuery(this).html().trim(),skipSendChange,aUser);
        });

        if (callback) {
            callback();
        }
    };

    editorHelpers.saveDocument = function (callback) {
        var documentData = {}, lastHistory;
        
        jQuery('.save').addClass('disabled');
        
        // The title is saved twice: as metadata.title with html formatting and as just title as plain text.
        // Because we don't want two entries in the history, we avoid touching the history for the text-only version.

        theDocument.title = jQuery('#document-title').text().trim();

        if (0 === theDocument.lastHistory.length) {
            
            if (callback) {
                callback();
            }
            return;
        }


        if (theDocument.enableSave) {
            documentData.settings = JSON.stringify(theDocument.settings);
            documentData.metadata = JSON.stringify(theDocument.metadata);
            lastHistory = JSON.stringify(theDocument.lastHistory);
            documentData.last_history = lastHistory.substring(1,
                lastHistory.length - 1);
            theDocument.lastHistory = [];
            documentData.title = theDocument.title.substring(0, 255);
            documentData.contents = theDocument.contents;

            ws.send(JSON.stringify({
                type: 'save',
                document: documentData
            }))
        }

        if (callback) {
            callback();
        }

        return true;

    };

    editorHelpers.setPlaceholders = function (currentElement) {
        var placeHolderCss = '';
        if (jQuery('#document-title')[0].innerText.length === 0 &&
            currentElement != 'document-title') {
            placeHolderCss += '#document-title:before {content: "' +
                gettext('Title...') + '"}\n';
        }
        if (jQuery('#document-contents')[0].innerText.replace(
                /(\r\n|\n|\r)/gm, "").length === 0 && currentElement !=
            'document-contents') {
            placeHolderCss += '#document-contents:before {content: "' +
                gettext('Contents...') + '"}\n';
        }
        if (jQuery('#metadata-subtitle').length > 0 && jQuery(
                '#metadata-subtitle')[0].innerText.length === 0 &&
            currentElement != 'metadata-subtitle') {
            placeHolderCss += '#metadata-subtitle:before {content: "' +
                gettext('Subtitle...') + '"}\n';
        }
        if (jQuery('#metadata-abstract').length > 0 && jQuery(
                '#metadata-abstract')[0].innerText.length === 0 &&
            currentElement != 'metadata-abstract') {
            placeHolderCss += '#metadata-abstract:before {content: "' +
                gettext('Abstract...') + '"}\n';
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



    editorHelpers.websocket = function (data) {
        switch (data.type) {
        case 'chat':
            chatHelpers.newMessage(data);
            break;
        case 'connections':
            chatHelpers.updateParticipantList(data);
            break;
        case 'welcome':
            editorHelpers.fillEditorPage(data.document);
            if (data.hasOwnProperty('user')) {
                theUser = data.user;
            }
            else {
                theUser = theDocument.owner;
            }
            jQuery.event.trigger({
                type: "documentDataLoaded",
            });

            window.sessionId = data.session_id;

            if (data.hasOwnProperty('control')) {
                theDocument.enableSave = true;
            }
            else {
                theDocument.enableSave = false;
            }
            break;
        case 'transform':
            editorHelpers.applyDocumentDataChanges(data);
            break;
        case 'take_control':
            theDocument.localHistory = [];
            theDocument.enableSave = true;
        }
    };

    editorHelpers.bind = function () {
        window.theDocument = undefined;
        window.theUser = undefined;
        jQuery(document).ready(function () {
            var pathnameParts = window.location.pathname.split('/'),
                documentId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10);

            if (isNaN(documentId)) {
                documentId = 0;
            }
            window.ws = new WebSocket('ws://' + location.host +
                '/ws/doc/' + documentId);
            ws.onmessage = function (event) {
                editorHelpers.websocket(JSON.parse(event.data));
            }
            ws.onclose = editorHelpers.noConnectionToServer;
        });
    };

    exports.editorHelpers = editorHelpers;

}).call(this);
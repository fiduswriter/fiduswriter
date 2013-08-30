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
        var theMetadata = jQuery(this).attr('data-metadata');
        editorHelpers.switchMetadataDocumentData(theMetadata);
        editorHelpers.setMetadataDisplay(theMetadata);
    };
    
    editorHelpers.switchMetadataDocumentData = function (theMetadata) {
        editorHelpers.setDocumentData('settings.metadata.'+theMetadata, !theDocument.settings.metadata[
            theMetadata]);
    };
    
    editorHelpers.setMetadataDisplay = function (theMetadata) {
        editorHelpers.layoutMetadata();
        editorHelpers.documentHasChanged();
    };

    editorHelpers.fillEditorPage = function (aDocument) {
        theDocument = aDocument;
        theDocument.changed = false;
        theDocument.settings = jQuery.parseJSON(theDocument.settings);
        theDocument.metadata = jQuery.parseJSON(theDocument.metadata);
        theDocument.comments = jQuery.parseJSON(theDocument.comments);
        theDocument.history = jQuery.parseJSON(theDocument.history);
        theDocument.lastHistory = [];
        
        var DEFAULTS = [
            ['metadata.title', theDocument.title],
            ['settings.papersize', '1117'],
            ['settings.citationstyle', 'apa'],
            ['settings.tracking', false],
            ['settings.documentstyle', 'elephant'],
            ['settings.metadata', {}],
        ];
        
        for(var i=0;i<DEFAULTS.length;i++){
            // TODO: Find a way to do this without eval.
            if(eval("'undefined'===typeof(theDocument."+DEFAULTS[i][0]+")")) {
                if ('string'===typeof(DEFAULTS[i][1])) {
                    eval("theDocument."+DEFAULTS[i][0]+"=unescape('"+escape(DEFAULTS[i][1])+"')");
                } else {
                    eval("theDocument."+DEFAULTS[i][0]+"="+JSON.stringify(DEFAULTS[i][1]));
                }
            }
         
        }
        
        editorHelpers.setDisplay.document('contents', theDocument.contents);
        editorHelpers.setDisplay.document('metadata.title', theDocument.metadata.title);
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
        paginationConfig.contentsTopMargin = paginationConfigList[theValue].contentsTopMargin;
        paginationConfig.headerTopMargin = paginationConfigList[theValue].headerTopMargin;
        paginationConfig.contentsBottomMargin = paginationConfigList[theValue].contentsBottomMargin;
        paginationConfig.pagenumberBottomMargin = paginationConfigList[theValue].pagenumberBottomMargin;
        pagination.setPageStyle();
        set_document_style_timer = setTimeout(function() {
            clearTimeout(set_document_style_timer);
            if (document.webkitGetNamedFlows) {
                document.webkitGetNamedFlows()[0].dispatchEvent(pagination.events.escapesNeedMove);
            }
        }, 200);

    };
    
    editorHelpers.setDisplay.settingsCitationstyle = function (theValue) {
        jQuery("#header-navigation .citationstyle.selected").removeClass('selected');
        jQuery('span[data-citationstyle=' + theValue + ']').addClass('selected');
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
        set_document_style_timer = setTimeout(function() {
            clearTimeout(set_document_style_timer);
            if (document.webkitGetNamedFlows) {
                document.webkitGetNamedFlows()[0].dispatchEvent(pagination.events.escapesNeedMove);
            }
        }, 100);    
            
    };

    editorHelpers.setDisplay.id = function (theValue) {
        if (0 === theValue) {
            jQuery('.savecopy').addClass('disabled');
        } else {
            jQuery('.savecopy').removeClass('disabled');
        }
    };
    
    editorHelpers.setDisplay.settingsTracking = function (theValue) {
        if(theValue){
            jQuery('.ice-track').addClass('selected');
        } else {
            jQuery('.ice-track').removeClass('selected');
        }
    };
    
    editorHelpers.setDisplay.settingsTrackingShow = function (theValue) {
        if (theValue) {
            jQuery('.ice-display').addClass('selected');
            jQuery('#flow').removeClass('CT-hide');
        } else {
            jQuery('.ice-display').removeClass('selected');
            jQuery('#flow').addClass('CT-hide');
        }
    };
    
    editorHelpers.setDisplay.contents = function (theValue) {
        jQuery('#document-contents').html(theValue);
    };
    
    editorHelpers.setDisplay.metadataTitle = function (theValue) {
        jQuery('#document-title').html(theValue);
        editorHelpers.setDisplay.document('title', jQuery('#document-title').text().trim());
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
        'id': editorHelpers.setDisplay.id,
    };
    
     editorHelpers.setDisplay.document = function (theName, theValue) {
        editorHelpers.setDisplay.FIELDS[theName](theValue);
    };

    editorHelpers.TEXT_FIELDS = ['contents','metadata.title','metadata.subtitle','metadata.abstract'];
    
    editorHelpers.setDocumentData = function (theName, newValue) {
        var dmp, diff, theChange, currentValue;
        currentValue = eval('theDocument.'+theName);
        if (editorHelpers.TEXT_FIELDS.indexOf(theName) !== -1) {
            if ('undefined'===typeof(currentValue)) {
                currentValue = '';
            }
            dmp = new diff_match_patch();
            diff = dmp.diff_main(currentValue, newValue);
            if (diff.length==1 && diff[0][0]==0) {
                // Don't create a history entry if nothing has changed
                return false;
            }
            dmp.diff_cleanupEfficiency(diff);
            
        } else {
            if (currentValue === newValue) {
                // Don't create a history entry if nothing has changed
                return false;
            }
            diff = [currentValue, newValue];
        }
        if ('string'===typeof(newValue)) {
            // TODO: Using eval and escaping-unescaping is not very beautiful. If possible this should be done differently.
            eval("theDocument."+theName+"=unescape('"+escape(newValue)+"')");
        } else {
            eval("theDocument."+theName+"="+JSON.stringify(newValue));
        }
        theChange = [theUser.id, new Date().getTime(), theName, diff];
        theDocument.history.push(theChange);
        theDocument.lastHistory.push(theChange);
        return true;
    };
    
    editorHelpers.saveDocument = function (callback) {
        var documentData = {};
        
        
        editorHelpers.setDocumentData('metadata.title', jQuery('#document-title').html().trim());
        editorHelpers.setDocumentData('contents', jQuery('#document-contents').html().trim());        
        
        // The title is saved twice: as metadata.title with html formatting and as just title as plain text.
        // Because we don't want two entries in the history, we avoid touching the history for the text-only version.
        
        theDocument.title = jQuery('#document-title').text().trim();
        
        jQuery('#document-metadata .metadata').each(function() {
            editorHelpers.setDocumentData('metadata.'+jQuery(this).attr('data-metadata'), jQuery(this).html().trim());
        });
        
        documentData.id = theDocument.id;
        documentData.currently_open = true;
        documentData.settings = JSON.stringify(theDocument.settings);
        documentData.metadata = JSON.stringify(theDocument.metadata);
        documentData.comments = JSON.stringify(theDocument.comments);
        documentData.last_history = JSON.stringify(theDocument.lastHistory);
        theDocument.lastHistory = [];
        documentData.title = theDocument.title.substring(0,255);
        documentData.contents = theDocument.contents;

        var ajaxData = {
            url: '/text/save/',
            data: documentData,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status === 201) {
                    theDocument.id = response.doc_id;
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
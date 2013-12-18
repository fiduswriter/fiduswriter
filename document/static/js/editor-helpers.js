/**
 * @file Helper functions related to the editor.
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
(function () {
    var exports = this,
     /** Helper functions for the editor.
     * @namespace editorHelpers
     */ 
        editorHelpers = {};
        

    /** Select the metadata options in the menu that are set as enabled in theDocument.settings.metadata. NAME_OF_METADATA.  
     * Then layout the selected metadata on the page using the values  from theDocument.metadata.NAME_OF_METADATA.
     * @function layoutMetadata
     * @memberof editorHelpers 
     */ 
    editorHelpers.layoutMetadata = function () {
        var i, metadataNode = document.getElementById('document-metadata'), metadataClone = metadataNode.cloneNode(true), diffs;
        jQuery('.metadata-menu-item').removeClass('selected');

        for (i in theDocument.settings.metadata) {
            if (theDocument.settings.metadata[i]) {
                jQuery('.metadata-menu-item.metadata-' + i).addClass(
                    'selected');
            }
        }

        metadataClone.innerHTML = tmp_metadata({
            settings: theDocument.settings.metadata,
            metadata: theDocument.metadata
        });
        
        diffs = domDiff.diff(metadataNode, metadataClone);
        domDiff.apply(metadataNode,diffs);
    };

    /** Turn enabled metadata off and disabled metadata on, Function is bound to clicking option in metadata menu. 
     * @function switchMetadata
     * @memberof editorHelpers
     */  
    editorHelpers.switchMetadata = function () {
        var theMetadata = jQuery(this).attr('data-metadata');
        editorHelpers.setDocumentData('settings.metadata.' + theMetadata, !
            theDocument.settings.metadata[
                theMetadata]);
        editorHelpers.setMetadataDisplay(theMetadata);
    };

    /** Layout metadata and then mark the document as having changed.
     * @function setMetadataDisplay
     * @memberof editorHelpers
     */
    editorHelpers.setMetadataDisplay = function () {
        editorHelpers.layoutMetadata();
        editorHelpers.documentHasChanged();
    };

    /** Update the editor page with the document data from the server.
     * This is done if it was detected that the local version of the document 
     * doesn't correspond to the one on the server. 
     * @function updateEditorPage
     * @memberof editorHelpers
     * @param aDocument The document object as it comes from the server.
     * @param aDocumentValues The document value object consists of variables 
     * that differ from session to session.
     */
    editorHelpers.updateEditorPage = function (aDocument) {
        theDocumentValues.changed = false;
        theDocumentValues.touched = false;
        theDocument.settings = jQuery.parseJSON(aDocument.settings);
        theDocument.metadata = jQuery.parseJSON(aDocument.metadata);
        theDocument.contents = aDocument.contents;
        
        editorHelpers.setDisplay.document('contents', theDocument.contents);
        editorHelpers.setDisplay.document('metadata.title', theDocument.metadata
            .title);
        editorHelpers.layoutMetadata();
        theDocumentValues.diffNode = serverCommunications.cleanAGNode(document.getElementById('document-editable').cloneNode(true));
    };
    
    
    /** Fill the editor page with the document data from the server.
     * This is done after the document data is loaded from the server. 
     * @function fillEditorPage
     * @memberof editorHelpers
     * @param aDocument The document object as it comes from the server.
     * @param aDocumentValues The document value object consists of variables 
     * that differ from session to session.
     */
    editorHelpers.fillEditorPage = function (aDocument, aDocumentValues) {
        var DEFAULTS, i;
        theDocument = aDocument;
        theDocumentValues = aDocumentValues;
        theDocumentValues.changed = false;
        theDocumentValues.touched = false;
        theDocument.settings = jQuery.parseJSON(theDocument.settings);
        theDocument.metadata = jQuery.parseJSON(theDocument.metadata);

        documentId = theDocument.id;
        
        DEFAULTS = [
            ['metadata.title', theDocument.title],
            ['settings.papersize', '1117'],
            ['settings.citationstyle', 'apa'],
            ['settings.tracking', false],
            ['settings.documentstyle', defaultDocumentStyle],
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

        if (theDocumentValues.is_new) {
            // If the document is new, change the url. Then forget that the document is new.
            window.history.replaceState("", "", "/document/" + theDocument.id +
                "/");
            delete theDocumentValues.is_new;
        }

        editorHelpers.setDisplay.document('contents', theDocument.contents);
        editorHelpers.setDisplay.document('metadata.title', theDocument.metadata
            .title);
        
        serverCommunications.setDiffTimer();
    };

    /** Called whenever anything has changed in the document text. Makes sure that saving and synchronizing with peers happens.
     * @function documentHasChanged
     * @memberof editorHelpers
     */
    editorHelpers.documentHasChanged = function () {
        theDocumentValues.changed = true; // For document saving
        theDocumentValues.touched = true; // For synchronizing with other viewers
        //jQuery('.save').removeClass('disabled');
    };

    /** Functions related to taking document data from theDocument.* and displaying it (ie making it part of the DOM structure). 
     * @namespace editorHelpers.setDisplay 
     */
    editorHelpers.setDisplay = {};

    /** Set the document style.
     * @function settingsDocumentstyle
     * @memberof editorHelpers.setDisplay
     * @param theValue The name of the document style to switch to.*/
    editorHelpers.setDisplay.settingsDocumentstyle = function (theValue) {

        var documentStyleLink = document.getElementById('document-style-link');
        
        var newDocumentStyleLink = document.createElement('link');
        newDocumentStyleLink.setAttribute("rel", "stylesheet");
        newDocumentStyleLink.setAttribute("type", "text/css");
        newDocumentStyleLink.setAttribute("id", "document-style-link");
        newDocumentStyleLink.setAttribute("href", staticUrl+'css/document/'+theValue+'.css');
        
        documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink);
        
        
        jQuery("#header-navigation .style.selected").removeClass('selected');
        jQuery('span[data-style=' + theValue + ']').addClass('selected');

        set_document_style_timer = setTimeout(function () {
            clearTimeout(set_document_style_timer);
            if (document.webkitGetNamedFlows) {
                if (document.webkitGetNamedFlows()[0]) {
                    document.webkitGetNamedFlows()[0].dispatchEvent(
                        pagination.events.escapesNeedMove);
                }
            }
            commentHelpers.layoutComments();
        }, 200);
        
    };
    /** Set the document style.
     * @function settingsCitationstyle
     * @memberof editorHelpers.setDisplay
     * @param theValue The name of the citation style to switch to.*/
    editorHelpers.setDisplay.settingsCitationstyle = function (theValue) {
        jQuery("#header-navigation .citationstyle.selected").removeClass(
            'selected');
        jQuery('span[data-citationstyle=' + theValue + ']').addClass(
            'selected');
        //console.log('editor-helpers.js');
        citationHelpers.formatCitationsInDoc();
    };
    /** Set the document's paper size.
     * @function settingsPapersize
     * @memberof editorHelpers.setDisplay
     * @param theValue The paper height number associated with the paper size (A4: 1117, US Letter: 1020). */
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
    /** Set the document id.
     * @function id
     * @memberof editorHelpers.setDisplay
     * @param theValue The id of the current document.*/
    editorHelpers.setDisplay.id = function (theValue) {
        if (0 === theValue) {
            jQuery('.savecopy').addClass('disabled');
        }
        else {
            jQuery('.savecopy').removeClass('disabled');
        }
    };
    /** Set tracking to be on or off.
     * @function settingsTracking
     * @memberof editorHelpers.setDisplay
     * @param theValue false: tracking is off, true: tracking is on.*/
    editorHelpers.setDisplay.settingsTracking = function (theValue) {
        if (theValue) {
            jQuery('.ice-track').addClass('selected');
        }
        else {
            jQuery('.ice-track').removeClass('selected');
        }
    };
    /** Show or hide tracked changes.
     * @function settingsDocumentstyle
     * @memberof editorHelpers.setDisplay
     * @param theValue false: changes are not shown, true: changes are shown.*/
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
    
     /** Add the document contents/body text.
     * @function contents
     * @memberof editorHelpers.setDisplay
     * @param theValue The HTML of the contents/main body.*/
    editorHelpers.setDisplay.contents = function (theValue) {
        var contentsNode = document.getElementById('document-contents'), contentsClone, diffs;
        
        if (contentsNode.innerText.length===0) {
            contentsNode.innerHTML = theValue;
            return;
        }
        
        contentsClone = contentsNode.cloneNode(true)
        
        contentsClone.innerHTML = theValue;
        
        diffs = domDiff.diff(contentsNode, contentsClone);
        
        domDiff.apply(contentsNode, diffs);
        
    };

    /** Set the document title on the page.
     * @function metadataTitle
     * @memberof editorHelpers.setDisplay
     * @param theValue The HTML of the title.*/
    editorHelpers.setDisplay.metadataTitle = function (theValue) {
        var titleNode = document.getElementById('document-title'), titleClone, diffs;
        
        titleClone = titleNode.cloneNode(true);
        titleClone.innerHTML = theValue;
        
        diffs = domDiff.diff(titleNode, titleClone);
        
        domDiff.apply(titleNode, diffs);
        
        editorHelpers.setDisplay.document('title', titleClone.innerText);
    };
    /** Set the document title in the menu.
     * @function title
     * @memberof editorHelpers.setDisplay
     * @param theValue The text of the title.*/
    editorHelpers.setDisplay.title = function (theValue) {
        console.log(theValue);
        var theTitle = theValue;
        if (theTitle.length === 0) {
            theTitle = gettext('Untitled Document');
        }
        jQuery('title').html('Fidus Writer - ' + theTitle);
        jQuery('#header h1').html(theTitle);
    };

    /** A dictionary linking field names with set display functions. 
     * @constant  FIELDS
     * @memberof editorHelpers.setDisplay
     */
    editorHelpers.setDisplay.FIELDS = {
        // A list of the functions used to update various fields to be called by editorHelpers.setDisplay.document
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
        'settings.metadata.authors': editorHelpers.layoutMetadata,
        'settings.metadata.keywords': editorHelpers.layoutMetadata,
        'id': editorHelpers.setDisplay.id
    };
    /** Set any field on the editor page
     * @function document
     * @memberof editorHelpers.setDisplay
     * @param theName The name of the field.
     * @param theValue The value of the field.*/
    editorHelpers.setDisplay.document = function (theName, theValue) {
        editorHelpers.setDisplay.FIELDS[theName](theValue);
    };
    /** A list of fields contain editable text.
     * @constant  TEXT_FIELDS
     * @memberof editorHelpers
     */
    editorHelpers.TEXT_FIELDS = ['contents', 'metadata.title',
        'metadata.subtitle', 'metadata.abstract', 'metadata.authors', 'metadata.keywords'
    ];

    /** Sets a variable in theDocument to a value and optionally sends a change notification to other editors.
     * This notification is used in case of simple fields (all fields that are not individually editable in the text editor 
     * -- citation style, set tracking, etc. but not the document title) to make other clients copy the same values.
     * @function setDocumentData
     * @memberof editorHelpers
     * @param theName The name of the variable.
     * @param newValue The value that the variable is to be set to.
     * @param sendChange Whether a change notification should be sent to other clients. Default is true.
     */ 
    editorHelpers.setDocumentData = function (theName, newValue,
         sendChange) {
        var theChange, currentValue;
        if (undefined === sendChange) {
            sendChange = true;
        }
        currentValue = eval('theDocument.' + theName);

        if ('string' === typeof (newValue)) {
            // TODO: Using eval and escaping-unescaping is not very beautiful. If possible this should be done differently.
            eval("theDocument." + theName + "=unescape('" + escape(newValue) +
                "')");
        }
        else {
            eval("theDocument." + theName + "=" + JSON.stringify(newValue));
        }
        if (editorHelpers.TEXT_FIELDS.indexOf(theName) === -1) {
            if (currentValue === newValue) {
                // Don't create a history entry if nothing has changed
                return false;
            }
        
            theChange = [theName, newValue, new Date().getTime()+window.clientOffsetTime];

            if (sendChange) {
                serverCommunications.send({
                    type: 'transform',
                    change: theChange
                });
           }
    }
        return true;
    };
    
    /** Copy editable fields (title, body/contents, keywords, abstract, etc.) from the HTML and store the values inside theDocument.
     * @function getUpdatesFromInputFields
     * @memberof editorHelpers
     * @param callback Callback to be called after copying data (optional).
     */ 
    editorHelpers.getUpdatesFromInputFields = function (callback) {
        
        editorHelpers.setDocumentData('metadata.title', jQuery(
            '#document-title').html().trim());

        editorHelpers.setDocumentData('contents', jQuery(
            '#document-contents').html().trim());

        jQuery('#document-metadata .metadata').each(function () {
            editorHelpers.setDocumentData('metadata.' + jQuery(this).attr(
                    'data-metadata'), jQuery(this).html().trim());
        });

        if (callback) {
            callback();
        }
    };
    
    /** Calculates a hash sum of the document data to make sure collaborating editors all have the same document. 
     * Function from jsperf.com/hashing-string.
     * @function docHash
     * @memberof editorHelpers
     */ 
    
    editorHelpers.docHash = function() {
        var str = document.getElementById('document-editable').innerText, res = 0, len = str.length;
        for (var i = 0; i < len; i++) {
            res = res * 31 + str.charCodeAt(i);
            res = res & res;
        }
        return res;
    }

    /** Checks whether a hash sum corresponds with the local document.
     * @function checkHash
     * @memberof editorHelpers
     */     
    editorHelpers.checkHash = function(hash) {
        if (editorHelpers.docHash() != hash) {
            serverCommunications.send({type: 'get_document_update'});
        }
    }
    


    /** Will save the current Document to the server if theDocumentValues.control is true. 
     * In collaborative mode, only the first client to connect will have theDocumentValues.control set to true.
     * @function saveDocument
     * @memberof editorHelpers
     * @param callback Callback to be called after copying data (optional).
     */ 
    editorHelpers.saveDocument = function (callback) {
        var documentData = {};

        // The title is saved twice: as metadata.title with html formatting and as just title as plain text.
        // Because we don't want two entries in the history, we avoid touching the history for the text-only version.

        theDocument.title = jQuery('#document-title').text().trim();
        

        if (theDocumentValues.control) {
            documentData.settings = JSON.stringify(theDocument.settings);
            documentData.metadata = JSON.stringify(theDocument.metadata);
            
            documentData.title = theDocument.title.substring(0, 255);
            documentData.contents = theDocument.contents;

            serverCommunications.send({
                type: 'save',
                document: documentData
            });
        }
        
        theDocumentValues.changed = false;

        if (callback) {
            callback();
        }

        return true;

    };
    /** Show or hide placeholders ('Contents...', 'Title...', etc.) depending on whether these elements are empty or not. 
     * @function setPlaceholders
     * @memberof editorHelpers
     */ 
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
        if (jQuery('#metadata-authors').length > 0 && jQuery(
                '#metadata-authors')[0].innerText.length === 0 &&
            currentElement != 'metadata-authors') {
            placeHolderCss += '#metadata-authors:before {content: "' +
                gettext('Author(s)...') + '"}\n';
        }
        if (jQuery('#metadata-keywords').length > 0 && jQuery(
                '#metadata-keywords')[0].innerText.length === 0 &&
            currentElement != 'metadata-keywords') {
            placeHolderCss += '#metadata-keywords:before {content: "' +
                gettext('Keywords...') + '"}\n';
        }
        jQuery('#placeholderStyles')[0].innerHTML = placeHolderCss;
    };
    
    exports.editorHelpers = editorHelpers;

}).call(this);
/**
 * @file Set ups things on the editor page.
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


     /** Call printing dialog and destroy print view after printing. (step 2 of printing process)
      * @function print
      * @memberof editorHelpers
      */

     editorHelpers.printReady = function() {
         var flowTo = document.getElementById('print');
         window.print();
         jQuery(flowTo).hide();
         jQuery(flowTo).html('');
         delete window.flowCopy;
     };


     document.addEventListener('layoutFlowFinished', editorHelpers.printReady, false);

     /** Initiate printing using simplePagination. (step 1 of printing process)
      * @function print
      * @memberof editorHelpers
      */

     editorHelpers.print = function() {
         var flowTo = document.getElementById('print');
         window.flowCopy = document.getElementById('flow').cloneNode(true);
         jQuery(flowTo).show();
         pagination.applyBookLayoutWithoutDivision();
     };


     /** Turn enabled metadata off and disabled metadata on, Function is bound to clicking option in metadata menu.
      * @function switchMetadata
      * @memberof editorHelpers
      */
     editorHelpers.switchMetadata = function () {
         var theMetadata = jQuery(this).attr('data-metadata');
         editorHelpers.setSetting('metadata-'+theMetadata, !
             theDocument.settings['metadata-'+
                 theMetadata], true);
         editorHelpers.setMetadataDisplay();
     };

     /** Layout metadata and then mark the document as having changed.
     * @function setMetadataDisplay
     * @memberof editorHelpers
     */
    editorHelpers.setMetadataDisplay = function () {
        editorHelpers.layoutMetadata();
        editorHelpers.documentHasChanged();
    };


     /** Fill the editor page with the document data from the server.
      * This is done after the document data is loaded from the server.
      * @function fillEditorPage
      * @memberof editorHelpers
      * @param aDocument The document object as it comes from the server.
      * @param aDocumentValues The document value object consists of variables
      * that differ from session to session.
      */
     editorHelpers.copyDocumentValues = function (aDocument, aDocumentValues) {
         var theDocument, theDocumentValues;

         theDocument = aDocument;
         theDocumentValues = aDocumentValues;
         theDocumentValues.changed = false;
         theDocumentValues.titleChanged = false;
         theDocument.settings = theDocument.settings;
         theDocument.metadata = JSON.parse(theDocument.metadata);
         theDocument.contents = JSON.parse(theDocument.contents);
         documentId = theDocument.id;

         [
             ['papersize', 1117],
             ['citationstyle', 'apa'], // TODO: make this calculated. Not everyone will have apa installed
             ['documentstyle', defaultDocumentStyle]
         ].forEach(function(variable) {
           if (theDocument.settings[variable[0]] === undefined) {
              theDocument.settings[variable[0]] = variable[1];
           }
         });


         if (theDocumentValues.is_new) {
             // If the document is new, change the url. Then forget that the document is new.
             window.history.replaceState("", "", "/document/" + theDocument.id +
                 "/");
             delete theDocumentValues.is_new;
         }
         window.theDocument = theDocument;
         window.theDocumentValues = theDocumentValues;

         // Wait one second and then relayout the footnotes. At this time the fonts should have loaded.

         setTimeout(function() {
             editorEscapes.reset();
         }, 1000);

     };


     /** Called whenever anything has changed in the document text. Makes sure that saving and synchronizing with peers happens.
      * @function documentHasChanged
      * @memberof editorHelpers
      */
     editorHelpers.documentHasChanged = function () {
         theDocumentValues.changed = true; // For document saving
     };

     /** Called whenever the document title had changed. Makes sure that saving happens.
      * @function titleHasChanged
      * @memberof editorHelpers
      */
     editorHelpers.titleHasChanged = function () {
         theDocumentValues.titleChanged = true; // For title saving
     };

     /** Functions related to taking document data from theDocument.* and displaying it (ie making it part of the DOM structure).
      * @namespace editorHelpers.displaySetting
      */
     editorHelpers.displaySetting = {};

     /** Set the document style.
      * @function documentstyle
      * @memberof editorHelpers.displaySetting*/
     editorHelpers.displaySetting.documentstyle = function () {

         var documentStyleLink, stylesheet;

         jQuery("#header-navigation .style.selected").removeClass('selected');
         jQuery('span[data-style=' + theDocument.settings.documentstyle + ']').addClass('selected');

         documentStyleLink = document.getElementById('document-style-link');

         // Remove previous style.
         documentStyleLink.parentElement.removeChild(documentStyleLink.previousElementSibling);

         stylesheet = loadCSS(staticUrl+'css/document/'+theDocument.settings.documentstyle+'.css', documentStyleLink);

         onloadCSS( stylesheet, function() {
            theEditor.editor.mod.commentStore.layout.layoutComments();
         });

     };

     /** Set the document style.
      * @function citationstyle
      * @memberof editorHelpers.displaySetting*/
     editorHelpers.displaySetting.citationstyle = function () {
         jQuery("#header-navigation .citationstyle.selected").removeClass(
             'selected');
         jQuery('span[data-citationstyle=' + theDocument.settings.citationstyle + ']').addClass(
             'selected');
         if (theEditor.editor) {
           citationHelpers.formatCitationsInDoc();
         }
     };

     /** Set the document's paper size.
      * @function papersize
      * @memberof editorHelpers.displaySetting*/
     editorHelpers.displaySetting.papersize = function () {
         jQuery("#header-navigation .papersize.selected").removeClass(
             'selected');
         jQuery('span[data-paperheight=' + theDocument.settings.papersize +
             ']').addClass('selected');
         paginationConfig['pageHeight'] = theDocument.settings.papersize;

     };


     editorHelpers.layoutMetadata = function () {
        var metadataCss = '';
        ['subtitle', 'abstract', 'authors', 'keywords'].forEach(function(metadataItem) {
            if (!theDocument.settings['metadata-'+metadataItem]) {
                metadataCss += '#metadata-' + metadataItem + ' {display: none;}\n'
            } else {
                metadataCss += 'span.metadata-' + metadataItem + ' {background-color: black; color: white;}\n'
            }
        });

        jQuery('#metadata-styles')[0].innerHTML = metadataCss;

     };

     /** A dictionary linking field names with set display functions.
      * @constant  FIELDS
      * @memberof editorHelpers.displaySetting
      */
     editorHelpers.displaySetting.FIELDS = {
         // A list of the functions used to update various fields to be called by editorHelpers.displaySetting.set
         'papersize': editorHelpers.displaySetting.papersize,
         'citationstyle': editorHelpers.displaySetting.citationstyle,
         'documentstyle': editorHelpers.displaySetting.documentstyle,
         'metadata': editorHelpers.layoutMetadata
     };
     /** Set any field on the editor page
      * @function document
      * @memberof editorHelpers.displaySetting
      * @param theName The name of the field.*/
     editorHelpers.displaySetting.set = function (theName) {
         editorHelpers.displaySetting.FIELDS[theName.split('-')[0]]();
     };

     /** Sets a variable in theDocument to a value and optionally sends a change notification to other editors.
      * This notification is used in case of simple fields (all fields that are not individually editable in the text editor
      * -- citation style, set tracking, etc. but not the document title) to make other clients copy the same values.
      * @function setSetting
      * @memberof editorHelpers
      * @param theName The name of the variable.
      * @param newValue The value that the variable is to be set to.
      * @param sendChange Whether a change notification should be sent to other clients. Default is true.
      */
     editorHelpers.setSetting = function (variable, newValue,
          sendChange) {
         var currentValue;

         currentValue = theDocument.settings[variable];

         if (currentValue === newValue) {
             return false;
         }

         theDocument.settings[variable] = newValue;

         if (sendChange) {
             serverCommunications.send({
                 type: 'setting_change',
                 variable: variable,
                 value: newValue
             });
        }

        return true;
     };

     /** Will send an update of the current Document to the server if theDocumentValues.control is true.
      * In collaborative mode, only the first client to connect will have theDocumentValues.control set to true.
      * @function sendDocumentUpdate
      * @memberof editorHelpers
      * @param callback Callback to be called after copying data (optional).
      */
     editorHelpers.sendDocumentUpdate = function (callback) {
         var documentData = {};

         documentData.metadata = JSON.stringify(theDocument.metadata);
         documentData.contents = JSON.stringify(theDocument.contents);
         documentData.version = theDocument.version;
         documentData.hash = theDocument.hash;
         console.log('saving');
         serverCommunications.send({
             type: 'update_document',
             document: documentData
         });

         theDocumentValues.changed = false;

         if (callback) {
             callback();
         }

         return true;

     };

     exports.editorHelpers = editorHelpers;

 }).call(this);




// Functions to be executed at startup
jQuery(document).ready(function() {

    var documentStyleMenu = document.getElementById("documentstyle-list"),
        citationStyleMenu = document.getElementById("citationstyle-list"),
        newMenuItem, i;

    theEditor.initiate();

    // Set Auto-save to send the document every two minutes, if it has changed.
    setInterval(function() {
        if (theDocumentValues && theDocumentValues.changed) {
            theEditor.getUpdates(function() {
                editorHelpers.sendDocumentUpdate();
            });
        }
    }, 120000);

    // Set Auto-save to send the title every 5 seconds, if it has changed.
    setInterval(function() {
        if (theDocumentValues && theDocumentValues.titleChanged) {
            theDocumentValues.titleChanged = false;
            if (theDocumentValues.control) {
                serverCommunications.send({
                    type: 'update_title',
                    title: theDocument.title
                });
            }
        }
    }, 10000);

    // Enable toolbar menu
    jQuery('#menu1').ptMenu();

    //open dropdown for headermenu
    jQuery('.header-nav-item, .multibuttonsCover').each(function() {
        $.addDropdownBox(jQuery(this), jQuery(this).siblings(
            '.fw-pulldown'));
    });

    for (i = 0; i < documentStyleList.length; i++) {
        newMenuItem = document.createElement("li");
        newMenuItem.innerHTML = "<span class='fw-pulldown-item style' data-style='" + documentStyleList[i].filename + "' title='" + documentStyleList[i].title + "'>" + documentStyleList[i].title + "</span>";
        documentStyleMenu.appendChild(newMenuItem);
    }
    for (i in citeproc.styles) {
        newMenuItem = document.createElement("li");
        newMenuItem.innerHTML = "<span class='fw-pulldown-item citationstyle' data-citationstyle='" + i + "' title='" + citeproc.styles[i].name + "'>" + citeproc.styles[i].name + "</span>";
        citationStyleMenu.appendChild(newMenuItem);
    }

    jQuery('.metadata-menu-item, #open-close-header, .save, .multibuttonsCover, \
    .savecopy, .download, .latex, .epub, .html, .print, .style, .citationstyle, \
    .tools-item, .papersize, .metadata-menu-item, .share, #open-close-header, \
    .save, .papersize-menu, .metadata-menu, .documentstyle-menu, \
    .citationstyle-menu, .exporter-menu').addClass('disabled');

    jQuery('#editor-navigation').hide();

    jQuery(document).on('mousedown', '.savecopy:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.savecopy(theDocument);
    });

    jQuery(document).on('mousedown', '.download:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.downloadNative(theDocument);
    });
    jQuery(document).on('mousedown', '.latex:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.downloadLatex(theDocument);
    });
    jQuery(document).on('mousedown', '.epub:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.downloadEpub(theDocument);
    });
    jQuery(document).on('mousedown', '.html:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.downloadHtml(theDocument);
    });
    jQuery(document).on('mousedown', '.print:not(.disabled)', function() {
        editorHelpers.print();
    });
    jQuery(document).on('mousedown', '.close:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        window.location.href = '/';
    });

    // Document Style switching
    jQuery(document).on('mousedown', "#header-navigation .style:not(.disabled)", function() {
        if (editorHelpers.setSetting('documentstyle',
                jQuery(this).attr('data-style'), true)) {

            editorHelpers.displaySetting.set('documentstyle');
            editorHelpers.documentHasChanged();
        }
        return false;
    });

    // Citation Style switching
    jQuery(document).on('mousedown', "#header-navigation .citationstyle:not(.disabled)", function() {
        if (editorHelpers.setSetting('citationstyle',
                jQuery(this).attr('data-citationstyle'),true)) {
            editorHelpers.displaySetting.set('citationstyle');
            editorHelpers.documentHasChanged();
            theEditor.editor.mod.commentStore.layout.layoutComments();
        }
        return false;
    });
    // Tools
    jQuery(document).on('mousedown', "#header-navigation .tools-item:not(.disabled)", function() {
        toolsHelpers.toolsEventHandler(jQuery(this).data('function'));
        return false;
    });

    // Paper size switching
    jQuery(document).on('mousedown', "#header-navigation .papersize:not(.disabled)", function() {
        if (editorHelpers.setSetting('papersize',
                parseInt(jQuery(this).attr('data-paperheight')), true)) {
            editorHelpers.displaySetting.set('papersize');
            editorHelpers.documentHasChanged();
        }
        return false;
    });

    jQuery(document).on('mousedown', '.metadata-menu-item:not(.disabled)', editorHelpers.switchMetadata);

    jQuery(document).on('mousedown', '.share:not(.disabled)', function() {
        accessrightsHelpers.createAccessRightsDialog([
            theDocument.id
        ]);
    });

    //open and close header
    jQuery(document).on('click', '#open-close-header:not(.disabled)', function() {
        var header_top = -92,
            toolnav_top = 0,
            content_top = 108;
        if (jQuery(this).hasClass('header-closed')) {
            jQuery(this).removeClass('header-closed');
            header_top = 0,
                toolnav_top = 92,
                content_top = 200;
        } else {
            jQuery(this).addClass('header-closed');
        }
        jQuery('#header').stop().animate({
            'top': header_top
        });
        jQuery('#editor-navigation').stop().animate({
            'top': toolnav_top
        });
        jQuery('#pagination-layout').stop()
            .animate({
                'top': content_top
            }, {
                'complete': function() {
                    theEditor.editor.mod.commentStore.layout.layoutComments();
                }
            });
    });

    jQuery(document).on('mousedown', '.save:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.sendDocumentUpdate();
        });
        exporter.uploadNative(theDocument);
    });

    // Bind comment functions
    commentHelpers.bindEvents();
    bibliographyHelpers.bindEvents();
});


jQuery(document).bind("bibliography_ready", function(event) {
    jQuery('.exporter-menu').each(function() {
        jQuery(this).removeClass('disabled');
    });
});

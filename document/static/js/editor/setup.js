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
         console.log('updating editor');

         jQuery('.toolbarundoredo button').addClass('disabled');
         theDocumentValues.changed = false;
         theDocument.settings = aDocument.settings;
         theDocument.metadata = jQuery.parseJSON(aDocument.metadata);
         theDocument.contents = jQuery.parseJSON(aDocument.contents);
         theDocument.comments = aDocument.comments;
         theDocument.comment_version = aDocument.comment_version;
         theDocument.version = aDocument.version;
         theEditor.update();
         theEditor.applyDiffs(aDocument.last_diffs);
         mathHelpers.resetMath();
         citationHelpers.formatCitationsInDoc();
     };


     /** Fill the editor page with the document data from the server.
      * This is done after the document data is loaded from the server.
      * @function fillEditorPage
      * @memberof editorHelpers
      * @param aDocument The document object as it comes from the server.
      * @param aDocumentValues The document value object consists of variables
      * that differ from session to session.
      */
     editorHelpers.copyDocumentValues = function (aDocument, aDocumentValues, lastDiffs) {
         var DEFAULTS, i, theDocument, theDocumentValues;
         theDocument = aDocument;
         theDocumentValues = aDocumentValues;
         theDocumentValues.changed = false;
         theDocumentValues.virgin = true;
         theDocument.settings = theDocument.settings;
         theDocument.metadata = jQuery.parseJSON(theDocument.metadata);
         theDocument.contents = jQuery.parseJSON(theDocument.contents);

         documentId = theDocument.id;

         DEFAULTS = [
             ['metadata.title', theDocument.title],
             ['settings.papersize', '1117'],
             ['settings.citationstyle', 'apa'],
             ['settings.documentstyle', defaultDocumentStyle]
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

     /** Functions related to taking document data from theDocument.* and displaying it (ie making it part of the DOM structure).
      * @namespace editorHelpers.displaySetting
      */
     editorHelpers.displaySetting = {};

     /** Set the document style.
      * @function documentstyle
      * @memberof editorHelpers.displaySetting*/
     editorHelpers.displaySetting.documentstyle = function () {

         var documentStyleLink = document.getElementById('document-style-link');

         var newDocumentStyleLink = document.createElement('link');
         newDocumentStyleLink.setAttribute("rel", "stylesheet");
         newDocumentStyleLink.setAttribute("type", "text/css");
         newDocumentStyleLink.setAttribute("id", "document-style-link");
         newDocumentStyleLink.setAttribute("href", staticUrl+'css/document/'+theDocument.settings.documentstyle+'.css');

         documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink);


         jQuery("#header-navigation .style.selected").removeClass('selected');
         jQuery('span[data-style=' + theDocument.settings.documentstyle + ']').addClass('selected');

         set_document_style_timer = setTimeout(function () {
             clearTimeout(set_document_style_timer);
             commentHelpers.layoutComments();
         }, 200);

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
      /*   if ('string' === typeof (newValue)) {
             // TODO: Using eval and escaping-unescaping is not very beautiful. If possible this should be done differently.
             theDocument.settings[theName]=unescape(escape(newValue));
         }
         else {
             theDocument.settings[theName] = newValue;
         }*/

         if (sendChange) {
             serverCommunications.send({
                 type: 'setting_change',
                 variable: variable,
                 value: newValue
             });
        }

        return true;
     };

     /** Will save the current Document to the server if theDocumentValues.control is true.
      * In collaborative mode, only the first client to connect will have theDocumentValues.control set to true.
      * @function saveDocument
      * @memberof editorHelpers
      * @param callback Callback to be called after copying data (optional).
      */
     editorHelpers.saveDocument = function (callback) {
         var documentData = {};

         if (theDocumentValues.control===true) {
             documentData.metadata = JSON.stringify(theDocument.metadata);
             documentData.title = theDocument.title.substring(0, 255);
             documentData.contents = JSON.stringify(theDocument.contents);
             documentData.version = theDocument.version;
             documentData.hash = theDocument.hash;
             console.log('saving');
             serverCommunications.send({
                 type: 'save',
                 document: documentData
             });
         } else {
             console.log('not saving');
         }

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

    // Enable toolbar menu
    jQuery('#menu1').ptMenu();

    //open dropdown for headermenu
    jQuery('.header-nav-item').each(function() {
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



});

// Functions to be executed when document has loaded
jQuery(document).bind('documentDataLoaded', function() {

    editorEscapes.initiate();
    // We cannot download BibDB and ImageDB before we know if we are the document owner or not.
    // But we cannot load the document before we have the ImageDB availabel because
    // figures need to be layouted with the ImageDB available.
    bibliographyHelpers.init();
    usermediaHelpers.init(function(){
      theEditor.initiate();
      citationHelpers.formatCitationsInDoc();
      theEditor.applyDiffs(theDocumentValues.last_diffs);
    });



    editorHelpers.displaySetting.set('documentstyle');

    // Document Style switching
    jQuery("#header-navigation .style").bind('mousedown', function() {
        if (editorHelpers.setSetting('documentstyle',
                jQuery(this).attr('data-style'), true)) {

            editorHelpers.displaySetting.set('documentstyle');
            editorHelpers.documentHasChanged();
        }
        return false;
    });


    editorHelpers.displaySetting.set('citationstyle');

    jQuery('span[data-citationstyle=' + theDocument.settings.citationstyle +
        ']').addClass('selected');

    // Citation Style switching
    jQuery("#header-navigation .citationstyle").bind('mousedown', function() {
        if (editorHelpers.setSetting('citationstyle',
                jQuery(this).attr('data-citationstyle'),true)) {
            editorHelpers.displaySetting.set('citationstyle');
            editorHelpers.documentHasChanged();
            commentHelpers.layoutComments();
        }
        return false;
    });
    // Tools
    jQuery("#header-navigation .tools-item").bind('mousedown', function() {
        toolsHelpers.toolsEventHandler(jQuery(this).data('function'));
        return false;
    });

    editorHelpers.displaySetting.set('papersize');

    // Paper size switching
    jQuery("#header-navigation .papersize").bind('mousedown', function() {
        if (editorHelpers.setSetting('papersize',
                parseInt(jQuery(this).attr('data-paperheight')), true)) {
            editorHelpers.displaySetting.set('papersize');
            editorHelpers.documentHasChanged();
        }
        return false;
    });

    jQuery(document).on('mousedown', '.savecopy:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        exporter.savecopy(theDocument);
    });

    jQuery('.download').bind('mousedown', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        exporter.downloadNative(theDocument);
    });
    jQuery('.latex').bind('mousedown', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        exporter.downloadLatex(theDocument);
    });
    jQuery('.epub').bind('mousedown', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        exporter.downloadEpub(theDocument);
    });
    jQuery('.html').bind('mousedown', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        exporter.downloadHtml(theDocument);
    });
    jQuery('.print').bind('mousedown', function() {
        editorHelpers.print();
    });
    jQuery('.close').bind('mousedown', function() {
        theEditor.getUpdates(function() {
            editorHelpers.saveDocument();
        });
        window.location.href = '/';
    });


    editorHelpers.layoutMetadata();

    if (theDocumentValues.rights === 'r') {
        jQuery('#editor-navigation').hide();
        jQuery('.papersize-menu,.metadata-menu,.documentstyle-menu').addClass(
            'disabled');
    } else if (theDocumentValues.rights === 'w') {

        jQuery('.metadata-menu-item').bind('mousedown', editorHelpers.switchMetadata);


        if (!theDocumentValues.is_owner) {
            jQuery('span.share').addClass('disabled');
        }


        mathHelpers.resetMath();


        // Set Auto-save to save every two minutes
        setInterval(function() {
            if (theDocumentValues.changed) {
                theEditor.getUpdates(function() {
                    editorHelpers.saveDocument();
                });
            }
        }, 120000);


        // bind the share dialog to the button if the user is the document owner
        if (theDocumentValues.is_owner) {
            jQuery('.share').bind('mousedown', function() {
                accessrightsHelpers.createAccessRightsDialog([
                    theDocument.id
                ]);
            });
        }


        // Bind comment functions
        commentHelpers.bindEvents();

        jQuery('.save').bind('mousedown', function() {
            theEditor.getUpdates(function() {
                editorHelpers.saveDocument();
            });
            exporter.uploadNative(theDocument);
        });


        jQuery('.multibuttonsCover').each(function() {
            $.addDropdownBox(jQuery(this), jQuery(this).siblings(
                '.fw-pulldown'));
        });

        //open and close header
        jQuery('#open-close-header').bind('click', function() {
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
                        commentHelpers.layoutComments();
                    }
                });
        });

    }
});

jQuery(document).bind("bibliography_ready", function(event) {
    jQuery('.citationstyle-menu, .exporter-menu').each(function() {
        jQuery.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
        jQuery(this).removeClass('disabled');
        jQuery(this).removeClass('header-nav-item-disabled');
        jQuery(this).addClass('header-nav-item');
    });
});

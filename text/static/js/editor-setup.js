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

// Initial editor wide variables
var toPrint = false,
    lastStyleUsedFootnotes = false,
    failedPingAttempts = 0,
    timeOfLastServerPing, saveTimer;


// Functions to be executed at startup
jQuery(document).ready(function () {
    // Enable toolbar menu
    jQuery('#menu1').ptMenu();

    //open dropdown for headermenu
    jQuery('.header-nav-item').each(function () {
        $.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
    });



});

// Functions to be executed when document has loaded
jQuery(document).bind('documentDataLoaded', function () {

    var plugins = {
        'toolbarheadings': {},
        'toolbarbold': {},
        'toolbaritalic': {},
        'toolbarlists': {},
        'toolbarlink': {},
        'toolbarfootnote': {},
        'toolbarcite': {},
        'toolbarmath': {},
        'toolbarfigure': {},
        // 'toolbarundoredo': {},
        'toolbarcomment': {},
    };
    // We cannot download BibDB and ImageDB before we know if we are the document owner or not.
    editorHelpers.updatePingTimer();
    bibliographyHelpers.init();
    usermediaHelpers.init();

    // Enable Hallo.js Editor
    jQuery('#document-editable').hallo({
        plugins: plugins,
        editable: true,
        toolbar: 'toolbarleft',
        parentElement: jQuery('#editor-tools-wrapper')
    });



    var set_document_style_timer = setTimeout(function() {
        clearTimeout(set_document_style_timer);
        //setDocumentstyle();
        editorHelpers.setDisplay.document('settings.documentstyle',theDocument.settings.documentstyle);
    }, 800);

    // Document Style switching
    jQuery("#header-navigation .style").bind('click', function () {
        if (editorHelpers.setDocumentData('settings.documentstyle',jQuery(this).attr(
            'data-style'))) {
        
            editorHelpers.setDisplay.document('settings.documentstyle',theDocument.settings.documentstyle);
            editorHelpers.documentHasChanged();
            commentHelpers.layoutComments();
        }
        return false;
    });
    
    
    editorHelpers.setDisplay.document('settings.citationstyle',theDocument.settings.citationstyle);

    jQuery('span[data-citationstyle=' + theDocument.settings.citationstyle + ']').addClass('selected');

    // Citation Style switching
    jQuery("#header-navigation .citationstyle").bind('click', function () {
        if (editorHelpers.setDocumentData('settings.citationstyle',jQuery(this).attr(
            'data-citationstyle'))) {
            editorHelpers.setDisplay.document('settings.citationstyle',theDocument.settings.citationstyle);
            editorHelpers.documentHasChanged();
            commentHelpers.layoutComments();
        }
        return false;
    });
    // Tools
    jQuery("#header-navigation .tools-item").bind('click', function () {
        toolsHelpers.toolsEventHandler(jQuery(this).data('function'));
        return false;
    });
    
    editorHelpers.setPlaceholders();
    
    jQuery(document).on('blur','#document-title,#document-contents,#metadata-subtitle,#metadata-abstract', function () {
        editorHelpers.setPlaceholders();
    });
    jQuery(document).on('focus', '#document-title,#document-contents,#metadata-subtitle,#metadata-abstract', function () {
        editorHelpers.setPlaceholders(jQuery(this).attr('id'));
    });

    editorHelpers.setDisplay.document('settings.papersize',theDocument.settings.papersize);
    
    // Paper size switching
    jQuery("#header-navigation .papersize").bind('click', function () {
        if (editorHelpers.setDocumentData('settings.papersize',(!theDocument.settings
                .papersize))) {
            editorHelpers.setDisplay.document('settings.papersize',theDocument.settings.papersize);
            editorHelpers.documentHasChanged();
        }
        return false;
    });

    editorHelpers.setDisplay.document('id', theDocument.id);
    

    // Disable papersize menu if we are dealing with a non CSS Regions browser
    if (jQuery('.pagination-simple').length > 0) {
        jQuery('.papersize-menu').unbind('click');
        jQuery('.papersize-menu').addClass('disabled');
    }

    jQuery(document).on('click', '.savecopy:not(.disabled)', function () {
        editorHelpers.saveDocumentIfChanged();
        exporter.savecopy(theDocument);
    });

    jQuery('.download').bind('click', function () {
        editorHelpers.saveDocumentIfChanged();
        exporter.downloadNative(theDocument);
    });
    jQuery('.latex').bind('click', function () {
        editorHelpers.saveDocumentIfChanged();
        exporter.downloadLatex(theDocument);
    });
    jQuery('.epub').bind('click', function () {
        editorHelpers.saveDocumentIfChanged();
        exporter.downloadEpub(theDocument);
    });
    jQuery('.html').bind('click', function () {
        editorHelpers.saveDocumentIfChanged();
        exporter.downloadHtml(theDocument);
    });
    jQuery('.print').bind('click', function () {
        toPrint = true;
        window.print();
    });
    jQuery('.close').bind('click', function () {
        editorHelpers.saveDocumentIfChanged(function() {
            window.location.href = '/';
        });
    });

    editorHelpers.layoutMetadata();

    jQuery('.metadata-menu-item').bind('click', editorHelpers.switchMetadata);

    jQuery('#metadata-subtitle, #metadata-abstract').bind('blur', function () {
        if (jQuery.trim(this.innerText) === '') {
            this.innerHTML = '<p><br></p>';
        };
    });

    if (!theDocument.is_owner) {
        jQuery('span.share').addClass('disabled');
    }

    // Re-enable the reload button
    document.removeEventListener("keydown", disableReload);

    if (theDocument.is_locked) {
        jQuery('#editor-navigation').hide();
    } else if (theDocument.rights === 'w') {
        window.tracker = new ice.InlineChangeEditor({
            element: document.querySelector('#document-editable'),
            handleEvents: false,
            mergeBlocks: false,
            contentEditable: true,
            currentUser: {
                id: theUser.id,
                name: theUser.name
            },
            plugins: ['IceSmartQuotesPlugin', 'IceEmdashPlugin', ]
        }).startTracking();
        document.querySelector('#document-editable').removeAttribute(
            'contenteditable');
        jQuery('.editable').attr('contenteditable', true);
        mathHelpers.resetMath(mathHelpers.saveMathjaxElements);

        // Set Auto-save to save every ten seconds
        saveTimer = setInterval(function () {
            editorHelpers.saveDocumentIfChanged();
        }, 10000);

        // bind the share dialog to the button if the user is the document owner
        if (theDocument.is_owner) {
            jQuery('.share').bind('click', function () {
                accessrightsHelpers.createAccessRightsDialog([theDocument.id]);
            });
        }


        keyEvents.bindEvents();

        // Bind comment functions
        commentHelpers.bindEvents();

        var editableArea = document.querySelector("#document-editable");

        if (editableArea) {
            // Send paste to handlePaste
            editableArea.addEventListener('paste', paste.handlePaste, false);

            // Send cut to handleCut
            editableArea.addEventListener('cut', cut.handleCut, false);

            // Send key events on to the tracker directly.
            jQuery(editableArea).bind('keyup keypress mousedown mouseup', function (evt) {
                if (theDocument.settings.tracking) {
                    return tracker.handleEvent(evt);
                } else {
                    return true;
                }
            });

            mutations.bind(editableArea);
        }

        // Bind CTRL+s to save document.
        jQuery(document).keydown(function (event) {
            //19 for Mac Command+S
            if (!(String.fromCharCode(event.which).toLowerCase() == 's' &&
                    event.ctrlKey) && !
                (event.which == 19)) return true;

            editorHelpers.saveDocumentIfChanged();
            event.preventDefault();
            return false;
        });



        // Set webpage title when document title changes
        jQuery('#document-title').bind('keyup paste change hallomodified',
            function () {
                editorHelpers.setDisplay.document('title', jQuery(this).text().trim());
            });

        // When contents of document have changed, mark it as such
        jQuery('#document-editable').bind(
            'keyup paste change hallomodified', function () {
                editorHelpers.documentHasChanged();
            });
        jQuery('.save').bind('click', function () {
            editorHelpers.saveDocumentIfChanged();
        });



        jQuery(document).on('click', '.pagination-footnote-item-container',
            function (e) {
                var footnote = document.getElementById(this.dataset.footnoteId);
                tracker._addNodeTracking(footnote, false, false);
            }
        );

        var wait_hallotoolbar = setTimeout(function () {
            //set extra eventhandlers for hallotoolbar
            jQuery('.hallotoolbar .multibuttonsCover').each(function() {
                $.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
            });
        }, 100);

        //ice pulldown
        $.addDropdownBox(jQuery('#ice-control'), jQuery('#ice-control .fw-pulldown'));

        editorHelpers.setDisplay.document('settings.tracking',theDocument.settings.tracking);
        editorHelpers.setDisplay.document('settings.tracking_show',theDocument.settings.tracking_show);
       

        jQuery('.ice-display').bind('click', function () {
            editorHelpers.setDocumentData('settings.tracking_show',(!theDocument.settings
                .tracking_show));
            editorHelpers.setDisplay.document('settings.tracking_show',theDocument.settings.tracking_show);
            editorHelpers.documentHasChanged();
            return false;
        });

        if (theDocument.is_owner) {
            jQuery('.ice-track').bind('click', function () {
                editorHelpers.setDocumentData('settings.tracking', (!theDocument.settings.tracking));
                editorHelpers.setDisplay.document('settings.tracking',theDocument.settings.tracking);
                editorHelpers.documentHasChanged();
                return false;
            });

            jQuery('.ice-accept-all').bind('click', function () {
                window.tracker.acceptAll();
                editorHelpers.documentHasChanged();
                return false;
            });

            jQuery('.ice-reject-all').bind('click', function () {
                window.tracker.rejectAll();
                editorHelpers.documentHasChanged();
                return false;
            });

            // Bind in-text tracking menu
            trackingHelpers.bindEvents();
        } else {
            jQuery('.ice-track').addClass('disabled');
            jQuery('.ice-accept-all').addClass('disabled');
            jQuery('.ice-reject-all').addClass('disabled');
        }


        //open and close header
        jQuery('#open-close-header').bind('click', function () {
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
            jQuery('#pagination-layout, #comment-box-container').stop()
                .animate({
                    'top': content_top
                });
        });

        // The following sends a signal that the page is being closed. This way the
        // editor view will not be locked because the user is reloading the editor page
        // or closes the wrong browser tab. Only if the writer performs two rapid
        // document reloads after oneanother will he still be locked out.

        jQuery(window).bind('beforeunload', function () {
            jQuery.ajax({
                url: '/text/close/',
                data: {
                    id: theDocument.id
                },
                type: 'POST',
                async: false
            });
        });
    }
});
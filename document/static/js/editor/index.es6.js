import {Editor} from "./es6_modules/editor"


/** Helper functions for the editor.
 * @namespace editorHelpers
 */
var editorHelpers = {};

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



window.editorHelpers = editorHelpers;


// Functions to be executed at startup
jQuery(document).ready(function() {

    var documentStyleMenu = document.getElementById("documentstyle-list"),
        citationStyleMenu = document.getElementById("citationstyle-list"),
        newMenuItem, i;

    theEditor.init();

    // Set Auto-save to send the document every two minutes, if it has changed.
    setInterval(function() {
        if (theEditor.docInfo && theEditor.docInfo.changed) {
            theEditor.getUpdates(function() {
                theEditor.sendDocumentUpdate();
            });
        }
    }, 120000);

    // Set Auto-save to send the title every 5 seconds, if it has changed.
    setInterval(function() {
        if (theEditor.docInfo && theEditor.docInfo.titleChanged) {
            theEditor.docInfo.titleChanged = false;
            if (theEditor.docInfo.control) {
                theEditor.mod.serverCommunications.send({
                    type: 'update_title',
                    title: theEditor.doc.title
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
            theEditor.sendDocumentUpdate();
        });
        exporter.savecopy(theEditor.doc);
    });

    jQuery(document).on('mousedown', '.download:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        exporter.downloadNative(theEditor.doc);
    });
    jQuery(document).on('mousedown', '.latex:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        exporter.downloadLatex(theEditor.doc);
    });
    jQuery(document).on('mousedown', '.epub:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        exporter.downloadEpub(theEditor.doc);
    });
    jQuery(document).on('mousedown', '.html:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        exporter.downloadHtml(theEditor.doc);
    });
    jQuery(document).on('mousedown', '.print:not(.disabled)', function() {
        editorHelpers.print();
    });
    jQuery(document).on('mousedown', '.close:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        window.location.href = '/';
    });

    // Document Style switching
    jQuery(document).on('mousedown', "#header-navigation .style:not(.disabled)", function() {
        if (theEditor.mod.settings.set.setSetting('documentstyle',
                jQuery(this).attr('data-style'), true)) {
            theEditor.docInfo.changed = true;
        }
        return false;
    });

    // Citation Style switching
    jQuery(document).on('mousedown', "#header-navigation .citationstyle:not(.disabled)", function() {
        if (theEditor.mod.settings.set.setSetting('citationstyle',
                jQuery(this).attr('data-citationstyle'), true)) {
            theEditor.docInfo.changed = true;
            theEditor.mod.comments.layout.layoutComments();
        }
        return false;
    });
    // Tools
    jQuery(document).on('mousedown', "#header-navigation .tools-item:not(.disabled)", function() {

        switch (jQuery(this).data('function')) {
            case 'wordcounter':
                theEditor.mod.tools.wordCount.wordCountDialog();
                break;
            case 'showshortcuts':
                $().showShortcuts();
                break;
        };

        return false;
    });

    // Paper size switching
    jQuery(document).on('mousedown', "#header-navigation .papersize:not(.disabled)", function() {
        if (theEditor.mod.settings.set.setSetting('papersize',
                parseInt(jQuery(this).attr('data-paperheight')), true)) {
            theEditor.docInfo.changed = true;
        }
        return false;
    });
    /** Turn enabled metadata off and disabled metadata on, Function is bound to clicking option in metadata menu.
     */
    jQuery(document).on('mousedown', '.metadata-menu-item:not(.disabled)', function () {
        let theMetadata = jQuery(this).attr('data-metadata')

        theEditor.mod.settings.set.setSetting('metadata-' + theMetadata,
            !theEditor.doc.settings['metadata-' +
                theMetadata], true);
    });

    jQuery(document).on('mousedown', '.share:not(.disabled)', function() {
        accessrightsHelpers.createAccessRightsDialog([
            theEditor.doc.id
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
                    theEditor.mod.comments.layout.layoutComments();
                }
            });
    });

    jQuery(document).on('mousedown', '.save:not(.disabled)', function() {
        theEditor.getUpdates(function() {
            theEditor.sendDocumentUpdate();
        });
        exporter.uploadNative(theEditor.doc);
    });

    bibliographyHelpers.bindEvents();
});


jQuery(document).bind("bibliography_ready", function(event) {
    jQuery('.exporter-menu').each(function() {
        jQuery(this).removeClass('disabled');
    });
});

let theEditor = new Editor()
window.theEditor = theEditor

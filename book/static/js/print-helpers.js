/**
 * @file Helper functions to deal with book printing.
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
    /** 
    * Helper functions for the book print page. TODO 
    * @namespace printHelpers
    */
        printHelpers = {}, documentOwners=[];
        
    var pageSizes = {
        folio: {
            width:12,
            height:15
        },
        quarto: {
            width:9.5,
            height:12
        },
        octavo: {
            width:6,
            height:9
        },
        a5: {
            width:5.83,
            height:8.27
        },
        a4: {            
            width:8.27,
            height:11.69
        }
    };

    printHelpers.setTheBook = function (aBook) {
        var i;
        theBook = aBook;
        theBook.settings = jQuery.parseJSON(theBook.settings);
        theBook.metadata = jQuery.parseJSON(theBook.metadata);
        printHelpers.setDocumentStyle(theBook.settings.documentstyle);
        for (i = 0; i < theBook.chapters.length; i++) {
            theBook.chapters[i].metadata = jQuery.parseJSON(theBook.chapters[
                i].metadata);
            theBook.chapters[i].settings = jQuery.parseJSON(theBook.chapters[
                i].settings);
            if (documentOwners.indexOf(theBook.chapters[i].owner)===-1) {
                documentOwners.push(theBook.chapters[i].owner);
            }
        }
        paginationConfig['pageHeight'] = pageSizes[theBook.settings.papersize].height;
        paginationConfig['pageWidth'] = pageSizes[theBook.settings.papersize].width;

        bibliographyHelpers.getABibDB(documentOwners.join(','), function (
                aBibDB) {
                
            
                printHelpers.fillPrintPage(aBibDB);
            });
        

    };

    printHelpers.getBookData = function (id) {
        $.ajax({
            url: '/book/book/',
            data: {
                'id': id
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                printHelpers.setTheBook(response.book);
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };

    printHelpers.fillPrintPage = function (aBibDB) {
        
        var bibliography = jQuery('#bibliography');
        jQuery(document.body).addClass(theBook.settings.documentstyle);
        jQuery('#book')[0].outerHTML = tmp_book_print({
            theBook: theBook
        });
        
        
        jQuery(bibliography).html(citationHelpers.formatCitations(document.body, theBook.settings.citationstyle, aBibDB));
        
        if (jQuery(bibliography).text().trim().length===0) {
            jQuery(bibliography).remove();
        }
        
        paginationConfig['frontmatterContents'] = tmp_book_print_start({
            theBook: theBook
        });

        mathHelpers.resetMath(function () {
            pagination.initiate();
            pagination.applyBookLayout();
            jQuery("#pagination-contents").addClass('user-contents');
            jQuery('head title').html(jQuery('#document-title').text());
        });
        
        
    };
    
    printHelpers.setDocumentStyle = function (theValue) {
        var documentStyleLink = document.getElementById('document-style-link'),
            newDocumentStyleLink = document.createElement('link');
        newDocumentStyleLink.setAttribute("rel", "stylesheet");
        newDocumentStyleLink.setAttribute("type", "text/css");
        newDocumentStyleLink.setAttribute("id", "document-style-link");
        newDocumentStyleLink.setAttribute("href", staticUrl+'css/document/'+theValue+'.css');
        
        documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink);        
    };


    printHelpers.bind = function () {
        window.theBook = undefined;
        $(document).ready(function () {
            var pathnameParts = window.location.pathname.split('/'),
                bookId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10);

            printHelpers.getBookData(bookId);
        });
    };


    exports.printHelpers = printHelpers;

}).call(this);
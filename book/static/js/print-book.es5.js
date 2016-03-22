/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit print-book.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PrintBook = undefined;

var _templates = require('./templates');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
* Helper functions for the book print page.
*/

var PrintBook = exports.PrintBook = (function () {
    // A class that contains everything that happens on the book print page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.

    function PrintBook() {
        _classCallCheck(this, PrintBook);

        this.pageSizes = {
            folio: {
                width: 12,
                height: 15
            },
            quarto: {
                width: 9.5,
                height: 12
            },
            octavo: {
                width: 6,
                height: 9
            },
            a5: {
                width: 5.83,
                height: 8.27
            },
            a4: {
                width: 8.27,
                height: 11.69
            }
        };
        this.documentOwners = [];
        this.bindEvents();
    }

    _createClass(PrintBook, [{
        key: 'setTheBook',
        value: function setTheBook(aBook) {
            var that = this;

            window.theBook = aBook;
            theBook.settings = JSON.parse(theBook.settings);
            theBook.metadata = JSON.parse(theBook.metadata);
            this.setDocumentStyle(theBook.settings.documentstyle);
            for (var i = 0; i < theBook.chapters.length; i++) {
                theBook.chapters[i].metadata = JSON.parse(theBook.chapters[i].metadata);
                theBook.chapters[i].settings = JSON.parse(theBook.chapters[i].settings);
                if (this.documentOwners.indexOf(theBook.chapters[i].owner) === -1) {
                    this.documentOwners.push(theBook.chapters[i].owner);
                }
            }
            paginationConfig['pageHeight'] = this.pageSizes[theBook.settings.papersize].height;
            paginationConfig['pageWidth'] = this.pageSizes[theBook.settings.papersize].width;

            bibliographyHelpers.getABibDB(this.documentOwners.join(','), function (aBibDB) {
                that.fillPrintPage(aBibDB);
            });
        }
    }, {
        key: 'modelToViewNode',
        value: function modelToViewNode(node) {
            // TODO: add needed changes
            return node;
        }

        /* TODO: IS this still useful? Should it be part of the modeltoViewNode?
        createFootnoteView = function (htmlFragment, number) {
            let fn = document.createElement('span'), id
            fn.classList.add('pagination-footnote')
             fn.appendChild(document.createElement('span'))
            fn.firstChild.appendChild(document.createElement('span'))
            fn.firstChild.firstChild.appendChild(htmlFragment)
             if (typeof number === 'undefined') {
                number = document.getElementById('flow').querySelectorAll('.pagination-footnote').length
                 while (document.getElementById('pagination-footnote-'+number)) {
                    number++
                }
            }
             fn.id = 'pagination-footnote-'+ number
            return fn
        }*/

    }, {
        key: 'getBookData',
        value: function getBookData(id) {
            var that = this;
            $.ajax({
                url: '/book/book/',
                data: {
                    'id': id
                },
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    that.setTheBook(response.book);
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    $.addAlert('error', jqXHR.responseText);
                },
                complete: function complete() {
                    $.deactivateWait();
                }
            });
        }
    }, {
        key: 'fillPrintPage',
        value: function fillPrintPage(aBibDB) {

            var bibliography = jQuery('#bibliography');
            jQuery(document.body).addClass(theBook.settings.documentstyle);
            jQuery('#book')[0].outerHTML = (0, _templates.bookPrintTemplate)({
                theBook: theBook,
                modelToViewNode: this.modelToViewNode
            });

            jQuery(bibliography).html(citationHelpers.formatCitations(document.body, theBook.settings.citationstyle, aBibDB));

            if (jQuery(bibliography).text().trim().length === 0) {
                jQuery(bibliography).parent().remove();
            }

            paginationConfig['frontmatterContents'] = (0, _templates.bookPrintStartTemplate)({
                theBook: theBook
            });

            // TODO: render equations
            pagination.initiate();
            pagination.applyBookLayout();
            jQuery("#pagination-contents").addClass('user-contents');
            jQuery('head title').html(jQuery('#document-title').text());
        }
    }, {
        key: 'setDocumentStyle',
        value: function setDocumentStyle(theValue) {
            var documentStyleLink = document.getElementById('document-style-link'),
                newDocumentStyleLink = document.createElement('link');
            newDocumentStyleLink.setAttribute("rel", "stylesheet");
            newDocumentStyleLink.setAttribute("type", "text/css");
            newDocumentStyleLink.setAttribute("id", "document-style-link");
            newDocumentStyleLink.setAttribute("href", staticUrl + 'css/document/' + theValue + '.css');

            documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink);
        }
    }, {
        key: 'bindEvents',
        value: function bindEvents() {
            var that = this;
            window.theBook = undefined;
            $(document).ready(function () {
                var pathnameParts = window.location.pathname.split('/'),
                    bookId = parseInt(pathnameParts[pathnameParts.length - 2], 10);

                that.getBookData(bookId);
            });
        }
    }]);

    return PrintBook;
})();

},{"./templates":2}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for the initial pages of a book before the contents begin. */
var bookPrintStartTemplate = exports.bookPrintStartTemplate = _.template('\
    <h1 id="document-title"><%= theBook.title %></h1>\
    <% if (theBook.metadata.subtitle && theBook.metadata.subtitle != "" ) { %>\
        <h2 id="metadata-subtitle"><%= theBook.metadata.subtitle %></h2>\
    <% } %>\
    <% if (theBook.metadata.author && theBook.metadata.author != "" ) { %>\
        <h3><%= theBook.metadata.author %></h3>\
    <% } %>\
<div class="pagination-pagebreak"></div>\
    <% if (theBook.metadata.publisher && theBook.metadata.publisher != "" ) { %>\
        <div class="publisher"><%= theBook.metadata.publisher %></div>\
    <% } %>\
    <% if (theBook.metadata.copyright && theBook.metadata.copyright != "" ) { %>\
        <div class="copyright"><%= theBook.metadata.copyright %></div>\
    <% } %>\
<div class="pagination-pagebreak">\
');

/** A template for the print view of a book. */
var bookPrintTemplate = exports.bookPrintTemplate = _.template('\
<% _.each(theBook.chapters, function (chapter) { %>\
    <% var tempNode; %>\
    <% if (chapter.part && chapter.part != "") { %>\
        <div class="part">\
            <h1><%= chapter.part %></h1>\
        </div>\
    <% } %>\
    <div class="chapter">\
        <h1 class="title"><%= chapter.title %></h1>\
        <% if (chapter.settings) { %>\
            <% if (chapter.settings["metadata-subtitle"] && chapter.metadata.subtitle) { %>\
                <% tempNode = exporter.obj2Node(chapter.metadata.subtitle) %>\
                <% if (tempNode.textContent.length > 0) { %>\
                    <h2 class="metadata-subtitle"><%= tempNode.textContent %></h2>\
                <% } %>\
            <% } %>\
            <% if (chapter.settings["metadata-abstract"] && chapter.metadata.abstract ) { %>\
                <% tempNode = exporter.obj2Node(chapter.metadata.abstract) %>\
                <% if (tempNode.textContent.length > 0) { %>\
                    <h2 class="metadata-abstract"><%= tempNode.textContent %></h2>\
                <% } %>\
            <% } %>\
        <% } %>\
        <%= modelToViewNode(exporter.obj2Node(JSON.parse(chapter.contents))).innerHTML %>\
    </div>\
<% }); %>\
');

},{}],3:[function(require,module,exports){
"use strict";

var _printBook = require("./es6_modules/print-book/print-book");

/* Create thePrintBook and make it available to the general namespace for debugging
purposes.*/

var thePrintBook = new _printBook.PrintBook();
window.thePrintBook = thePrintBook;

},{"./es6_modules/print-book/print-book":1}]},{},[3]);

/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit print-book.es6.js and run ./es6-transpile.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Converts a BibDB to a DB of the CSL type.
 * @param bibDB The bibliography database to convert.
 */

var CSLExporter = exports.CSLExporter = (function () {
    function CSLExporter(bibDB) {
        _classCallCheck(this, CSLExporter);

        this.bibDB = bibDB;
        this.cslDB = {};
        this.convertAll();
    }

    _createClass(CSLExporter, [{
        key: 'convertAll',
        value: function convertAll() {
            for (var bibId in this.bibDB) {
                this.cslDB[bibId] = this.getCSLEntry(bibId);
                this.cslDB[bibId].id = bibId;
            }
        }
        /** Converts one BibDB entry to CSL format.
         * @function getCSLEntry
         * @param id The id identifying the bibliography entry.
         */

    }, {
        key: 'getCSLEntry',
        value: function getCSLEntry(id) {
            var bib = this.bibDB[id],
                cslOutput = {};

            for (var fKey in bib) {
                if (bib[fKey] !== '' && fKey in BibFieldTypes && 'csl' in BibFieldTypes[fKey]) {
                    var fType = BibFieldTypes[fKey]['type'];
                    if ('f_date' == fType) {
                        cslOutput[BibFieldTypes[fKey]['csl']] = this._reformDate(bib[fKey]);
                    } else if ('l_name' == fType) {
                        cslOutput[BibFieldTypes[fKey]['csl']] = this._reformName(bib[fKey]);
                    } else {
                        cslOutput[BibFieldTypes[fKey]['csl']] = bib[fKey];
                    }
                }
            }
            cslOutput['type'] = BibEntryTypes[bib.entry_type].csl;
            return cslOutput;
        }
    }, {
        key: '_reformDate',
        value: function _reformDate(theValue) {
            //reform date-field
            var dates = theValue.split('/'),
                datesValue = [],
                len = dates.length;
            for (var i = 0; i < len; i++) {
                var eachDate = dates[i];
                var dateParts = eachDate.split('-');
                var dateValue = [];
                var len2 = dateParts.length;
                for (var j = 0; j < len2; j++) {
                    var datePart = dateParts[j];
                    if (datePart != parseInt(datePart)) break;
                    dateValue[dateValue.length] = datePart;
                }
                datesValue[datesValue.length] = dateValue;
            }

            return {
                'date-parts': datesValue
            };
        }
    }, {
        key: '_reformName',
        value: function _reformName(theValue) {
            //reform name-field
            var names = theValue.substring(1, theValue.length - 1).split('} and {'),
                namesValue = [],
                len = names.length;
            for (var i = 0; i < len; i++) {
                var eachName = names[i];
                var nameParts = eachName.split('} {');
                var nameValue = undefined;
                if (nameParts.length > 1) {
                    nameValue = {
                        'family': nameParts[1].replace(/[{}]/g, ''),
                        'given': nameParts[0].replace(/[{}]/g, '')
                    };
                } else {
                    nameValue = {
                        'literal': nameParts[0].replace(/[{}]/g, '')
                    };
                }
                namesValue[namesValue.length] = nameValue;
            }

            return namesValue;
        }
    }]);

    return CSLExporter;
})();

},{}],2:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/* Connects Fidus Writer citation system with citeproc */

var citeprocSys = exports.citeprocSys = (function () {
    function citeprocSys(cslDB) {
        _classCallCheck(this, citeprocSys);

        this.cslDB = cslDB;
        this.abbreviations = {
            "default": {}
        };
        this.abbrevsname = "default";
    }

    _createClass(citeprocSys, [{
        key: "retrieveItem",
        value: function retrieveItem(id) {
            return this.cslDB[id];
        }
    }, {
        key: "retrieveLocale",
        value: function retrieveLocale(lang) {
            return citeproc.locals[lang];
        }
    }, {
        key: "getAbbreviation",
        value: function getAbbreviation(dummy, obj, jurisdiction, vartype, key) {
            try {
                if (this.abbreviations[this.abbrevsname][vartype][key]) {
                    obj["default"][vartype][key] = this.abbreviations[this.abbrevsname][vartype][key];
                } else {
                    obj["default"][vartype][key] = "";
                }
            } catch (e) {
                // There is breakage here that needs investigating.
            }
        }
    }]);

    return citeprocSys;
})();

},{}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.formatCitations = undefined;

var _citeprocSys = require("./citeproc-sys");

var _csl = require("../bibliography/exporter/csl");

/**
 * Functions to display citations and the bibliography.
 */

var formatCitations = exports.formatCitations = function formatCitations(contentElement, citationstyle, aBibDB) {
    var bibliographyHTML = '',
        allCitations = jQuery(contentElement).find('.citation'),
        listedWorksCounter = 0,
        citeprocParams = [],
        bibFormats = [],
        citationsIds = [],
        cslGetter = new _csl.CSLExporter(aBibDB),

    // TODO: Figure out if this conversion should be done earlier and cached
    cslDB = cslGetter.cslDB;

    allCitations.each(function (i) {
        var entries = this.dataset.bibEntry ? this.dataset.bibEntry.split(',') : [];
        var allCitationsListed = true;

        var len = entries.length;
        for (var j = 0; j < len; j++) {
            if (aBibDB.hasOwnProperty(entries[j])) {
                continue;
            }
            allCitationsListed = false;
            break;
        }

        if (allCitationsListed) {
            var pages = this.dataset.bibPage ? this.dataset.bibPage.split(',,,') : [],
                prefixes = this.dataset.bibBefore ? this.dataset.bibBefore.split(',,,') : [],

            //suffixes = this.dataset.bibAfter.split(',,,'),
            citationItem = undefined,
                citationItems = [];

            listedWorksCounter += entries.length;

            for (var j = 0; j < len; j++) {
                citationItem = {
                    id: entries[j]
                };
                if ('' != pages[j]) {
                    citationItem.locator = pages[j];
                }
                if ('' != prefixes[j]) {
                    citationItem.prefix = prefixes[j];
                }
                //if('' != suffixes[j]) { citationItem.suffix = pages[j] }
                citationItems.push(citationItem);
            }

            //            bibFormats.push(i)
            bibFormats.push(this.dataset.bibFormat);
            citeprocParams.push({
                citationItems: citationItems,
                properties: {
                    noteIndex: bibFormats.length
                }
            });
        }
    });

    if (listedWorksCounter == 0) {
        return '';
    }

    var citeprocObj = getFormattedCitations(citeprocParams, citationstyle, bibFormats, cslDB);

    for (var j = 0; j < citeprocObj.citations.length; j++) {
        var citationText = citeprocObj.citations[j][0][1];
        if ('note' == citeprocObj.citationtype) {
            citationText = '<span class="pagination-footnote"><span><span>' + citationText + '</span></span></span>';
        }
        allCitations[j].innerHTML = citationText;
    }

    bibliographyHTML += '<h1>' + gettext('Bibliography') + '</h1>';
    // Add entry to bibliography

    for (var j = 0; j < citeprocObj.bibliography[1].length; j++) {
        bibliographyHTML += citeprocObj.bibliography[1][j];
    }

    return bibliographyHTML;
    // Delete entries that are exactly the same
    //bibliographyHTML = _.unique(bibliographyHTML.split('<p>')).join('<p>')
    //bibliographyHTML = bibliographyHTML.replace(/<div class="csl-entry">/g, '<p>')
    //return bibliographyHTML.replace(/<\/div>/g, '</p>')
};

var getFormattedCitations = function getFormattedCitations(citations, citationStyle, citationFormats, cslDB) {

    if (citeproc.styles.hasOwnProperty(citationStyle)) {
        citationStyle = citeproc.styles[citationStyle];
    } else {
        for (styleName in citeproc.styles) {
            citationStyle = citeproc.styles[styleName];
            break;
        }
    }

    var citeprocInstance = new CSL.Engine(new _citeprocSys.citeprocSys(cslDB), citationStyle.definition);

    var inText = citeprocInstance.cslXml.className === 'in-text';

    var len = citations.length;

    var citationTexts = [];

    for (var i = 0; i < len; i++) {
        var citation = citations[i],
            citationText = citeprocInstance.appendCitationCluster(citation);

        if (inText && 'textcite' == citationFormats[i]) {
            var newCiteText = '',
                items = citation.citationItems,
                len2 = items.length;

            for (var j = 0; j < len2; j++) {
                var onlyNameOption = [{
                    id: items[j].id,
                    "author-only": 1
                }];

                var onlyDateOption = [{
                    id: items[j].id,
                    "suppress-author": 1
                }];

                if (items[j].locator) {
                    onlyDateOption[0].locator = items[j].locator;
                }

                if (items[j].label) {
                    onlyDateOption[0].label = items[j].label;
                }

                if (items[j].prefix) {
                    onlyDateOption[0].prefix = items[j].prefix;
                }

                if (items[j].suffix) {
                    onlyDateOption[0].suffix = items[j].suffix;
                }

                if (0 < j) {
                    newCiteText += '; ';
                }
                newCiteText += citeprocInstance.makeCitationCluster(onlyNameOption);
                newCiteText += ' ' + citeprocInstance.makeCitationCluster(onlyDateOption);
            }

            citationText[0][1] = newCiteText;
        }

        citationTexts.push(citationText);
    }

    return {
        'citations': citationTexts,
        'bibliography': citeprocInstance.makeBibliography(),
        'citationtype': citeprocInstance.cslXml.className
    };
};

var stripValues = function stripValues(bibValue) {
    return bibValue.replace(/[\{\}]/g, '');
};

var getAuthor = function getAuthor(bibData) {
    var author = bibData.author,
        returnObject = {};
    if ('' == author || 'undefined' == typeof author) {
        author = bibData.editor;
    }
    var splitAuthor = author.split("{");
    if (splitAuthor.length > 2) {
        returnObject.firstName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        returnObject.lastName = author.split("{")[2].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    } else {
        returnObject.firstName = '';
        returnObject.lastName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    }
    return returnObject;
};

var yearFromDateString = function yearFromDateString(dateString) {
    // This mirrors the formatting of the date as returned by Python in bibliography/models.py
    var dates = dateString.split('/');
    var newValue = [];
    for (var x = 0; x < dates.length; x++) {
        var dateParts = dates[x].split('-');
        // Only make use of the first value (to/from years), discarding month and day values
        if (isNaN(dateParts[0])) {
            break;
        }
        newValue.push(dateParts[0]);
    }
    if (newValue.length === 0) {
        return 'Unpublished';
    } else if (newValue.length === 1) {
        return newValue[0];
    } else {
        return newValue[0] + '-' + newValue[1];
    }
};

},{"../bibliography/exporter/csl":1,"./citeproc-sys":2}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Same functionality as objToNode/nodeToObj in diffDOM.js, but also offers output in XHTML format (obj2Node) and without form support. */
var obj2Node = exports.obj2Node = function obj2Node(obj, docType) {
    var parser = undefined;
    if (obj === undefined) {
        return false;
    }
    if (docType === 'xhtml') {
        parser = new DOMParser().parseFromString('<xml/>', "text/xml");
    } else {
        parser = document;
    }

    function inner(obj, insideSvg) {
        var node = undefined;
        if (obj.hasOwnProperty('t')) {
            node = parser.createTextNode(obj.t);
        } else if (obj.hasOwnProperty('co')) {
            node = parser.createComment(obj.co);
        } else {
            if (obj.nn === 'svg' || insideSvg) {
                node = parser.createElementNS('http://www.w3.org/2000/svg', obj.nn);
                insideSvg = true;
            } else if (obj.nn === 'script') {
                // Do not allow scripts
                return parser.createTextNode('');
            } else {
                node = parser.createElement(obj.nn);
            }
            if (obj.a) {
                for (var i = 0; i < obj.a.length; i++) {
                    node.setAttribute(obj.a[i][0], obj.a[i][1]);
                }
            }
            if (obj.c) {
                for (var i = 0; i < obj.c.length; i++) {
                    node.appendChild(inner(obj.c[i], insideSvg));
                }
            }
        }
        return node;
    }
    return inner(obj);
};

var node2Obj = exports.node2Obj = function node2Obj(node) {
    var obj = {};

    if (node.nodeType === 3) {
        obj.t = node.data;
    } else if (node.nodeType === 8) {
        obj.co = node.data;
    } else {
        obj.nn = node.nodeName;
        if (node.attributes && node.attributes.length > 0) {
            obj.a = [];
            for (var i = 0; i < node.attributes.length; i++) {
                obj.a.push([node.attributes[i].name, node.attributes[i].value]);
            }
        }
        if (node.childNodes && node.childNodes.length > 0) {
            obj.c = [];
            for (var i = 0; i < node.childNodes.length; i++) {
                if (node.childNodes[i]) {
                    obj.c.push(node2Obj(node.childNodes[i]));
                }
            }
        }
    }
    return obj;
};

},{}],5:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.PrintBook = undefined;

var _templates = require("./templates");

var _json = require("../exporter/json");

var _format = require("../citations/format");

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
        key: "setTheBook",
        value: function setTheBook(aBook) {
            var that = this;

            aBook.settings = JSON.parse(aBook.settings);
            aBook.metadata = JSON.parse(aBook.metadata);
            for (var i = 0; i < aBook.chapters.length; i++) {
                aBook.chapters[i].metadata = JSON.parse(aBook.chapters[i].metadata);
                aBook.chapters[i].settings = JSON.parse(aBook.chapters[i].settings);
                if (this.documentOwners.indexOf(aBook.chapters[i].owner) === -1) {
                    this.documentOwners.push(aBook.chapters[i].owner);
                }
            }
            this.theBook = aBook;
            this.setDocumentStyle(this.theBook.settings.documentstyle);

            paginationConfig['pageHeight'] = this.pageSizes[this.theBook.settings.papersize].height;
            paginationConfig['pageWidth'] = this.pageSizes[this.theBook.settings.papersize].width;

            var bibGetter = new BibliographyDB(this.documentOwners.join(','), false, false, false);
            bibGetter.getBibDB(function (bibDB) {
                that.bibDB = bibDB;
                that.fillPrintPage();
            });
        }
    }, {
        key: "modelToViewNode",
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
        key: "getBookData",
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
        key: "fillPrintPage",
        value: function fillPrintPage() {
            var bibliography = jQuery('#bibliography');
            jQuery(document.body).addClass(this.theBook.settings.documentstyle);
            jQuery('#book')[0].outerHTML = (0, _templates.bookPrintTemplate)({
                theBook: this.theBook,
                modelToViewNode: this.modelToViewNode,
                obj2Node: _json.obj2Node
            });

            jQuery(bibliography).html((0, _format.formatCitations)(document.body, this.theBook.settings.citationstyle, this.bibDB));

            if (jQuery(bibliography).text().trim().length === 0) {
                jQuery(bibliography).parent().remove();
            }

            paginationConfig['frontmatterContents'] = (0, _templates.bookPrintStartTemplate)({ theBook: this.theBook });

            // TODO: render equations
            pagination.initiate();
            pagination.applyBookLayout();
            jQuery("#pagination-contents").addClass('user-contents');
            jQuery('head title').html(jQuery('#document-title').text());
        }
    }, {
        key: "setDocumentStyle",
        value: function setDocumentStyle() {
            var theValue = this.theBook.settings.documentstyle;
            var documentStyleLink = document.getElementById('document-style-link'),
                newDocumentStyleLink = document.createElement('link');
            newDocumentStyleLink.setAttribute("rel", "stylesheet");
            newDocumentStyleLink.setAttribute("type", "text/css");
            newDocumentStyleLink.setAttribute("id", "document-style-link");
            newDocumentStyleLink.setAttribute("href", staticUrl + 'css/document/' + theValue + '.css');

            documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink);
        }
    }, {
        key: "bindEvents",
        value: function bindEvents() {
            var that = this;
            jQuery(document).ready(function () {
                var pathnameParts = window.location.pathname.split('/'),
                    bookId = parseInt(pathnameParts[pathnameParts.length - 2], 10);

                that.getBookData(bookId);
            });
        }
    }]);

    return PrintBook;
})();

},{"../citations/format":3,"../exporter/json":4,"./templates":6}],6:[function(require,module,exports){
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
                <% tempNode = obj2Node(chapter.metadata.subtitle) %>\
                <% if (tempNode.textContent.length > 0) { %>\
                    <h2 class="metadata-subtitle"><%= tempNode.textContent %></h2>\
                <% } %>\
            <% } %>\
            <% if (chapter.settings["metadata-abstract"] && chapter.metadata.abstract ) { %>\
                <% tempNode = obj2Node(chapter.metadata.abstract) %>\
                <% if (tempNode.textContent.length > 0) { %>\
                    <h2 class="metadata-abstract"><%= tempNode.textContent %></h2>\
                <% } %>\
            <% } %>\
        <% } %>\
        <%= modelToViewNode(obj2Node(JSON.parse(chapter.contents))).innerHTML %>\
    </div>\
<% }); %>\
');

},{}],7:[function(require,module,exports){
"use strict";

var _printBook = require("./es6_modules/print-book/print-book");

/* Create thePrintBook and make it available to the general namespace for debugging
purposes.*/

var thePrintBook = new _printBook.PrintBook();
window.thePrintBook = thePrintBook;

},{"./es6_modules/print-book/print-book":5}]},{},[7]);

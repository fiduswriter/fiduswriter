/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit exporter.es6.js and run ./es6-transpile.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexExporter = undefined;

var _zip = require('../../exporter/zip');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Export a list of bibliography items to bibLateX and serve the file to the user as a ZIP-file.
 * @class BibLatexExporter
 * @param pks A list of pks of the bibliography items that are to be exported.
 */

var BibLatexExporter = exports.BibLatexExporter = function () {
    function BibLatexExporter(pks, aBibDB, asZip) {
        _classCallCheck(this, BibLatexExporter);

        this.pks = pks; // A list of pk values of the bibliography items to be exported.
        this.aBibDB = aBibDB; // The bibliography database to export from.
        this.asZip = asZip; // Whether or not to send a zipfile to the user.
        this.init();
    }

    _createClass(BibLatexExporter, [{
        key: 'init',
        value: function init() {
            this.bibLatexExport();

            if (this.asZip) {
                var exportObj = [{
                    'filename': 'bibliography.bib',
                    'contents': this.bibtex_str
                }];
                (0, _zip.zipFileCreator)(exportObj, [], 'bibliography.zip');
            }
        }
    }, {
        key: 'bibLatexExport',
        value: function bibLatexExport() {
            this.bibtex_array = [];
            this.bibtex_str = '';

            var len = this.pks.length;

            for (var i = 0; i < len; i++) {
                var pk = this.pks[i];
                var bib = this.aBibDB[pk];
                var bib_entry = {
                    'type': BibEntryTypes[bib['entry_type']]['biblatex'],
                    'key': bib['entry_key']
                };
                var f_values = {};
                for (var f_key in bib) {
                    if ('entry_key' == f_key || 'id' == f_key || 'entry_type' == f_key || 'entry_owner' == f_key || 0 == f_key.indexOf('bibtype') || 'entry_cat' == f_key) continue;
                    var f_value = bib[f_key];
                    if ("" == f_value) continue;
                    var f_type = BibFieldTypes[f_key]['type'];
                    if ('f_date' == f_type) {
                        var date_parts = this._reformDate(f_value, f_key);
                        for (var date_part in date_parts) {
                            f_values[date_part] = date_parts[date_part];
                        }
                        continue;
                    }
                    //f_value = this._escapeTexSpecialChars(f_value, pk)
                    f_value = this._cleanBraces(f_value, pk);
                    f_values[BibFieldTypes[f_key]['biblatex']] = f_value;
                }
                bib_entry.values = f_values;
                this.bibtex_array[this.bibtex_array.length] = bib_entry;
            }
            this.bibtex_str = this._getBibtexString(this.bibtex_array);
        }
    }, {
        key: '_reformDate',
        value: function _reformDate(the_value, type_name) {
            //reform date-field
            var dates = the_value.split('/'),
                dates_value = [],
                len = dates.length;

            for (var i = 0; i < len; i++) {
                var each_date = dates[i];
                var date_parts = each_date.split('-');
                var date_value = [];
                var len2 = date_parts.length;
                for (var j = 0; j < len2; j++) {
                    var date_part = date_parts[j];
                    if (date_part != parseInt(date_part)) {
                        break;
                    }
                    date_value[date_value.length] = date_part;
                }
                dates_value[dates_value.length] = date_value;
            }
            var value_list = {};
            var date_len = dates_value[0].length;
            if (1 < dates_value.length) date_len = Math.min(date_len, dates_value[1].length);
            if (3 == date_len) {
                the_value = dates_value[0].join('-');
                if (1 < dates_value.length) the_value += '/' + dates_value[1].join('-');
                value_list[type_name] = the_value;
            } else if ('date' == type_name) {
                var year = dates_value[0][0];
                if (1 < dates_value.length) year += '/' + dates_value[1][0];
                value_list.year = year;
                if (2 == date_len) {
                    var month = dates_value[0][1];
                    if (1 < dates_value.length) month += '/' + dates_value[1][1];
                    value_list.month = month;
                }
            } else {
                if (date_len < dates_value[0].length) dates_value[0].splice(date_len);
                the_value = dates_value[0].join('-');
                if (1 < dates_value.length) {
                    if (date_len < dates_value[1].length) dates_value[1].splice(date_len);
                    the_value += '/' + dates_value[1].join('-');
                }
                value_list[type_name] = the_value;
            }
            return value_list;
        }
    }, {
        key: '_escapeTexSpecialChars',
        value: function _escapeTexSpecialChars(the_value, pk) {
            if ('string' != typeof the_value) {
                console.log(the_value, pk);
            }
            var len = tex_special_chars.length;
            for (var i = 0; i < len; i++) {
                the_value = the_value.replace(tex_special_chars[i].unicode, tex_special_chars[i].tex);
            }
            return the_value;
        }
    }, {
        key: '_cleanBraces',
        value: function _cleanBraces(the_value, pk) {
            var openBraces = (the_value.match(/\{/g) || []).length,
                closeBraces = (the_value.match(/\}/g) || []).length;
            if (openBraces === 0 && closeBraces === 0) {
                // There are no braces, return the original value
                return the_value;
            } else if (openBraces != closeBraces) {
                // There are different amount of open and close braces, so we delete them all.
                the_value = the_value.replace(/}/g, '');
                the_value = the_value.replace(/{/g, '');
                return the_value;
            } else {
                // There are the same amount of open and close braces, but we don't know if they are in the right order.
                var braceLevel = 0,
                    len = the_value.length;
                for (var i = 0; i < len; i++) {
                    if (the_value[i] === '{') {
                        braceLevel++;
                    }
                    if (the_value[i] === '}') {
                        braceLevel--;
                    }
                    if (braceLevel < 0) {
                        // A brace was closed before it was opened. Abort and remove all the braces.
                        the_value = the_value.replace(/\}/g, '');
                        the_value = the_value.replace(/\{/g, '');
                        return the_value;
                    }
                }
                // Braces were accurate.
                return the_value;
            }
        }
    }, {
        key: '_getBibtexString',
        value: function _getBibtexString(biblist) {
            var len = biblist.length,
                str = '';
            for (var i = 0; i < len; i++) {
                if (0 < i) {
                    str += '\r\n\r\n';
                }
                var data = biblist[i];
                str += '@' + data.type + '{' + data.key;
                for (var v_key in data.values) {
                    str += ',\r\n' + v_key + ' = {' + data.values[v_key] + '}';
                }
                str += "\r\n}";
            }
            return str;
        }
    }]);

    return BibLatexExporter;
}();

},{"../../exporter/zip":8}],2:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** Parses files in BibTeX/BibLaTeX format
 * @function bibTexParser
 */

var MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

var BibLatexParser = exports.BibLatexParser = function () {
    function BibLatexParser() {
        _classCallCheck(this, BibLatexParser);

        this.pos = 0;
        this.input = "";

        this.entries = {};
        this.strings = {
            JAN: "January",
            FEB: "February",
            MAR: "March",
            APR: "April",
            MAY: "May",
            JUN: "June",
            JUL: "July",
            AUG: "August",
            SEP: "September",
            OCT: "October",
            NOV: "November",
            DEC: "December"
        };
        this.currentKey = "";
        this.currentEntry = "";
        this.currentType = "";
    }

    _createClass(BibLatexParser, [{
        key: "setInput",
        value: function setInput(t) {
            this.input = t;
        }
    }, {
        key: "getEntries",
        value: function getEntries() {
            return this.entries;
        }
    }, {
        key: "isWhitespace",
        value: function isWhitespace(s) {
            return s == ' ' || s == '\r' || s == '\t' || s == '\n';
        }
    }, {
        key: "match",
        value: function match(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                this.pos += s.length;
            } else {
                console.log("Token mismatch, expected " + s + ", found " + this.input.substring(this.pos));
            }
            this.skipWhitespace();
        }
    }, {
        key: "tryMatch",
        value: function tryMatch(s) {
            this.skipWhitespace();
            if (this.input.substring(this.pos, this.pos + s.length) == s) {
                return true;
            } else {
                return false;
            }
            this.skipWhitespace();
        }
    }, {
        key: "skipWhitespace",
        value: function skipWhitespace() {
            while (this.isWhitespace(this.input[this.pos])) {
                this.pos++;
            }
            if (this.input[this.pos] == "%") {
                while (this.input[this.pos] != "\n") {
                    this.pos++;
                }
                this.skipWhitespace();
            }
        }
    }, {
        key: "skipToNext",
        value: function skipToNext() {
            while (this.input.length > this.pos && this.input[this.pos] != "@") {
                this.pos++;
            }
            if (this.input.length == this.pos) {
                return false;
            } else {
                return true;
            }
        }
        /*
        reformNames(names) {
            //reform name
        }
         reformDates(dates) {
            //reform date
        }*/

    }, {
        key: "valueBraces",
        value: function valueBraces() {
            var bracecount = 0;
            this.match("{");
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '}' && this.input[this.pos - 1] != '\\') {
                    if (bracecount > 0) {
                        bracecount--;
                    } else {
                        var end = this.pos;
                        this.match("}");
                        return this.input.substring(start, end);
                    }
                } else if (this.input[this.pos] == '{' && this.input[this.pos - 1] != '\\') {
                    bracecount++;
                } else if (this.pos == this.input.length - 1) {
                    console.log("Unterminated value");
                }
                this.pos++;
            }
        }
    }, {
        key: "valueQuotes",
        value: function valueQuotes() {
            this.match('"');
            var start = this.pos;
            while (true) {
                if (this.input[this.pos] == '"' && this.input[this.pos - 1] != '\\') {
                    var end = this.pos;
                    this.match('"');
                    return this.input.substring(start, end);
                } else if (this.pos == this.input.length - 1) {
                    console.log("Unterminated value:" + this.input.substring(start));
                }
                this.pos++;
            }
        }
    }, {
        key: "singleValue",
        value: function singleValue() {
            var start = this.pos;
            if (this.tryMatch("{")) {
                return this.valueBraces();
            } else if (this.tryMatch('"')) {
                return this.valueQuotes();
            } else {
                var k = this.key();
                if (this.strings[k.toUpperCase()]) {
                    return this.strings[k.toUpperCase()];
                } else if (k.match("^[0-9]+$")) {
                    return k;
                } else {
                    console.log("Value unexpected:" + this.input.substring(start));
                }
            }
        }
    }, {
        key: "value",
        value: function value() {
            var values = [];
            values.push(this.singleValue());
            while (this.tryMatch("#")) {
                this.match("#");
                values.push(this.singleValue());
            }
            return values.join("");
        }
    }, {
        key: "key",
        value: function key() {
            var start = this.pos;
            while (true) {
                if (this.pos == this.input.length) {
                    console.log("Runaway key");
                    return;
                }
                if (this.input[this.pos].match("[a-zA-Z0-9_:;`\\.\\\?+/-]")) {
                    this.pos++;
                } else {
                    return this.input.substring(start, this.pos).toLowerCase();
                }
            }
        }
    }, {
        key: "keyEqualsValue",
        value: function keyEqualsValue() {
            var key = this.key();
            if (this.tryMatch("=")) {
                this.match("=");
                var val = this.value();
                return [key, val];
            } else {
                console.log("... = value expected, equals sign missing: " + this.input.substring(this.pos));
            }
        }
    }, {
        key: "keyValueList",
        value: function keyValueList() {
            var kv = this.keyEqualsValue();
            if (_.isUndefined(kv)) {
                // Entry has no fields, so we delete it.
                delete this.entries[this.currentEntry];
                return;
            }
            this.entries[this.currentEntry][kv[0]] = this.scanBibtexString(kv[1]);
            while (this.tryMatch(",")) {
                this.match(",");
                //fixes problems with commas at the end of a list
                if (this.tryMatch("}")) {
                    break;
                }
                kv = this.keyEqualsValue();
                if (typeof kv === 'undefined') {
                    $.addAlert('error', gettext('A variable could not be identified. Possible error in bibtex syntax.'));
                    break;
                }
                var val = this.scanBibtexString(kv[1]);
                switch (kv[0]) {
                    case 'date':
                    case 'month':
                    case 'year':
                        this.entries[this.currentEntry].date[kv[0]] = val;
                        break;
                    default:
                        this.entries[this.currentEntry][kv[0]] = val;
                }
            }
            var issued = this.entries[this.currentEntry].date.date;
            var dateFormat = 'd.m.Y';
            if ('undefined' == typeof issued || '' == issued) {
                if ('undefined' == typeof this.entries[this.currentEntry].date.month) {
                    issued = '';
                    dateFormat = 'Y';
                } else {
                    issued = '-' + this.entries[this.currentEntry].date.month;
                    dateFormat = 'm.Y';
                }
                if ('undefined' == typeof this.entries[this.currentEntry].date.year) {
                    issued = '';
                    dateFormat = '';
                } else {
                    issued = this.entries[this.currentEntry].date.year + issued;
                }
            } else {
                if (issued.indexOf('/') !== -1) {
                    // TODO: handle dates that have a from/to value
                    issued = issued.split('/')[0];
                }
                var dateDividers = issued.match(/-/g);
                if (!dateDividers) {
                    dateFormat = 'Y';
                } else if (1 === dateDividers.length) {
                    dateFormat = 'm.Y';
                }
            }
            issued = new Date(issued);
            if ('Invalid Date' == issued) {
                dateFormat = '';
            } else {
                dateFormat = dateFormat.replace('d', issued.getDate());
                dateFormat = dateFormat.replace('m', MONTH_NAMES[issued.getMonth()]);
                dateFormat = dateFormat.replace('Y', issued.getFullYear());
            }
            this.entries[this.currentEntry].date = dateFormat;
            //TODO: check the value type and reform the value, if needed.
            /*
            let fType
            for(let fKey in this.entries[this.currentEntry]) {
                if('bibtype' == fKey)
                    continue
                fType = BibFieldtypes[fKey]
                if('undefined' == typeof(fType)) {
                    delete this.entries[this.currentEntry][fKey]
                    continue
                }
                fValue = this.entries[this.currentEntry][fKey]
                switch(fType) {
                    case 'l_name':
                        this.entries[this.currentEntry][fKey] = this.reformNames(fValue)
                        break
                    case 'f_date':
                        this.entries[this.currentEntry][fKey] = this.reformDates(fValue)
                        break
                }
            }
            */
        }
    }, {
        key: "entryBody",
        value: function entryBody() {
            this.currentEntry = this.key();

            this.entries[this.currentEntry] = new Object();
            this.entries[this.currentEntry].bibtype = this.currentType;
            this.entries[this.currentEntry].date = {};
            this.match(",");
            this.keyValueList();
        }
    }, {
        key: "directive",
        value: function directive() {
            this.match("@");
            this.currentType = this.key();
            return "@" + this.currentType;
        }
    }, {
        key: "string",
        value: function string() {
            var kv = this.keyEqualsValue();
            this.strings[kv[0].toUpperCase()] = kv[1];
        }
    }, {
        key: "preamble",
        value: function preamble() {
            this.value();
        }
    }, {
        key: "entry",
        value: function entry() {
            this.entryBody();
        }
    }, {
        key: "scanBibtexString",
        value: function scanBibtexString(value) {
            var len = tex_special_chars.length;
            for (var i = 0; i < len; i++) {
                var specialChar = tex_special_chars[i];
                while (-1 < value.indexOf(specialChar.tex)) {
                    value = value.replace(specialChar.tex, specialChar.unicode);
                }
            }
            // Delete multiple spaces
            value = value.replace(/ +(?= )/g, '');
            //value = value.replace(/\{(.*?)\}/g, '$1')
            return value;
        }
    }, {
        key: "bibtex",
        value: function bibtex() {
            while (this.skipToNext()) {
                var d = this.directive();
                this.match("{");
                if (d == "@string") {
                    this.string();
                } else if (d == "@preamble") {
                    this.preamble();
                } else if (d == "@comment") {
                    continue;
                } else {
                    this.entry();
                }
                this.match("}");
            }
        }
    }]);

    return BibLatexParser;
}();

},{}],3:[function(require,module,exports){
"use strict";

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.BibLatexImporter = undefined;

var _biblatexParser = require("./biblatex-parser");

var _templates = require("./templates");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** First step of the BibTeX file import. Creates a dialog box to specify upload file.
 */

var BibLatexImporter = exports.BibLatexImporter = function () {
    function BibLatexImporter() {
        _classCallCheck(this, BibLatexImporter);

        this.openDialog();
    }

    _createClass(BibLatexImporter, [{
        key: "openDialog",
        value: function openDialog() {
            var that = this;
            jQuery('body').append((0, _templates.importBibTemplate)());
            var diaButtons = {};
            diaButtons[gettext('Import')] = function () {
                var bibFile = jQuery('#bib-uploader')[0].files;
                if (0 == bibFile.length) {
                    console.log('no file found');
                    return false;
                }
                bibFile = bibFile[0];
                if (10485760 < bibFile.size) {
                    console.log('file too big');
                    return false;
                }
                $.activateWait();
                var reader = new FileReader();
                reader.onerror = function (e) {
                    console.log('error', e.target.error.code);
                };
                reader.onload = function (event) {
                    that.processFile(event.target.result);
                };
                reader.readAsText(bibFile);
                jQuery(this).dialog('close');
            };
            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog('close');
            };
            jQuery("#importbibtex").dialog({
                resizable: false,
                height: 180,
                modal: true,
                buttons: diaButtons,
                create: function create() {
                    var theDialog = jQuery(this).closest(".ui-dialog");
                    theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
                    theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
                    jQuery('#bib-uploader').bind('change', function () {
                        jQuery('#import-bib-name').html(jQuery(this).val().replace(/C:\\fakepath\\/i, ''));
                    });
                    jQuery('#import-bib-btn').bind('click', function () {
                        jQuery('#bib-uploader').trigger('click');
                    });
                },
                close: function close() {
                    jQuery("#importbibtex").dialog('destroy').remove();
                }
            });
        }

        /** Second step of the BibTeX file import. Takes a BibTeX file object, processes client side and cuts into chunks to be uploaded to the server.
         * @param e File object that is to be imported.
         */

    }, {
        key: "processFile",
        value: function processFile(file) {
            var that = this;
            var bibData = new _biblatexParser.BibLatexParser();
            bibData.setInput(file);
            bibData.bibtex();
            var bibEntries = bibData.getEntries();
            if (_.isEmpty(bibEntries)) {
                $.deactivateWait();
                $.addAlert('error', gettext('No bibliography entries could be found in import file.'));
                return;
            } else {
                (function () {
                    var processChunk = function processChunk() {
                        if (currentChunkNumber < totalChunks) {
                            var currentChunk = {};
                            for (var i = currentChunkNumber; i < currentChunkNumber + 50; i++) {
                                currentChunk[bibKeylist[i]] = bibEntries[bibKeylist[i]];
                            }
                            that.sendChunk(currentChunk, function () {
                                currentChunkNumber++;
                                processChunk();
                            });
                        } else {
                            $.deactivateWait();
                        }
                    };

                    var bibKeylist = Object.keys(bibEntries);
                    var totalChunks = Math.ceil(bibKeylist.length / 50);
                    var currentChunkNumber = 0;

                    processChunk();
                })();
            }
        }
        /** Third step of the BibTeX file import. Takes lists of bibliography entries and sends them to the server.
         * @param bibEntries The list of bibEntries received from processFile.
         * @param callback Function to be called when import to server has finished.
         *
         */

    }, {
        key: "sendChunk",
        value: function sendChunk(bibEntries, callback) {

            var postData = {
                'bibs': JSON.stringify(bibEntries)
            };

            $.ajax({
                url: '/bibliography/import_bibtex/',
                type: 'post',
                data: postData,
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {

                    bibliographyHelpers.addBibList(response.bibs);
                    var errors = response.errors,
                        warnings = response.warning,
                        len = errors.length;

                    for (var i = 0; i < len; i++) {
                        $.addAlert('error', errors[i]);
                    }
                    len = warnings.length;
                    for (var i = 0; i < len; i++) {
                        $.addAlert('warning', warnings[i]);
                    }
                },
                error: function error(jqXHR, textStatus, errorThrown) {
                    console.log(jqXHR.responseText);
                },
                complete: function complete() {
                    callback();
                }
            });
        }
    }]);

    return BibLatexImporter;
}();

},{"./biblatex-parser":2,"./templates":4}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** a template for the BibTeX import dialog */
var importBibTemplate = exports.importBibTemplate = _.template('<div id="importbibtex" title="' + gettext('Import a BibTex library') + '">\
        <form id="import-bib-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="bib-uploader" name="bib" required />\
            <span id="import-bib-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-bib-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');

},{}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Offers a file to the user as if it were downloaded.
 * @function downloadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var downloadFile = exports.downloadFile = function downloadFile(zipFilename, blob) {
    var blobURL = URL.createObjectURL(blob);
    var fakeDownloadLink = document.createElement('a');
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    fakeDownloadLink.href = blobURL;
    fakeDownloadLink.setAttribute('download', zipFilename);
    fakeDownloadLink.dispatchEvent(clickEvent);
};

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/** Dialog to add a note to a revision before saving. */
var revisionDialogTemplate = exports.revisionDialogTemplate = _.template('\
<div title="' + gettext('Revision description') + '"><p><input type="text" class="revision-note" placeholder="' + gettext('Description (optional)') + '"></p></div>');

},{}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.uploadFile = undefined;

var _uploadTemplates = require("./upload-templates");

/** Uploads a Fidus Writer document to the server.
 * @function uploadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var uploadFile = exports.uploadFile = function uploadFile(zipFilename, blob, editor) {

    var diaButtons = {};

    diaButtons[gettext("Save")] = function () {
        var data = new FormData();

        data.append('note', jQuery(this).find('.revision-note').val());
        data.append('file', blob, zipFilename);
        data.append('document_id', editor.doc.id);

        jQuery.ajax({
            url: '/document/upload/',
            data: data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            success: function success() {
                jQuery.addAlert('success', gettext('Revision saved'));
            },
            error: function error() {
                jQuery.addAlert('error', gettext('Revision could not be saved.'));
            }
        });
        jQuery(this).dialog("close");
    };

    diaButtons[gettext("Cancel")] = function () {
        jQuery(this).dialog("close");
    };

    jQuery((0, _uploadTemplates.revisionDialogTemplate)()).dialog({
        autoOpen: true,
        height: 180,
        width: 300,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        }
    });
};

},{"./upload-templates":6}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.zipFileCreator = undefined;

var _download = require("./download");

var _upload = require("./upload");

/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {string} zipFileName The name of the zip file to be created
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
 * @param {object} editor An editor instance (only for upload=true).
 */

var zipFileCreator = exports.zipFileCreator = function zipFileCreator(textFiles, httpFiles, zipFileName, mimeType, includeZips, upload, editor) {
    var zipFs = new zip.fs.FS(),
        zipDir = undefined;

    if (mimeType) {
        zipFs.root.addText('mimetype', mimeType);
    } else {
        mimeType = 'application/zip';
    }

    var createZip = function createZip() {
        for (var i = 0; i < textFiles.length; i++) {

            zipFs.root.addText(textFiles[i].filename, textFiles[i].contents);
        }

        for (var i = 0; i < httpFiles.length; i++) {

            zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[i].url);
        }

        zip.createWriter(new zip.BlobWriter(mimeType), function (writer) {

            var currentIndex = 0;

            function process(zipWriter, entry, onend, onprogress, totalSize) {
                var childIndex = 0;

                function exportChild() {
                    var child = entry.children[childIndex],
                        level = 9,
                        reader = null;

                    if (child) {
                        if (child.getFullname() === 'mimetype') {
                            level = 0; // turn compression off for mimetype file
                        }
                        if (child.hasOwnProperty('Reader')) {
                            reader = new child.Reader(child.data);
                        }

                        zipWriter.add(child.getFullname(), reader, function () {
                            currentIndex += child.uncompressedSize || 0;
                            process(zipWriter, child, function () {
                                childIndex++;
                                exportChild();
                            }, onprogress, totalSize);
                        }, function (index) {
                            if (onprogress) onprogress(currentIndex + index, totalSize);
                        }, {
                            directory: child.directory,
                            version: child.zipVersion,
                            level: level
                        });
                    } else {
                        onend();
                    }
                }

                exportChild();
            }

            process(writer, zipFs.root, function () {
                writer.close(function (blob) {
                    if (upload) {
                        (0, _upload.uploadFile)(zipFileName, blob, editor);
                    } else {
                        (0, _download.downloadFile)(zipFileName, blob);
                    }
                });
            });
        });
    };

    if (includeZips) {
        (function () {
            var i = 0;
            var includeZipLoop = function includeZipLoop() {
                // for (i = 0; i < includeZips.length; i++) {
                if (i === includeZips.length) {
                    createZip();
                } else {
                    if (includeZips[i].directory === '') {
                        zipDir = zipFs.root;
                    } else {
                        zipDir = zipFs.root.addDirectory(includeZips[i].directory);
                    }
                    zipDir.importHttpContent(includeZips[i].url, false, function () {
                        i++;
                        includeZipLoop();
                    });
                }
            };
            includeZipLoop();
        })();
    } else {
        createZip();
    }
};

},{"./download":5,"./upload":7}],9:[function(require,module,exports){
"use strict";

var _biblatex = require("./es6_modules/bibliography/exporter/biblatex");

var _biblatex2 = require("./es6_modules/bibliography/importer/biblatex");

window.BibLatexExporter = _biblatex.BibLatexExporter;
window.BibLatexImporter = _biblatex2.BibLatexImporter;

},{"./es6_modules/bibliography/exporter/biblatex":1,"./es6_modules/bibliography/importer/biblatex":3}]},{},[9]);

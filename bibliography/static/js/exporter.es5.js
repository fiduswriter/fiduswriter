/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit exporter.es6.js and run ./es6-compiler.sh */
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

},{"../../exporter/zip":5}],2:[function(require,module,exports){
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

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/** Dialog to add a note to a revision before saving. */
var revisionDialogTemplate = exports.revisionDialogTemplate = _.template('\
<div title="' + gettext('Revision description') + '"><p><input type="text" class="revision-note" placeholder="' + gettext('Description (optional)') + '"></p></div>');

},{}],4:[function(require,module,exports){
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

},{"./upload-templates":3}],5:[function(require,module,exports){
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

},{"./download":2,"./upload":4}],6:[function(require,module,exports){
"use strict";

var _biblatex = require("./es6_modules/bibliography/exporter/biblatex");

window.BibLatexExporter = _biblatex.BibLatexExporter;

},{"./es6_modules/bibliography/exporter/biblatex":1}]},{},[6]);

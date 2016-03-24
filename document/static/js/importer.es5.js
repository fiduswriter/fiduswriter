/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit importer.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{}],2:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImportFidusFile = undefined;

var _native = require('./native');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
var FW_FILETYPE_VERSION = 1.2,
    MIN_FW_FILETYPE_VERSION = 1.1,
    MAX_FW_FILETYPE_VERSION = 1.2;

var ImportFidusFile = exports.ImportFidusFile = (function () {

    /* Process a packaged Fidus File, either through user upload, or by reloading
      a saved revision which was saved in the same ZIP-baseformat. */

    function ImportFidusFile(file, user, check, callback) {
        _classCallCheck(this, ImportFidusFile);

        this.file = file;
        this.user = user;
        this.callback = callback;
        this.check = check; // Whether the file needs to be checked for compliance with ZIP-format
        this.init();
    }

    _createClass(ImportFidusFile, [{
        key: 'init',
        value: function init() {
            var that = this;
            if (this.check === false) {
                this.initZipFileRead();
            }
            // use a BlobReader to read the zip from a Blob object
            var reader = new FileReader();
            reader.onloadend = function () {
                if (reader.result.length > 60 && reader.result.substring(0, 2) == 'PK') {
                    that.initZipFileRead();
                } else {
                    // The file is not a Fidus Writer file.
                    that.callback(false, gettext('The uploaded file does not appear to be a Fidus Writer file.'));
                    return;
                }
            };
            reader.readAsText(this.file);
        }
    }, {
        key: 'initZipFileRead',
        value: function initZipFileRead() {
            var that = this;

            zip.createReader(new zip.BlobReader(that.file), function (reader) {
                // get all entries from the zip

                reader.getEntries(function (entries) {

                    if (entries.length) {
                        (function () {
                            var getEntry = function getEntry() {
                                if (counter < that.textFiles.length) {
                                    _.findWhere(entries, that.textFiles[counter]).getData(new zip.TextWriter(), function (text) {
                                        that.textFiles[counter]['contents'] = text;
                                        counter++;
                                        getEntry();
                                    });
                                } else {
                                    that.processFidusFile();
                                }
                            };

                            that.entries = entries;

                            that.textFiles = [{
                                filename: 'mimetype'
                            }, {
                                filename: 'filetype-version'
                            }, {
                                filename: 'document.json'
                            }, {
                                filename: 'images.json'
                            }, {
                                filename: 'bibliography.json'
                            }];

                            var counter = 0;

                            getEntry();
                        })();
                    }
                });
            }, function (error) {
                this.callback(false, gettext('An error occured during file read.'));
            });
        }
    }, {
        key: 'processFidusFile',
        value: function processFidusFile() {
            var filetypeVersion = parseFloat(_.findWhere(this.textFiles, {
                filename: 'filetype-version'
            }).contents, 10),
                mimeType = _.findWhere(this.textFiles, {
                filename: 'mimetype'
            }).contents;
            if (mimeType === 'application/fidus+zip' && filetypeVersion >= MIN_FW_FILETYPE_VERSION && filetypeVersion <= MAX_FW_FILETYPE_VERSION) {
                // This seems to be a valid fidus file with current version number.
                var shrunkBibDB = JSON.parse(_.findWhere(this.textFiles, {
                    filename: 'bibliography.json'
                }).contents);
                var shrunkImageDB = JSON.parse(_.findWhere(this.textFiles, {
                    filename: 'images.json'
                }).contents);
                var aDocument = JSON.parse(_.findWhere(this.textFiles, {
                    filename: 'document.json'
                }).contents);

                return new _native.ImportNative(aDocument, shrunkBibDB, shrunkImageDB, this.entries, this.user, this.callback);
            } else {
                // The file is not a Fidus Writer file.
                this.callback(false, gettext('The uploaded file does not appear to be of the version used on this server: ') + FW_FILETYPE_VERSION);
            }
        }
    }]);

    return ImportFidusFile;
})();

},{"./native":3}],3:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ImportNative = undefined;

var _json = require('../exporter/json');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ImportNative = exports.ImportNative = (function () {
    function ImportNative(aDocument, aBibDB, anImageDB, entries, user, callback) {
        _classCallCheck(this, ImportNative);

        this.aDocument = aDocument;
        this.aBibDB = aBibDB;
        this.anImageDB = anImageDB;
        this.entries = entries;
        this.user = user;
        this.callback = callback;
        this.getDBs();
    }

    _createClass(ImportNative, [{
        key: 'getDBs',
        value: function getDBs() {
            var that = this;
            // get BibDB and ImageDB if we don't have them already. Then invoke the native importer.
            if ('undefined' === typeof BibDB) {
                bibliographyHelpers.getBibDB(function () {
                    if ('undefined' === typeof ImageDB) {
                        usermediaHelpers.getImageDB(function () {
                            that.importNative();
                        });
                    } else {
                        that.importNative();
                    }
                });
            } else if ('undefined' === typeof ImageDB) {
                usermediaHelpers.getImageDB(function () {
                    that.importNative();
                });
            } else {
                that.importNative();
            }
        }
    }, {
        key: 'importNative',
        value: function importNative() {
            var that = this;
            var BibTranslationTable = {},
                newBibEntries = [],
                shrunkImageDBObject = {},
                ImageTranslationTable = [],
                newImageEntries = [],
                simplifiedShrunkImageDB = [];

            // Add the id to each object in the BibDB to be able to look it up when comparing to this.aBibDB below
            for (var key in BibDB) {
                BibDB[key]['id'] = key;
            }
            for (var key in this.aBibDB) {
                //this.aBibDB[key]['entry_type']=_.findWhere(BibEntryTypes,{name:this.aBibDB[key]['bibtype']}).id
                //delete this.aBibDB[key].bibtype
                var matchEntries = _.where(BibDB, this.aBibDB[key]);

                if (0 === matchEntries.length) {
                    //create new
                    newBibEntries.push({
                        oldId: key,
                        oldEntryKey: this.aBibDB[key].entry_key,
                        entry: this.aBibDB[key]
                    });
                } else if (1 === matchEntries.length && parseInt(key) !== matchEntries[0].id) {
                    BibTranslationTable[parseInt(key)] = matchEntries[0].id;
                } else if (1 < matchEntries.length) {
                    if (!_.findWhere(matchEntries, {
                        id: parseInt(key)
                    })) {
                        // There are several matches, and none of the matches have the same id as the key in this.aBibDB.
                        // We now pick the first match.
                        // TODO: Figure out if this behavior is correct.
                        BibTranslationTable[parseInt(key)] = matchEntries[0].id;
                    }
                }
            }

            // Remove the id values again
            for (var key in BibDB) {
                delete BibDB[key].id;
            }

            // We need to remove the pk from the entry in the this.anImageDB so that we also get matches with this.entries with other pk values.
            // We therefore convert to an associative array/object.
            for (var key in this.anImageDB) {
                simplifiedShrunkImageDB.push(_.omit(this.anImageDB[key], 'image', 'thumbnail', 'cats', 'added'));
            }

            for (var image in simplifiedShrunkImageDB) {
                shrunkImageDBObject[simplifiedShrunkImageDB[image].pk] = simplifiedShrunkImageDB[image];
                delete shrunkImageDBObject[simplifiedShrunkImageDB[image].pk].pk;
            }

            for (var key in shrunkImageDBObject) {
                var matchEntries = _.where(ImageDB, shrunkImageDBObject[key]);
                if (0 === matchEntries.length) {
                    //create new
                    var sIDBEntry = _.findWhere(this.anImageDB, {
                        pk: parseInt(key)
                    });
                    newImageEntries.push({
                        oldId: parseInt(key),
                        oldUrl: sIDBEntry.image,
                        title: sIDBEntry.title,
                        file_type: sIDBEntry.file_type,
                        checksum: sIDBEntry.checksum
                    });
                } else if (1 === matchEntries.length && parseInt(key) !== matchEntries[0].pk) {
                    ImageTranslationTable.push({
                        oldId: parseInt(key),
                        newId: matchEntries[0].pk,
                        oldUrl: _.findWhere(this.anImageDB, {
                            pk: parseInt(key)
                        }).image,
                        newUrl: matchEntries[0].image
                    });
                } else if (1 < matchEntries.length) {
                    if (!_.findWhere(matchEntries, {
                        pk: parseInt(key)
                    })) {
                        // There are several matches, and none of the matches have the same id as the key in this.anImageDB.
                        // We now pick the first match.
                        // TODO: Figure out if this behavior is correct.
                        ImageTranslationTable.push({
                            oldId: key,
                            newId: matchEntries[0].pk,
                            oldUrl: _.findWhere(this.anImageDB, {
                                pk: parseInt(key)
                            }).image,
                            newUrl: matchEntries[0].image
                        });
                    }
                }
            }

            if (newBibEntries.length !== 0 || newImageEntries.length !== 0) {
                // We need to create new entries in the DB for images and/or bibliography items.
                getImageData(that.aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries, this.entries);
            } else if (!jQuery.isEmptyObject(BibTranslationTable) || !jQuery.isEmptyObject(ImageTranslationTable)) {
                // We need to change some reference numbers in the document contents
                translateReferenceIds(BibTranslationTable, ImageTranslationTable);
            } else {
                // We are good to go. All the used images and bibliography entries exist in the DB for this user with the same numbers.
                // We can go ahead and create the new document entry in the bibliography without any changes.
                this.createNewDocument();
            }
        }
    }, {
        key: 'getImageData',
        value: function getImageData(BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries, entries) {
            var that = this,
                counter = 0;

            function getImageZipEntry() {
                if (counter < newImageEntries.length) {
                    _.findWhere(entries, {
                        filename: newImageEntries[counter].oldUrl.split('/').pop()
                    }).getData(new zip.BlobWriter(newImageEntries[counter].file_type), function (file) {
                        newImageEntries[counter]['file'] = file;
                        counter++;
                        getImageZipEntry();
                    });
                } else {
                    that.sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries);
                }
            }

            function getImageUrlEntry() {
                if (counter < newImageEntries.length) {
                    var getUrl = _.findWhere(entries, {
                        filename: newImageEntries[counter].oldUrl.split('/').pop()
                    }).url;
                    var xhr = new XMLHttpRequest();
                    xhr.open('GET', getUrl, true);
                    xhr.responseType = 'blob';

                    xhr.onload = function (e) {
                        if (this.status == 200) {
                            // Note: .response instead of .responseText
                            newImageEntries[counter]['file'] = new Blob([this.response], {
                                type: newImageEntries[counter].file_type
                            });
                            counter++;
                            getImageUrlEntry();
                        }
                    };

                    xhr.send();
                } else {
                    that.sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries);
                }
            }
            if (entries.length > 0) {
                if (entries[0].hasOwnProperty('url')) {
                    getImageUrlEntry();
                } else {
                    getImageZipEntry();
                }
            }
        }
    }, {
        key: 'translateReferenceIds',
        value: function translateReferenceIds(BibTranslationTable, ImageTranslationTable) {
            var contents = (0, _json.obj2Node)(this.aDocument.contents);
            jQuery(contents).find('img').each(function () {
                var translationEntry = _.findWhere(ImageTranslationTable, {
                    oldUrl: jQuery(this).attr('src')
                });
                if (translationEntry) {
                    jQuery(this).attr('src', translationEntry.newUrl);
                }
            });
            jQuery(contents).find('figure').each(function () {
                var translationEntry = _.findWhere(ImageTranslationTable, {
                    oldId: parseInt(jQuery(this).attr('data-image'))
                });
                if (translationEntry) {
                    jQuery(this).attr('data-image', translationEntry.newId);
                }
            });
            jQuery(contents).find('.citation').each(function () {
                var citekeys = jQuery(this).attr('data-bib-entry').split(',');
                for (var i = 0; i < citekeys.length; i++) {
                    if (citekeys[i] in BibTranslationTable) {
                        citekeys[i] = BibTranslationTable[citekeys[i]];
                    }
                }
                jQuery(this).attr('data-bib-entry', citekeys.join(','));
            });

            this.aDocument.contents = (0, _json.node2Obj)(contents);

            this.createNewDocument();
        }
    }, {
        key: 'sendNewImageAndBibEntries',
        value: function sendNewImageAndBibEntries(BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries) {
            var that = this,
                counter = 0;

            function sendImage() {
                if (counter < newImageEntries.length) {
                    var formValues = new FormData();
                    formValues.append('id', 0);
                    formValues.append('title', newImageEntries[counter].title);
                    formValues.append('imageCats', '');
                    formValues.append('image', newImageEntries[counter].file, newImageEntries[counter].oldUrl.split('/').pop());
                    formValues.append('checksum', newImageEntries[counter].checksum), jQuery.ajax({
                        url: '/usermedia/save/',
                        data: formValues,
                        type: 'POST',
                        dataType: 'json',
                        success: function success(response, textStatus, jqXHR) {
                            ImageDB[response.values.pk] = response.values;
                            var imageTranslation = {};
                            imageTranslation.oldUrl = newImageEntries[counter].oldUrl;
                            imageTranslation.oldId = newImageEntries[counter].oldId;
                            imageTranslation.newUrl = response.values.image;
                            imageTranslation.newId = response.values.pk;
                            ImageTranslationTable.push(imageTranslation);
                            counter++;
                            sendImage();
                        },
                        error: function error() {
                            jQuery.addAlert('error', gettext('Could not save ') + newImageEntries[counter].title);
                        },
                        complete: function complete() {},
                        cache: false,
                        contentType: false,
                        processData: false
                    });
                } else {
                    sendBibItems();
                }
            }

            function sendBibItems() {

                if (newBibEntries.length > 0) {
                    var bibEntries = _.pluck(newBibEntries, 'entry'),
                        bibDict = {};

                    for (var i = 0; i < bibEntries.length; i++) {
                        bibEntries[i]['bibtype'] = BibEntryTypes[bibEntries[i]['entry_type']].name;
                        bibDict[bibEntries[i]['entry_key']] = bibEntries[i];
                        delete bibDict[bibEntries[i]['entry_key']].entry_type;

                        delete bibDict[bibEntries[i]['entry_key']].entry_cat;
                        delete bibDict[bibEntries[i]['entry_key']].entry_key;
                    }
                    jQuery.ajax({
                        url: '/bibliography/import_bibtex/',
                        data: {
                            bibs: JSON.stringify(bibDict)
                        },
                        type: 'POST',
                        dataType: 'json',
                        success: function success(response, textStatus, jqXHR) {
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
                            _.each(response.key_translations, function (newKey, oldKey) {
                                var newID = _.findWhere(response.bibs, { entry_key: newKey }).id,
                                    oldID = _.findWhere(newBibEntries, { oldEntryKey: oldKey }).oldId;
                                BibTranslationTable[oldID] = newID;
                            });
                            bibliographyHelpers.addBibList(response.bibs);
                            that.translateReferenceIds(BibTranslationTable, ImageTranslationTable);
                        },
                        error: function error() {
                            console.log(jqXHR.responseText);
                        },
                        complete: function complete() {}
                    });
                } else {
                    that.translateReferenceIds(BibTranslationTable, ImageTranslationTable);
                }
            }

            sendImage();
        }
    }, {
        key: 'createNewDocument',
        value: function createNewDocument() {
            var that = this;
            var postData = {
                title: this.aDocument.title,
                contents: JSON.stringify(this.aDocument.contents),
                settings: JSON.stringify(this.aDocument.settings),
                metadata: JSON.stringify(this.aDocument.metadata)
            };
            jQuery.ajax({
                url: '/document/import/',
                data: postData,
                type: 'POST',
                dataType: 'json',
                success: function success(data, textStatus, jqXHR) {
                    var aDocumentValues = {
                        last_diffs: [],
                        is_owner: true,
                        rights: 'w',
                        changed: false,
                        titleChanged: false
                    };
                    that.aDocument.owner = {
                        id: that.user.id,
                        name: that.user.name,
                        avatar: that.user.avatar
                    };
                    that.aDocument.id = data['document_id'];
                    that.aDocument.version = 0;
                    that.aDocument.comment_version = 0;
                    that.aDocument.added = data['added'];
                    that.aDocument.updated = data['updated'];
                    that.aDocument.revisions = [];
                    return that.callback(true, {
                        aDocument: that.aDocument,
                        aDocumentValues: aDocumentValues
                    });
                },
                error: function error() {
                    that.callback(false, gettext('Could not save ') + that.aDocument.title);
                }
            });
        }
    }]);

    return ImportNative;
})();

},{"../exporter/json":1}],4:[function(require,module,exports){
"use strict";

var _file = require("./es6_modules/importer/file");

var importer = {
    ImportFidusFile: _file.ImportFidusFile
};

//importer.initZipFileRead = initZipFileRead
//importer.init = init

window.importer = importer;

},{"./es6_modules/importer/file":2}]},{},[4]);

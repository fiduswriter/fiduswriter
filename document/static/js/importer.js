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
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.importNative = exports.translateReferenceIds = undefined;

var _processFile = require("./process-file");

var _save = require("./save");

var _json = require("../exporter/json");

var translateReferenceIds = exports.translateReferenceIds = function translateReferenceIds(aDocument, BibTranslationTable, ImageTranslationTable) {
    var contents = (0, _json.obj2Node)(aDocument.contents);
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

    aDocument.contents = (0, _json.node2Obj)(contents);

    (0, _save.createNewDocument)(aDocument);
};

var importNative = exports.importNative = function importNative(aDocument, shrunkBibDB, shrunkImageDB, entries) {
    var BibTranslationTable = {},
        newBibEntries = [],
        shrunkImageDBObject = {},
        ImageTranslationTable = [],
        newImageEntries = [],
        simplifiedShrunkImageDB = [];

    // Add the id to each object in the BibDB to be able to look it up when comparing to shrunkBibDB below
    for (var key in BibDB) {
        BibDB[key]['id'] = key;
    }
    for (var key in shrunkBibDB) {
        //shrunkBibDB[key]['entry_type']=_.findWhere(BibEntryTypes,{name:shrunkBibDB[key]['bibtype']}).id
        //delete shrunkBibDB[key].bibtype
        var matchEntries = _.where(BibDB, shrunkBibDB[key]);

        if (0 === matchEntries.length) {
            //create new
            newBibEntries.push({
                oldId: key,
                oldEntryKey: shrunkBibDB[key].entry_key,
                entry: shrunkBibDB[key]
            });
        } else if (1 === matchEntries.length && parseInt(key) !== matchEntries[0].id) {
            BibTranslationTable[parseInt(key)] = matchEntries[0].id;
        } else if (1 < matchEntries.length) {
            if (!_.findWhere(matchEntries, {
                id: parseInt(key)
            })) {
                // There are several matches, and none of the matches have the same id as the key in shrunkBibDB.
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

    // We need to remove the pk from the entry in the shrunkImageDB so that we also get matches with entries with other pk values.
    // We therefore convert to an associative array/object.
    for (var key in shrunkImageDB) {
        simplifiedShrunkImageDB.push(_.omit(shrunkImageDB[key], 'image', 'thumbnail', 'cats', 'added'));
    }

    for (var image in simplifiedShrunkImageDB) {
        shrunkImageDBObject[simplifiedShrunkImageDB[image].pk] = simplifiedShrunkImageDB[image];
        delete shrunkImageDBObject[simplifiedShrunkImageDB[image].pk].pk;
    }

    for (var key in shrunkImageDBObject) {
        var matchEntries = _.where(ImageDB, shrunkImageDBObject[key]);
        if (0 === matchEntries.length) {
            //create new
            var sIDBEntry = _.findWhere(shrunkImageDB, {
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
                oldUrl: _.findWhere(shrunkImageDB, {
                    pk: parseInt(key)
                }).image,
                newUrl: matchEntries[0].image
            });
        } else if (1 < matchEntries.length) {
            if (!_.findWhere(matchEntries, {
                pk: parseInt(key)
            })) {
                // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
                // We now pick the first match.
                // TODO: Figure out if this behavior is correct.
                ImageTranslationTable.push({
                    oldId: key,
                    newId: matchEntries[0].pk,
                    oldUrl: _.findWhere(shrunkImageDB, {
                        pk: parseInt(key)
                    }).image,
                    newUrl: matchEntries[0].image
                });
            }
        }
    }

    if (newBibEntries.length !== 0 || newImageEntries.length !== 0) {
        // We need to create new entries in the DB for images and/or bibliography items.
        (0, _processFile.getImageData)(aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries, entries);
    } else if (!jQuery.isEmptyObject(BibTranslationTable) || !jQuery.isEmptyObject(ImageTranslationTable)) {
        // We need to change some reference numbers in the document contents
        translateReferenceIds(aDocument, BibTranslationTable, ImageTranslationTable);
    } else {
        // We are good to go. All the used images and bibliography entries exist in the DB for this user with the same numbers.
        // We can go ahead and create the new document entry in the bibliography without any changes.
        (0, _save.createNewDocument)(aDocument);
    }
};

},{"../exporter/json":1,"./process-file":4,"./save":5}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getDBs = undefined;

var _compareDBs = require('./compare-DBs');

var getDBs = exports.getDBs = function getDBs(aDocument, shrunkBibDB, shrunkImageDB, entries) {
    // get BibDB and ImageDB if we don't have them already. Then invoke the native importer.
    if ('undefined' === typeof BibDB) {
        bibliographyHelpers.getBibDB(function () {
            if ('undefined' === typeof ImageDB) {
                usermediaHelpers.getImageDB(function () {
                    (0, _compareDBs.importNative)(aDocument, shrunkBibDB, shrunkImageDB, entries);
                });
            } else {
                (0, _compareDBs.importNative)(aDocument, shrunkBibDB, shrunkImageDB, entries);
            }
        });
    } else if ('undefined' === typeof ImageDB) {
        usermediaHelpers.getImageDB(function () {
            (0, _compareDBs.importNative)(aDocument, shrunkBibDB, shrunkImageDB, entries);
        });
    } else {
        (0, _compareDBs.importNative)(aDocument, shrunkBibDB, shrunkImageDB, entries);
    }
};

},{"./compare-DBs":2}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getImageData = exports.processFidusFile = undefined;

var _getExtraData = require("./get-extra-data");

var _sendExtraData = require("./send-extra-data");

/** The current Fidus Writer filetype version. The importer will not import from
 * a different version and the exporter will include this number in all exports.
 */
var FW_FILETYPE_VERSION = 1.2,
    MIN_FW_FILETYPE_VERSION = 1.1,
    MAX_FW_FILETYPE_VERSION = 1.2;

var processFidusFile = exports.processFidusFile = function processFidusFile(textFiles, entries) {

    var filetypeVersion = parseFloat(_.findWhere(textFiles, {
        filename: 'filetype-version'
    }).contents, 10),
        mimeType = _.findWhere(textFiles, {
        filename: 'mimetype'
    }).contents;
    if (mimeType === 'application/fidus+zip' && filetypeVersion >= MIN_FW_FILETYPE_VERSION && filetypeVersion <= MAX_FW_FILETYPE_VERSION) {
        // This seems to be a valid fidus file with current version number.
        var shrunkBibDB = JSON.parse(_.findWhere(textFiles, {
            filename: 'bibliography.json'
        }).contents);
        var shrunkImageDB = JSON.parse(_.findWhere(textFiles, {
            filename: 'images.json'
        }).contents);
        var aDocument = JSON.parse(_.findWhere(textFiles, {
            filename: 'document.json'
        }).contents);

        (0, _getExtraData.getDBs)(aDocument, shrunkBibDB, shrunkImageDB, entries);
    } else {
        // The file is not a Fidus Writer file.
        $.deactivateWait();
        $.addAlert('error', gettext('The uploaded file does not appear to be of the version used on this server: ') + FW_FILETYPE_VERSION);
        return;
    }
};

var getImageData = exports.getImageData = function getImageData(aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries, entries) {
    var counter = 0;

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
            (0, _sendExtraData.sendNewImageAndBibEntries)(aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries);
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
            (0, _sendExtraData.sendNewImageAndBibEntries)(aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries);
        }
    }
    if (entries.length > 0) {
        if (entries[0].hasOwnProperty('url')) {
            getImageUrlEntry();
        } else {
            getImageZipEntry();
        }
    }
};

},{"./get-extra-data":3,"./send-extra-data":6}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var createNewDocument = exports.createNewDocument = function createNewDocument(aDocument) {
    var postData = {
        title: aDocument.title,
        contents: JSON.stringify(aDocument.contents),
        settings: JSON.stringify(aDocument.settings),
        metadata: JSON.stringify(aDocument.metadata)
    };
    jQuery.ajax({
        url: '/document/import/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        success: function success(data, textStatus, jqXHR) {
            jQuery.addAlert('info', aDocument.title + gettext(' successfully imported.'));
            var aDocumentValues = {
                last_diffs: [],
                is_owner: true,
                rights: 'w',
                changed: false,
                titleChanged: false
            };
            aDocument.id = data['document_id'];
            if (window.theEditor) {
                aDocument.owner = {
                    id: theEditor.user.id,
                    name: theEditor.user.name,
                    avatar: theEditor.user.avatar
                };
            } else {
                aDocument.owner = {
                    id: theUser.id,
                    name: theUser.name,
                    avatar: theUser.avatar
                };
            }
            aDocument.version = 0;
            aDocument.comment_version = 0;
            aDocument.added = data['added'];
            aDocument.updated = data['updated'];
            aDocument.revisions = [];
            if (typeof theDocumentList !== 'undefined') {
                theDocumentList.push(aDocument);
                documentHelpers.stopDocumentTable();
                jQuery('#document-table tbody').append(tmp_documents_list_item({
                    aDocument: aDocument
                }));
                documentHelpers.startDocumentTable();
            } else if (typeof theEditor !== 'undefined') {
                if (theEditor.docInfo.rights === 'r') {
                    // We only had right access to the document, so the editing elements won't show. We therefore need to reload the page to get them.
                    window.location = '/document/' + aDocument.id + '/';
                } else {
                    window.theEditor.doc = aDocument;
                    window.theEditor.docInfo = aDocumentValues;
                    window.history.pushState("", "", "/document/" + theEditor.doc.id + "/");
                }
            }
        },
        error: function error() {
            jQuery.addAlert('error', gettext('Could not save ') + aDocument.title);
        },
        complete: function complete() {
            jQuery.deactivateWait();
        }
    });
};

},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.sendNewImageAndBibEntries = undefined;

var _compareDBs = require('./compare-DBs');

var sendNewImageAndBibEntries = exports.sendNewImageAndBibEntries = function sendNewImageAndBibEntries(aDocument, BibTranslationTable, ImageTranslationTable, newBibEntries, newImageEntries) {
    var counter = 0;

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
                    (0, _compareDBs.translateReferenceIds)(aDocument, BibTranslationTable, ImageTranslationTable);
                },
                error: function error() {
                    console.log(jqXHR.responseText);
                },
                complete: function complete() {}
            });
        } else {
            (0, _compareDBs.translateReferenceIds)(aDocument, BibTranslationTable, ImageTranslationTable);
        }
    }

    sendImage();
};

},{"./compare-DBs":2}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.init = exports.initZipFileRead = undefined;

var _processFile = require('./process-file');

var initZipFileRead = exports.initZipFileRead = function initZipFileRead(file) {

    zip.createReader(new zip.BlobReader(file), function (reader) {
        // get all entries from the zip

        reader.getEntries(function (entries) {

            if (entries.length) {
                (function () {
                    var getEntry = function getEntry() {
                        if (counter < textFiles.length) {
                            _.findWhere(entries, textFiles[counter]).getData(new zip.TextWriter(), function (text) {
                                textFiles[counter]['contents'] = text;
                                counter++;
                                getEntry();
                            });
                        } else {
                            (0, _processFile.processFidusFile)(textFiles, entries);
                        }
                    };

                    var textFiles = [{
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
        // onerror callback
    });
};

var init = exports.init = function init(file) {
    // use a BlobReader to read the zip from a Blob object

    var reader = new FileReader();
    reader.onloadend = function () {
        if (reader.result.length > 60 && reader.result.substring(0, 2) == 'PK' && reader.result.substring(38, 59) == 'application/fidus+zip') {
            initZipFileRead(file);
        } else {
            // The file is not a Fidus Writer file.
            $.deactivateWait();
            $.addAlert('error', gettext('The uploaded file does not appear to be a Fidus Writer file.'));
            return;
        }
    };
    reader.readAsText(file);
};

},{"./process-file":4}],8:[function(require,module,exports){
"use strict";

var _zip = require("./es6_modules/importer/zip");

var importer = {};

importer.initZipFileRead = _zip.initZipFileRead;
importer.init = _zip.init;

window.importer = importer;

},{"./es6_modules/importer/zip":7}]},{},[8]);

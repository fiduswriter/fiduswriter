/**
 * @file Handles import of Fidus Writer document files.
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
/** The current Fidus Writer filetype version. The importer will not import from a different version and the exporter will include this number in all exports.
 */
var FW_FILETYPE_VERSION = "1.1";

(function () {
    var exports = this,
  /**
  * Functions to import Fidus Writer documents. TODO
  * @namespace importer
  */
        importer = {};

    importer.processFidusFile = function (textFiles, entries) {
        if (_.findWhere(textFiles, {
                    filename: 'mimetype'
                }).contents === 'application/fidus+zip' &&
            _.findWhere(textFiles, {
                    filename: 'filetype-version'
                }).contents === FW_FILETYPE_VERSION) {
            // This seems to be a valid fidus file with current version number.
            var shrunkBibDB = jQuery.parseJSON(
                _.findWhere(
                    textFiles, {
                        filename: 'bibliography.json'
                    }).contents);
            var shrunkImageDB = jQuery.parseJSON(_.findWhere(textFiles, {
                        filename: 'images.json'
                    }).contents);
            var aDocument = jQuery.parseJSON(_.findWhere(textFiles, {
                        filename: 'document.json'
                    }).contents);

            importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB, entries);

        } else {
                // The file is not a Fidus Writer file.
                $.deactivateWait();
                $.addAlert('error', gettext('The uploaded file does not appear to be of the version used on this server: ')+FW_FILETYPE_VERSION);
                return;
            }
    };

    importer.getDBs = function (aDocument, shrunkBibDB, shrunkImageDB,
        entries) {
        // get BibDB and ImageDB if we don't have them already. Then invoke the native importer.
        if ('undefined' === typeof (BibDB)) {
            bibliographyHelpers.getBibDB(function () {
                if ('undefined' === typeof (ImageDB)) {
                    usermediaHelpers.getImageDB(function () {
                        importer.native(aDocument, shrunkBibDB, shrunkImageDB,
        entries);
                    });
                } else {
                    importer.native(aDocument, shrunkBibDB, shrunkImageDB,
        entries);
                }
            });
        } else if ('undefined' === typeof (ImageDB)) {
            usermediaHelpers.getImageDB(function () {
                importer.native(aDocument, shrunkBibDB, shrunkImageDB,
        entries);
            });
        } else {
            importer.native(aDocument, shrunkBibDB, shrunkImageDB,
        entries);
        }
    };

    importer.init = function (file) { // use a BlobReader to read the zip from a Blob object;

        var reader = new FileReader();
        reader.onloadend = function() {
            if (reader.result.length > 60 && reader.result.substring(0,2) == 'PK' && reader.result.substring(38,59) == 'application/fidus+zip') {
                importer.initZipFileRead(file);
            } else {
                // The file is not a Fidus Writer file.
                $.deactivateWait();
                $.addAlert('error', gettext('The uploaded file does not appear to be a Fidus Writer file.'));
                return;
            }
        };
        reader.readAsText(file);
    };

    importer.initZipFileRead = function (file) {

        zip.createReader(new zip.BlobReader(file), function (reader) {
            // get all entries from the zip

            reader.getEntries(function (entries) {

                if (entries.length) {

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
                        }
                    ];

                    var counter = 0;

                    function getEntry() {
                        if (counter < textFiles.length) {
                            _.findWhere(entries, textFiles[counter]).getData(
                                new zip.TextWriter(), function (text) {
                                    textFiles[counter]['contents'] = text;
                                    counter++;
                                    getEntry();
                                });
                        } else {
                            importer.processFidusFile(textFiles, entries);
                        }
                    }

                    getEntry();

                }
            });

        }, function (error) {
            // onerror callback
        });

    };

    importer.sendNewImageAndBibEntries = function (aDocument,
        BibTranslationTable, ImageTranslationTable, newBibEntries,
        newImageEntries) {
        var counter = 0;

        function sendImage() {
            if (counter < newImageEntries.length) {
                var formValues = new FormData();
                formValues.append('id', 0);
                formValues.append('title', newImageEntries[counter].title);
                formValues.append('imageCats', '');
                formValues.append('image', newImageEntries[counter].file,
                    newImageEntries[counter].oldUrl.split('/').pop());
                formValues.append('checksum', newImageEntries[counter].checksum),

                jQuery.ajax({
                        url: '/usermedia/save/',
                        data: formValues,
                        type: 'POST',
                        dataType: 'json',
                        success: function (response, textStatus, jqXHR) {
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
                        error: function () {
                            jQuery.addAlert('error', gettext('Could not save ') +
                                newImageEntries[counter].title);
                        },
                        complete: function () {},
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
                    i, bibDict = {};

                for (i = 0; i < bibEntries.length; i++) {
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
                        success: function (response, textStatus, jqXHR) {
                            var errors = response.errors,
                                warnings = response.warning,
                                len = errors.length,
                                i;
                            for (i = 0; i < len; i++) {
                                $.addAlert('error', errors[i]);
                            }
                            len = warnings.length;
                            for (i = 0; i < len; i++) {
                                $.addAlert('warning', warnings[i]);
                            }
                            window.bibs = response.bibs;
                            window.newBibEntries = newBibEntries;
                            _.each(response.key_translations, function(newKey,oldKey) {
                                var newID = _.findWhere(response.bibs, {entry_key: newKey}).id,
                                oldID = _.findWhere(newBibEntries, {oldEntryKey: oldKey}).oldId;
                                BibTranslationTable[oldID] = newID;
                            })

                            // for (i = 0; i < response.bib_ids.length; i++) {
                            //     BibTranslationTable[newBibEntries[i].oldId] =
                            //         response.bib_ids[i];
                            // }
                            bibliographyHelpers.addBibList(response.bibs);
                            importer.translateReferenceIds(aDocument,
                                BibTranslationTable, ImageTranslationTable);
                        },
                        error: function () {
                            console.log(jqXHR.responseText);
                        },
                        complete: function () {}
                    });
            } else {
                importer.translateReferenceIds(aDocument, BibTranslationTable,
                    ImageTranslationTable);
            }
        }

        sendImage();
    };


    importer.getImageData = function (aDocument,
        BibTranslationTable, ImageTranslationTable, newBibEntries,
        newImageEntries, entries) {
        var counter = 0;

        function getImageZipEntry() {
            if (counter < newImageEntries.length) {
                _.findWhere(entries, {
                        filename: newImageEntries[counter].oldUrl.split('/').pop()
                    }).getData(
                    new zip.BlobWriter(newImageEntries[counter].file_type), function (
                        file) {
                        newImageEntries[counter]['file'] = file;
                        counter++;
                        getImageZipEntry();
                    });
            } else {
                importer.sendNewImageAndBibEntries(aDocument,
                    BibTranslationTable, ImageTranslationTable, newBibEntries,
                    newImageEntries);
            }
        }

        function getImageUrlEntry() {
            var getUrl, xhr;
            if (counter < newImageEntries.length) {
                getUrl = _.findWhere(entries, {
                        filename: newImageEntries[counter].oldUrl.split('/').pop()
                    }).url;
                xhr = new XMLHttpRequest();
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
                importer.sendNewImageAndBibEntries(aDocument,
                    BibTranslationTable, ImageTranslationTable, newBibEntries,
                    newImageEntries);
            }
        }
        if (entries.length > 0) {
            if (entries[0].hasOwnProperty('url')) {
                getImageUrlEntry()
            } else {
                getImageZipEntry();
            }
        }

    };

    importer.translateReferenceIds = function (aDocument, BibTranslationTable,
        ImageTranslationTable) {
        var contents = exporter.obj2Node(aDocument.contents);
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
            var citekeys = jQuery(this).attr('data-bib-entry').split(','),
                i;
            for (i = 0; i < citekeys.length; i++) {
                if (citekeys[i] in BibTranslationTable) {
                    citekeys[i] = BibTranslationTable[citekeys[i]];
                }
            }
            jQuery(this).attr('data-bib-entry', citekeys.join(','));
        });

        aDocument.contents = exporter.node2Obj(contents);

        importer.createNewDocument(aDocument);

    };


    importer.createNewDocument = function (aDocument) {
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
                success: function (data, textStatus, jqXHR) {
                    var tempNode;
                    jQuery.addAlert('info', aDocument.title + gettext(
                            ' successfully imported.'));
                    aDocument.id = data['document_id'];
                    aDocument.owner = {
                        id: theUser.id,
                        name: theUser.name,
                        avatar: theUser.avatar
                    },
                    aDocument.rights = 'w';
                    aDocument.is_locked = false;
                    aDocument.is_owner = true;
                    aDocument.added = data['added'];
                    aDocument.updated = data['updated'];
                    aDocument.revisions = [];
                    if (typeof (theDocumentList) !== 'undefined') {
                        theDocumentList.push(aDocument);
                        documentHelpers.stopDocumentTable();
                        jQuery('#document-table tbody').append(
                            tmp_documents_list_item({
                                    aDocument: aDocument
                                }));
                        documentHelpers.startDocumentTable();
                    } else if (typeof (theDocument) !== 'undefined') {
                        if (theDocument.rights ==='r' || theDocument.is_locked === true) {
                            // We only had right access to the document, so the editing elements won't show. We therefore need to reload the page to get them.
                            window.location = '/document/'+aDocument.id+'/';
                        } else {
                            theDocument = aDocument;
                            tempNode = exporter.obj2Node(aDocument.contents);
                            while (tempNode.firstChild) {
                                document.getElementById('document-contents').appendChild(tempNode.firstChild);
                            }
                            window.history.pushState("", "", "/document/"+theDocument.id+"/");
                        }
                    }
                },
                error: function () {
                    jQuery.addAlert('error', gettext('Could not save ') +
                        aDocument.title);
                },
                complete: function () {
                    jQuery.deactivateWait();
                }
            });
    };

    importer.native = function (aDocument, shrunkBibDB, shrunkImageDB,
        entries) {
        var BibTranslationTable = {}, newBibEntries = [],
            shrunkImageDBObject = {}, ImageTranslationTable = [],
            newImageEntries = [],
            simplifiedShrunkImageDB = [],
            matchEntries, sIDBEntry;
        // Add the id to each object in the BibDB to be able to look it up when comparing to shrunkBibDB below;
        for (key in BibDB) {
            BibDB[key]['id'] = key;
        }
        for (key in shrunkBibDB) {
            //shrunkBibDB[key]['entry_type']=_.findWhere(BibEntryTypes,{name:shrunkBibDB[key]['bibtype']}).id;
            //delete shrunkBibDB[key].bibtype;
            matchEntries = _.where(BibDB, shrunkBibDB[key]);

            if (0 === matchEntries.length) {
                //create new
                newBibEntries.push({
                        oldId: key,
                        oldEntryKey: shrunkBibDB[key].entry_key,
                        entry: shrunkBibDB[key]
                    });
            } else if (1 === matchEntries.length && parseInt(key) !==
                matchEntries[0].id) {
                BibTranslationTable[parseInt(key)] = matchEntries[0].id;
            } else if (1 < matchEntries.length) {
                if (!(_.findWhere(matchEntries, {
                                id: parseInt(key)
                            }))) {
                    // There are several matches, and none of the matches have the same id as the key in shrunkBibDB.
                    // We now pick the first match.
                    // TODO: Figure out if this behavior is correct.
                    BibTranslationTable[parseInt(key)] = matchEntries[0].id;
                }
            }
        }
        console.log(newBibEntries);

        // Remove the id values again
        for (key in BibDB) {
            delete BibDB[key].id;
        }

        // We need to remove the pk from the entry in the shrunkImageDB so that we also get matches with entries with other pk values.
        // We therefore convert to an associative array/object.
        for (key in shrunkImageDB) {
            simplifiedShrunkImageDB.push(_.omit(shrunkImageDB[key], 'image',
                    'thumbnail', 'cats', 'added'));
        }

        for (image in simplifiedShrunkImageDB) {
            shrunkImageDBObject[simplifiedShrunkImageDB[image].pk] =
                simplifiedShrunkImageDB[image];
            delete shrunkImageDBObject[simplifiedShrunkImageDB[image].pk].pk;
        }

        for (key in shrunkImageDBObject) {
            matchEntries = _.where(ImageDB, shrunkImageDBObject[key]);
            if (0 === matchEntries.length) {
                //create new
                sIDBEntry = _.findWhere(shrunkImageDB, {
                        pk: parseInt(key)
                    })
                newImageEntries.push({
                        oldId: parseInt(key),
                        oldUrl: sIDBEntry.image,
                        title: sIDBEntry.title,
                        file_type: sIDBEntry.file_type,
                        checksum: sIDBEntry.checksum
                    });
            } else if (1 === matchEntries.length && parseInt(key) !==
                matchEntries[0].pk) {
                ImageTranslationTable.push({
                        oldId: parseInt(key),
                        newId: matchEntries[0].pk,
                        oldUrl: _.findWhere(shrunkImageDB, {
                                pk: parseInt(key)
                            }).image,
                        newUrl: matchEntries[0].image
                    });
            } else if (1 < matchEntries.length) {
                if (!(_.findWhere(matchEntries, {
                                pk: parseInt(key)
                            }))) {
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
            importer.getImageData(aDocument,
                BibTranslationTable, ImageTranslationTable, newBibEntries,
                newImageEntries, entries);
        } else if (!(jQuery.isEmptyObject(BibTranslationTable)) || !(jQuery.isEmptyObject(
                    ImageTranslationTable))) {
            // We need to change some reference numbers in the document contents
            importer.translateReferenceIds(aDocument, BibTranslationTable,
                ImageTranslationTable);
        } else {
            // We are good to go. All the used images and bibliography entries exist in the DB for this user with the same numbers.
            // We can go ahead and create the new document entry in the bibliography without any changes.
            importer.createNewDocument(aDocument);
        }

    };

    exports.importer = importer;

}).call(this);

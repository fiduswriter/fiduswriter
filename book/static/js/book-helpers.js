/**
 * @file Sets up the book overview.
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
  * Helper functions for the book overview page. TODO 
  * @namespace bookHelpers
  */
        bookHelpers = {};

    bookHelpers.deleteBook = function (id) {
        var postData = {};
        postData['id'] = id;
        $.ajax({
            url: '/book/delete/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                bookHelpers.stopBookTable();
                jQuery('#Book_' + id).detach();
                theBookList = _.reject(theBookList, function (book) {
                    return book.id == id;
                });
                bookHelpers.startBookTable();
            },
        });
    };
    bookHelpers.stopBookTable = function () {
        jQuery('#book-table').dataTable().fnDestroy();
    };

    bookHelpers.startBookTable = function () {
        // The sortable table seems not to have an option to accept new data added to the DOM. Instead we destroy and recreate it.
        jQuery('#book-table').dataTable({
            "bPaginate": false,
            "bLengthChange": false,
            "bFilter": true,
            "bInfo": false,
            "bAutoWidth": false,
            "oLanguage": {
                "sSearch": ''
            },
            "aoColumnDefs": [{
                "bSortable": false,
                "aTargets": [0, 5, 6]
            }],
        });

        jQuery('#book-table_filter input').attr('placeholder', gettext('Search for Book Title'));
        jQuery('#book-table_filter input').unbind('focus, blur');
        jQuery('#book-table_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus');
        });
        jQuery('#book-table_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus');
        });

        var autocomplete_tags = [];
        jQuery('#book-table .fw-searchable').each(function() {
            autocomplete_tags.push(this.textContent);
        });
        autocomplete_tags = _.uniq(autocomplete_tags);
        jQuery("#book-table_filter input").autocomplete({
            source: autocomplete_tags
        });
    };

    bookHelpers.deleteBookDialog = function (ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') +
            '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
            gettext('Delete the book(s)?') + '</p></div>');
        diaButtons = {};
        diaButtons[gettext('Delete')] = function () {
            for (var i = 0; i < ids.length; i++) {
                bookHelpers.deleteBook(ids[i]);
            }
            jQuery(this).dialog("close");
            $.addAlert('success', gettext('The book(s) have been deleted'));
        };

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        }

        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function () {
                jQuery("#confirmdeletion").detach();
            },
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
        });
    };

    bookHelpers.unpackBooks = function (booksFromServer) {
        // metadata and settings are stored as a json stirng in a text field on the server, so they need to be unpacked before being available.
        for (var i = 0; i < booksFromServer.length; i++) {
            booksFromServer[i].metadata = jQuery.parseJSON(booksFromServer[
                i].metadata);
            booksFromServer[i].settings = jQuery.parseJSON(booksFromServer[
                i].settings);
        }
        return booksFromServer;
    };


    bookHelpers.getBookListData = function (id) {
        $.ajax({
            url: '/book/booklist/',
            data: {},
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                theBookList = bookHelpers.unpackBooks(response.books);
                theDocumentList = response.documents;
                theTeamMembers = response.team_members;
                theAccessRights = response.access_rights;
                theUser = response.user;
                jQuery.event.trigger({
                    type: "bookDataLoaded",
                });
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {
                $.deactivateWait();
            }
        });
    };


    bookHelpers.selectCoverImageDialog = function (theBook,anImageDB) {
        var dialogHeader = gettext('Select cover image'),
            dialogBody = tmp_book_cover_image_selection({
                theBook: theBook,
                anImageDB: anImageDB
            });

        jQuery(document).on('click', '#imagelist tr', function () {
            if (jQuery(this).hasClass('checked')) {
                jQuery(this).removeClass('checked');
            } else {
                jQuery('#imagelist tr.checked').removeClass('checked');
                jQuery(this).addClass('checked');
            }
        });


        jQuery('body').append(dialogBody);

        if (theBook.cover_image) {
            jQuery('#Image_' + theBook.cover_image).addClass('checked');
        }

        jQuery('#cancelImageFigureButton').bind('click', function () {
            jQuery('#book-cover-image-selection').dialog('close');
        });

        jQuery('#selectImageFigureButton').bind('click', function () {
            if (jQuery('#imagelist tr.checked').length === 0) {
                delete theBook.cover_image;
            } else {
                theBook.cover_image = parseInt(jQuery('#imagelist tr.checked')[0].id.substring(6));
            }
            jQuery('#figure-preview-row').html(tmp_book_epub_data_cover({
                'anImageDB': anImageDB,
                'theBook': theBook
            }));
            jQuery('#book-cover-image-selection').dialog('close');
        });


        jQuery('#book-cover-image-selection').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 'auto',
            height: 'auto',
            modal: true,
            buttons: {},
            create: function () {},
            close: function () {
                jQuery(document).off('click', '#imagelist tr');
                jQuery('#selectImageFigureButton').unbind('click');
                jQuery('#cancelImageFigureButton').unbind('click');
                jQuery('#book-cover-image-selection').dialog('destroy')
                    .remove();
            }
        });
    };

    bookHelpers.editChapterDialog = function (aChapter, theBook) {
        var aDocument = _.findWhere(theDocumentList, {
            id: aChapter.text
        }),
            documentTitle = aDocument.title,
            dialogHeader, dialogBody;
        if (documentTitle.length < 0) {
            documentTitle = gettext('Untitled');
        }
        dialogHeader = gettext('Edit Chapter') + ': ' + aChapter.number +
            '. ' + documentTitle;
        dialogBody = tmp_book_chapter_dialog({
            'dialogHeader': dialogHeader,
            'aChapter': aChapter
        });

        jQuery('body').append(dialogBody);
        var diaButtons = {};
        diaButtons[gettext('Submit')] = function () {
            aChapter.part = jQuery('#book-chapter-part').val();
            jQuery('#book-chapter-list').html(tmp_book_chapter_list({
                theBook: theBook
            }));
            jQuery(this).dialog('close');
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        }
        jQuery('#book-chapter-dialog').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 300,
            height: 200,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
            close: function () {
                jQuery('#book-chapter-dialog').dialog('destroy').remove();
            }
        });

    };


    bookHelpers.save = function (theBook, theOldBook, currentDialog) {
        $.ajax({
            url: '/book/save/',
            data: {
                the_book: JSON.stringify(theBook)
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    theBook.id = response.id;
                    theBook.added = response.added;
                }
                theBook.updated = response.updated;
                if (typeof (theOldBook) != 'undefined') {
                    theBookList = _.reject(theBookList, function (book) {
                        return (book === theOldBook);
                    });
                }
                theBookList.push(theBook);
                bookHelpers.stopBookTable();
                jQuery('#book-table tbody').html(tmp_book_list());
                bookHelpers.startBookTable();
                if ((typeof (currentDialog) != 'undefined')) {
                    jQuery(currentDialog).dialog('close');
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText);
            },
            complete: function () {}
        });
    };

    bookHelpers.copy = function (theOldBook) {
        var theBook = jQuery.extend(true, {}, theOldBook);
        theBook.id = 0;
        theBook.is_owner = true;
        theBook.owner_avatar = theUser.avatar;
        theBook.owner_name = theUser.name;
        theBook.owner = theUser.id;
        theBook.rights = 'w';
        if (theOldBook.owner != theBook.owner) {
            function setCoverImage(id) {
                theBook.cover_image = id;
                bookHelpers.save(theBook);
            }
            bookHelpers.prepareCopyCoverImage(theBook.cover_image,
                theOldBook.owner, setCoverImage);
        } else {
            bookHelpers.save(theBook);
        }
    };

    bookHelpers.prepareCopyCoverImage = function (coverImage, userId,
        callback) {
        if ('undefined' === typeof (ImageDB)) {
            usermediaHelpers.getImageDB(function () {
                bookHelpers.prepareCopyCoverImage(coverImage, userId,
                    callback);
                return;
            });
        } else {
            usermediaHelpers.getAnImageDB(userId, function (anImageDB) {
                bookHelpers.copyCoverImage(anImageDB[coverImage],
                    callback);
            });
        }
    };

    bookHelpers.copyCoverImage = function (oldImageObject, callback) {
        var newImageEntry = false,
            imageTranslation = false;

        matchEntries = _.where(ImageDB, {
            checksum: oldImageObject.checksum
        });
        if (0 === matchEntries.length) {
            //create new
            newImageEntry = {
                oldUrl: oldImageObject.image,
                title: oldImageObject.title,
                file_type: oldImageObject.file_type,
                checksum: oldImageObject.checksum
            };
        } else if (1 === matchEntries.length && oldImageObject.pk !==
            matchEntries[0].pk) {
            imageTranslation = matchEntries[0].pk;
        } else if (1 < matchEntries.length) {
            if (!(_.findWhere(matchEntries, {
                pk: oldImageObject.pk
            }))) {
                // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
                // We now pick the first match.
                // TODO: Figure out if this behavior is correct.
                imageTranslation = matchEntries[0].pk;
            }
        }

        if (imageTranslation) {
            callback(imageTranslation);
        } else if (newImageEntry) {
            bookHelpers.createNewImage(newImageEntry, callback);
        } else {
            callback(oldImageObject.pk);
        }

    };

    bookHelpers.createNewImage = function (imageEntry, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', imageEntry.oldUrl, true);
        xhr.responseType = 'blob';

        xhr.onload = function (e) {
            if (this.status == 200) {
                // Note: .response instead of .responseText
                var imageFile = new Blob([this.response], {
                    type: imageEntry.file_type
                });
                var formValues = new FormData();
                formValues.append('id', 0);
                formValues.append('title', imageEntry.title);
                formValues.append('imageCats', '');
                formValues.append('image', imageFile,
                    imageEntry.oldUrl.split('/').pop());
                formValues.append('checksum', imageEntry.checksum),

                jQuery.ajax({
                    url: '/usermedia/save/',
                    data: formValues,
                    type: 'POST',
                    dataType: 'json',
                    success: function (response, textStatus, jqXHR) {
                        ImageDB[response.values.pk] = response.values;
                        callback(response.values.pk);
                    },
                    error: function () {
                        jQuery.addAlert('error', gettext(
                                'Could not save ') +
                            imageEntry.title);
                    },
                    complete: function () {},
                    cache: false,
                    contentType: false,
                    processData: false
                });
                return;
            }
        };

        xhr.send();
    };


    bookHelpers.createBookDialog = function (bookId, anImageDB) {
        var dialogHeader, dialogBody, theOldBook, theBook;

        if (bookId === 0) {
            dialogHeader = gettext('Create Book');
            theBook = {
                title: '',
                id: 0,
                chapters: [],
                is_owner: true,
                owner_avatar: theUser.avatar,
                owner_name: theUser.name,
                owner: theUser.id,
                rights: 'w',
                metadata: {},
                settings: {
                    citationstyle: 'apa',
                    documentstyle: defaultDocumentStyle,
                    papersize: 'octavo'
                }
            };
        } else {
            theOldBook = _.findWhere(theBookList, {
                id: bookId
            });
            theBook = jQuery.extend(true, {}, theOldBook);
            dialogHeader = gettext('Edit Book');
        }


        if ('undefined' === typeof (anImageDB)) {
            if ('undefined' === typeof (ImageDB) && theBook.is_owner) {
                // load the ImageDB if it is not available yet. Once done, load this function.
                usermediaHelpers.init(function () {
                    bookHelpers.createBookDialog(bookId, ImageDB);
                });
                return;
            } else if (!theBook.is_owner) {
                usermediaHelpers.getAnImageDB(theBook.owner, function (anImageDB) {
                    bookHelpers.createBookDialog(bookId, anImageDB);
                });
                return;
            } else {
                bookHelpers.createBookDialog(bookId, ImageDB);
                return;
            }
        }

        dialogBody = tmp_book_dialog({
            dialogHeader: dialogHeader,
            basicInfo: tmp_book_basic_info({
                theBook: theBook
            }),
            chapters: tmp_book_dialog_chapters({
                theBook: theBook,
                chapters: tmp_book_chapter_list({
                    theBook: theBook,
                }),
                documents: tmp_book_document_list({
                    theBook: theBook,
                    theDocumentList: theDocumentList
                })
            }),
            bibliographyData: tmp_book_bibliography_data({
                theBook: theBook
            }),
            printData: tmp_book_print_data({
                theBook: theBook
            }),
            epubData: tmp_book_epub_data({
                theBook: theBook,

                coverImage: tmp_book_epub_data_cover({
                    theBook: theBook,
                    anImageDB: anImageDB
                })
            })

        });
        jQuery(document).on('click', '.book-sort-up', function () {
            var chapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            });
            var higherChapter = _.findWhere(theBook.chapters, {
                number: (chapter.number - 1)
            });
            chapter.number--;
            higherChapter.number++;
            jQuery('#book-chapter-list').html(tmp_book_chapter_list({
                theBook: theBook
            }));
        });
        jQuery(document).on('click', '.book-sort-down', function () {
            var chapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            });
            var lowerChapter = _.findWhere(theBook.chapters, {
                number: (chapter.number + 1)
            });
            chapter.number++;
            lowerChapter.number--;
            jQuery('#book-chapter-list').html(tmp_book_chapter_list({
                theBook: theBook
            }));
        });

        jQuery(document).on('click', '.delete-chapter', function () {
            var thisChapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            });
            _.each(theBook.chapters, function (chapter) {
                if (chapter.number > thisChapter.number) {
                    chapter.number--;
                }
            });
            theBook.chapters = _.filter(theBook.chapters, function (
                chapter) {
                return (chapter !== thisChapter);
            });
            jQuery('#book-chapter-list').html(tmp_book_chapter_list({
                theBook: theBook
            }));
            jQuery('#book-document-list').html(tmp_book_document_list({
                theDocumentList: theDocumentList,
                theBook: theBook
            }));
        });

        jQuery(document).on('click', '#book-document-list td', function () {
            jQuery(this).toggleClass('checked');
        });

        jQuery(document).on('click', '#add-chapter', function () {
            jQuery('#book-document-list td.checked').each(function () {
                var documentId = parseInt(jQuery(this).attr(
                    'data-id')),
                    lastChapterNumber = _.max(theBook.chapters,
                        function (chapter) {
                            return chapter.number;
                        }).number;
                if (isNaN(lastChapterNumber)) {
                    lastChapterNumber = 0;
                }
                theBook.chapters.push({
                    text: documentId,
                    title: jQuery.trim(this.textContent),
                    number: lastChapterNumber + 1,
                    part: ''
                });
            });
            jQuery('#book-chapter-list').html(tmp_book_chapter_list({
                theBook: theBook
            }));
            jQuery('#book-document-list').html(tmp_book_document_list({
                theDocumentList: theDocumentList,
                theBook: theBook
            }));
        });

        jQuery(document).on('click', '.edit-chapter', function () {
            var thisChapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            });
            bookHelpers.editChapterDialog(thisChapter, theBook);
        });


        jQuery(document).on('click', '#select-cover-image-button', function () {
            bookHelpers.selectCoverImageDialog(theBook,anImageDB);
            usermediaHelpers.startUsermediaTable();
        });

        jQuery(document).on('click', '#remove-cover-image-button', function () {
            delete theBook.cover_image;
            jQuery('#figure-preview-row').html(tmp_book_epub_data_cover({
                'theBook': theBook
            }));
        });

        function getFormData() {
            theBook.title = jQuery('#book-title').val();
            theBook.metadata.author = jQuery('#book-metadata-author').val();
            theBook.metadata.subtitle = jQuery('#book-metadata-subtitle').val();
            theBook.metadata.copyright = jQuery('#book-metadata-copyright')
                .val();
            theBook.metadata.publisher = jQuery('#book-metadata-publisher')
                .val();
            theBook.metadata.keywords = jQuery('#book-metadata-keywords').val();
        }

        jQuery('body').append(dialogBody);

        jQuery('#book-settings-citationstyle').dropkick({
            change: function (value, label) {
                theBook.settings.citationstyle = value;
            }
        });

        jQuery('#book-settings-documentstyle').dropkick({
            change: function (value, label) {
                theBook.settings.documentstyle = value;
            }
        });

        jQuery('#book-settings-papersize').dropkick({
            change: function (value, label) {
                theBook.settings.papersize = value;
            }
        });
        var diaButtons = {};
        if (theBook.rights === "w") {
            diaButtons[gettext('Submit')] = function () {
                getFormData();

                bookHelpers.save(theBook, theOldBook, this);

            };
            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog("close");
            }
        } else {
            diaButtons[gettext('Close')] = function () {
                jQuery(this).dialog("close");
            }
        }
        jQuery('#book-dialog').dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 820,
            height: 590,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
            close: function () {
                jQuery(document).off('click', '#add-chapter');
                jQuery(document).off('click', '.book-sort-up');
                jQuery(document).off('click', '.book-sort-down');
                jQuery(document).off('click', '#add-chapter');
                jQuery(document).off('click', '#book-document-list td');
                jQuery(document).off('click', '.delete-chapter');
                jQuery(document).off('click', '.edit-chapter');
                jQuery(document).off('click',
                    '#select-cover-image-button');
                jQuery(document).off('click',
                    '#remove-cover-image-button');
                jQuery('#book-dialog').dialog('destroy').remove();
            }
        });

        jQuery('#bookoptionsTab').tabs();
    };



    bookHelpers.bind = function () {
        window.theBookList = undefined;
        window.theDocumentList = undefined;
        window.theTeamMembers = undefined;
        window.theAccessRights = undefined;
        window.theUser = undefined;
        jQuery(document).ready(function () {

            bookHelpers.getBookListData();
        });

        jQuery(document).bind('bookDataLoaded', function () {
            jQuery('#book-table tbody').html(tmp_book_list());
            
            bookHelpers.startBookTable();
            
        });
    };

    exports.bookHelpers = bookHelpers;

}).call(this);

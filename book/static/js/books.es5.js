/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit books.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";

var _books = require("./es6_modules/books/books");

/* Create theBooks and make it available to the general namespace for debugging
purposes.*/

var theBooks = new _books.Books();
window.theBooks = theBooks;

},{"./es6_modules/books/books":5}],2:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createAccessRightsDialog = undefined;

var _templates = require('./templates');

/**
* Helper functions to deal with the book access rights dialog.
*/

var createAccessRightsDialog = exports.createAccessRightsDialog = function createAccessRightsDialog(bookIds) {
    var dialogHeader = gettext('Share your book with others');
    var bookCollaborators = {};

    var theAccessRights = window.theAccessRights;

    var len = theAccessRights.length;

    var theTeamMembers = window.theTeamMembers;

    for (var i = 0; i < len; i++) {
        if (_.include(bookIds, theAccessRights[i].book_id)) {
            if (!(theAccessRights[i].user_id in bookCollaborators)) {
                bookCollaborators[theAccessRights[i].user_id] = theAccessRights[i];
                bookCollaborators[theAccessRights[i].user_id].count = 1;
            } else {
                if (bookCollaborators[theAccessRights[i].user_id].rights != theAccessRights[i].rights) bookCollaborators[theAccessRights[i].user_id].rights = 'r';
                bookCollaborators[theAccessRights[i].user_id].count += 1;
            }
        }
    }
    bookCollaborators = _.select(bookCollaborators, function (obj) {
        return obj.count == bookIds.length;
    });

    var dialogBody = (0, _templates.bookAccessRightOverviewTemplate)({
        'dialogHeader': dialogHeader,
        'contacts': theTeamMembers,
        'collaborators': (0, _templates.bookCollaboratorsTemplate)({
            'collaborators': bookCollaborators
        })
    });
    jQuery('body').append(dialogBody);
    var diaButtons = {};
    diaButtons[gettext('Submit')] = function () {
        //apply the current state to server
        var collaborators = [],
            rights = [];
        jQuery('#share-member .collaborator-tr').each(function () {
            collaborators[collaborators.length] = jQuery(this).attr('data-id');
            rights[rights.length] = jQuery(this).attr('data-right');
        });
        submitAccessRight(bookIds, collaborators, rights);
        jQuery(this).dialog('close');
    };
    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog("close");
    };
    jQuery('#access-rights-dialog').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 820,
        height: 540,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        },
        close: function close() {
            jQuery('#access-rights-dialog').dialog('destroy').remove();
        }
    });
    jQuery('.fw-checkable').bind('click', function () {
        $.setCheckableLabel(jQuery(this));
    });
    jQuery('#add-share-member').bind('click', function () {
        var selectedMembers = jQuery('#my-contacts .fw-checkable.checked');
        var selectedData = [];
        selectedMembers.each(function () {
            var memberId = jQuery(this).attr('data-id');
            var collaborator = jQuery('#collaborator-' + memberId);
            if (0 == collaborator.size()) {
                selectedData[selectedData.length] = {
                    'user_id': memberId,
                    'user_name': jQuery(this).attr('data-name'),
                    'avatar': jQuery(this).attr('data-avatar'),
                    'rights': 'r'
                };
            } else if ('d' == collaborator.attr('data-right')) {
                collaborator.removeClass('d').addClass('r').attr('data-right', 'r');
            }
        });
        jQuery('#my-contacts .checkable-label.checked').removeClass('checked');
        jQuery('#share-member table tbody').append((0, _templates.bookCollaboratorsTemplate)({
            'collaborators': selectedData
        }));
        collaboratorFunctionsEvent();
    });
    collaboratorFunctionsEvent();
};

var collaboratorFunctionsEvent = function collaboratorFunctionsEvent() {
    jQuery('.edit-right').unbind('click');
    jQuery('.edit-right').each(function () {
        $.addDropdownBox(jQuery(this), jQuery(this).siblings('.fw-pulldown'));
    });
    var spans = jQuery('.edit-right-wrapper .fw-pulldown-item, .delete-collaborator');
    spans.unbind('mousedown');
    spans.bind('mousedown', function () {
        var newRight = jQuery(this).attr('data-right');
        jQuery(this).closest('.collaborator-tr').attr('class', 'collaborator-tr ' + newRight);
        jQuery(this).closest('.collaborator-tr').attr('data-right', newRight);
    });
};

var submitAccessRight = function submitAccessRight(books, collaborators, rights) {
    var postData = {
        'books[]': books,
        'collaborators[]': collaborators,
        'rights[]': rights
    };
    $.ajax({
        url: '/book/accessright/save/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        success: function success(response) {
            theAccessRights = response.access_rights;
            $.addAlert('success', gettext('Access rights have been saved'));
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            console.log(jqXHR.responseText);
        }
    });
};

},{"./templates":3}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for the book access rights overview */
var bookAccessRightOverviewTemplate = exports.bookAccessRightOverviewTemplate = _.template('\
    <div id="access-rights-dialog" title="<%- dialogHeader %>">\
        <div id="my-contacts" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My contacts") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="332">' + gettext("Contacts") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small"><% _.each(contacts, function(contact) { %>\
                    <tr>\
                        <td width="332" data-id="<%- contact.id %>" data-avatar="<%- contact.avatar %>" data-name="<%- contact.name %>" class="fw-checkable fw-checkable-td">\
                            <span><img class="fw-avatar" src="<%- contact.avatar %>" /></span>\
                            <span class="fw-inline"><%= contact.name %></span>\
                        </td>\
                    </tr>\
                <% }) %></tbody>\
            </table>\
        </div>\
        <span id="add-share-member" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
        <div id="share-member" class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My collaborators") + '</h3>\
            <table class="fw-document-table tablesorter">\
                <thead class="fw-document-table-header"><tr>\
                        <th width="212">' + gettext("Collaborators") + '</th>\
                        <th width="50" align="center">' + gettext("Rights") + '</th>\
                        <th width="50" align="center">' + gettext("Delete") + '</th>\
                </tr></thead>\
                <tbody class="fw-document-table-body fw-small"><%= collaborators %></tbody>\
            </table>\
        </div>\
    </div>');

/** A template for the book collaboration pane */
var bookCollaboratorsTemplate = exports.bookCollaboratorsTemplate = _.template('\
    <% _.each(collaborators, function(collaborator) { %>\
        <tr id="collaborator-<%- collaborator.user_id %>" data-id="<%- collaborator.user_id %>"\
        class="collaborator-tr <%- collaborator.rights %>" data-right="<%- collaborator.rights %>">\
            <td width="212">\
                <span><img class="fw-avatar" src="<%- collaborator.avatar %>" /></span>\
                <span class="fw-inline"><%= collaborator.user_name %></span>\
            </td>\
            <td width="50" align="center">\
                <div class="fw-inline edit-right-wrapper">\
                    <i class="icon-access-right"></i>\
                    <i class="icon-down-dir edit-right"></i>\
                    <div class="fw-pulldown fw-left">\
                        <ul>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="w">\
                                    <i class="icon-pencil" >' + gettext("Editor") + '</i>\
                                </span>\
                            </li>\
                            <li>\
                                <span class="fw-pulldown-item" data-right="r">\
                                    <i class="icon-eye">' + gettext("Read only") + '</i>\
                                </span>\
                            </li>\
                        </ul>\
                    </div>\
                </div>\
            </td>\
            <td width="50" align="center">\
                <span class="delete-collaborator fw-inline" data-right="d">\
                    <i class="icon-trash fw-link-text"></i>\
                </span>\
            </td>\
        </tr>\
    <% }) %>');

},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.createBookDialog = exports.copyBook = exports.getBookListData = exports.deleteBookDialog = exports.startBookTable = undefined;

var _templates = require('./templates');

var deleteBook = function deleteBook(id) {
    var postData = {};
    postData['id'] = id;
    $.ajax({
        url: '/book/delete/',
        data: postData,
        type: 'POST',
        dataType: 'json',
        success: function success(data, textStatus, jqXHR) {
            stopBookTable();
            jQuery('#Book_' + id).detach();
            theBookList = _.reject(theBookList, function (book) {
                return book.id == id;
            });
            startBookTable();
        }
    });
};
var stopBookTable = function stopBookTable() {
    jQuery('#book-table').dataTable().fnDestroy();
};

var startBookTable = exports.startBookTable = function startBookTable() {
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
        }]
    });

    jQuery('#book-table_filter input').attr('placeholder', gettext('Search for Book Title'));
    jQuery('#book-table_filter input').unbind('focus, blur');
    jQuery('#book-table_filter input').bind('focus', function () {
        jQuery(this).parent().addClass('focus');
    });
    jQuery('#book-table_filter input').bind('blur', function () {
        jQuery(this).parent().removeClass('focus');
    });

    var autocompleteTags = [];
    jQuery('#book-table .fw-searchable').each(function () {
        autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''));
    });
    autocompleteTags = _.uniq(autocompleteTags);
    jQuery("#book-table_filter input").autocomplete({
        source: autocompleteTags
    });
};

var deleteBookDialog = exports.deleteBookDialog = function deleteBookDialog(ids) {
    jQuery('body').append('<div id="confirmdeletion" title="' + gettext('Confirm deletion') + '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' + gettext('Delete the book(s)?') + '</p></div>');
    diaButtons = {};
    diaButtons[gettext('Delete')] = function () {
        for (var i = 0; i < ids.length; i++) {
            deleteBook(ids[i]);
        }
        jQuery(this).dialog("close");
        $.addAlert('success', gettext('The book(s) have been deleted'));
    };

    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog("close");
    };

    jQuery("#confirmdeletion").dialog({
        resizable: false,
        height: 180,
        modal: true,
        close: function close() {
            jQuery("#confirmdeletion").detach();
        },
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        }
    });
};

var unpackBooks = function unpackBooks(booksFromServer) {
    // metadata and settings are stored as a json stirng in a text field on the server, so they need to be unpacked before being available.
    for (var i = 0; i < booksFromServer.length; i++) {
        booksFromServer[i].metadata = JSON.parse(booksFromServer[i].metadata);
        booksFromServer[i].settings = JSON.parse(booksFromServer[i].settings);
    }
    return booksFromServer;
};

var getBookListData = exports.getBookListData = function getBookListData(id) {
    $.ajax({
        url: '/book/booklist/',
        data: {},
        type: 'POST',
        dataType: 'json',
        success: function success(response, textStatus, jqXHR) {
            theBookList = unpackBooks(response.books);
            theDocumentList = response.documents;
            theTeamMembers = response.team_members;
            theAccessRights = response.access_rights;
            theUser = response.user;
            jQuery.event.trigger({
                type: "bookDataLoaded"
            });
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            $.addAlert('error', jqXHR.responseText);
        },
        complete: function complete() {
            $.deactivateWait();
        }
    });
};

var selectCoverImageDialog = function selectCoverImageDialog(theBook, anImageDB) {
    var dialogHeader = gettext('Select cover image'),
        dialogBody = (0, _templates.bookCoverImageSelectionTemplate)({
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
        jQuery('#figure-preview-row').html(bookEpubDataCoverTemplate({
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
        create: function create() {},
        close: function close() {
            jQuery(document).off('click', '#imagelist tr');
            jQuery('#selectImageFigureButton').unbind('click');
            jQuery('#cancelImageFigureButton').unbind('click');
            jQuery('#book-cover-image-selection').dialog('destroy').remove();
        }
    });
};

var editChapterDialog = function editChapterDialog(aChapter, theBook) {
    var aDocument = _.findWhere(theDocumentList, {
        id: aChapter.text
    }),
        documentTitle = aDocument.title,
        dialogHeader = undefined,
        dialogBody = undefined;
    if (documentTitle.length < 0) {
        documentTitle = gettext('Untitled');
    }
    dialogHeader = gettext('Edit Chapter') + ': ' + aChapter.number + '. ' + documentTitle;
    dialogBody = (0, _templates.bookChapterDialogTemplate)({
        'dialogHeader': dialogHeader,
        'aChapter': aChapter
    });

    jQuery('body').append(dialogBody);
    var diaButtons = {};
    diaButtons[gettext('Submit')] = function () {
        aChapter.part = jQuery('#book-chapter-part').val();
        jQuery('#book-chapter-list').html((0, _templates.bookChapterListTemplate)({
            theBook: theBook
        }));
        jQuery(this).dialog('close');
    };
    diaButtons[gettext('Cancel')] = function () {
        jQuery(this).dialog("close");
    };
    jQuery('#book-chapter-dialog').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 300,
        height: 200,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        },
        close: function close() {
            jQuery('#book-chapter-dialog').dialog('destroy').remove();
        }
    });
};

var saveBook = function saveBook(theBook, theOldBook, currentDialog) {
    $.ajax({
        url: '/book/save/',
        data: {
            the_book: JSON.stringify(theBook)
        },
        type: 'POST',
        dataType: 'json',
        success: function success(response, textStatus, jqXHR) {
            if (jqXHR.status == 201) {
                theBook.id = response.id;
                theBook.added = response.added;
            }
            theBook.updated = response.updated;
            if (typeof theOldBook != 'undefined') {
                theBookList = _.reject(theBookList, function (book) {
                    return book === theOldBook;
                });
            }
            theBookList.push(theBook);
            stopBookTable();
            jQuery('#book-table tbody').html((0, _templates.bookListTemplate)());
            startBookTable();
            if (typeof currentDialog != 'undefined') {
                jQuery(currentDialog).dialog('close');
            }
        },
        error: function error(jqXHR, textStatus, errorThrown) {
            $.addAlert('error', jqXHR.responseText);
        },
        complete: function complete() {}
    });
};

var copyBook = exports.copyBook = function copyBook(theOldBook) {
    var theBook = jQuery.extend(true, {}, theOldBook);
    theBook.id = 0;
    theBook.is_owner = true;
    theBook.owner_avatar = theUser.avatar;
    theBook.owner_name = theUser.name;
    theBook.owner = theUser.id;
    theBook.rights = 'w';
    if (theOldBook.owner != theBook.owner) {
        var setCoverImage = function setCoverImage(id) {
            theBook.cover_image = id;
            saveBook(theBook);
        };

        prepareCopyCoverImage(theBook.cover_image, theOldBook.owner, setCoverImage);
    } else {
        saveBook(theBook);
    }
};

var prepareCopyCoverImage = function prepareCopyCoverImage(coverImage, userId, callback) {
    if ('undefined' === typeof ImageDB) {
        usermediaHelpers.getImageDB(function () {
            prepareCopyCoverImage(coverImage, userId, callback);
            return;
        });
    } else {
        usermediaHelpers.getAnImageDB(userId, function (anImageDB) {
            copyCoverImage(anImageDB[coverImage], callback);
        });
    }
};

var copyCoverImage = function copyCoverImage(oldImageObject, callback) {
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
    } else if (1 === matchEntries.length && oldImageObject.pk !== matchEntries[0].pk) {
        imageTranslation = matchEntries[0].pk;
    } else if (1 < matchEntries.length) {
        if (!_.findWhere(matchEntries, {
            pk: oldImageObject.pk
        })) {
            // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
            // We now pick the first match.
            // TODO: Figure out if this behavior is correct.
            imageTranslation = matchEntries[0].pk;
        }
    }

    if (imageTranslation) {
        callback(imageTranslation);
    } else if (newImageEntry) {
        createNewImage(newImageEntry, callback);
    } else {
        callback(oldImageObject.pk);
    }
};

var createNewImage = function createNewImage(imageEntry, callback) {
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
            formValues.append('image', imageFile, imageEntry.oldUrl.split('/').pop());
            formValues.append('checksum', imageEntry.checksum), jQuery.ajax({
                url: '/usermedia/save/',
                data: formValues,
                type: 'POST',
                dataType: 'json',
                success: function success(response, textStatus, jqXHR) {
                    ImageDB[response.values.pk] = response.values;
                    callback(response.values.pk);
                },
                error: function error() {
                    jQuery.addAlert('error', gettext('Could not save ') + imageEntry.title);
                },
                complete: function complete() {},
                cache: false,
                contentType: false,
                processData: false
            });
            return;
        }
    };

    xhr.send();
};

var createBookDialog = exports.createBookDialog = function createBookDialog(bookId, anImageDB) {
    var dialogHeader = undefined,
        theBook = undefined,
        theOldBook = undefined;

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

    if ('undefined' === typeof anImageDB) {
        if ('undefined' === typeof ImageDB && theBook.is_owner) {
            // load the ImageDB if it is not available yet. Once done, load this function.
            usermediaHelpers.init(function () {
                createBookDialog(bookId, ImageDB);
            });
            return;
        } else if (!theBook.is_owner) {
            usermediaHelpers.getAnImageDB(theBook.owner, function (anImageDB) {
                createBookDialog(bookId, anImageDB);
            });
            return;
        } else {
            createBookDialog(bookId, ImageDB);
            return;
        }
    }

    var dialogBody = tmp_book_dialog({
        dialogHeader: dialogHeader,
        basicInfo: (0, _templates.bookBasicInfoTemplate)({
            theBook: theBook
        }),
        chapters: (0, _templates.bookDialogChaptersTemplate)({
            theBook: theBook,
            chapters: (0, _templates.bookChapterListTemplate)({
                theBook: theBook
            }),
            documents: (0, _templates.bookDocumentListTemplate)({
                theBook: theBook,
                theDocumentList: theDocumentList
            })
        }),
        bibliographyData: bookBibliographyDataTemplate({
            theBook: theBook
        }),
        printData: (0, _templates.bookPrintDataTemplate)({
            theBook: theBook
        }),
        epubData: bookEpubDataTemplate({
            theBook: theBook,

            coverImage: bookEpubDataCoverTemplate({
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
            number: chapter.number - 1
        });
        chapter.number--;
        higherChapter.number++;
        jQuery('#book-chapter-list').html((0, _templates.bookChapterListTemplate)({
            theBook: theBook
        }));
    });
    jQuery(document).on('click', '.book-sort-down', function () {
        var chapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        });
        var lowerChapter = _.findWhere(theBook.chapters, {
            number: chapter.number + 1
        });
        chapter.number++;
        lowerChapter.number--;
        jQuery('#book-chapter-list').html((0, _templates.bookChapterListTemplate)({
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
        theBook.chapters = _.filter(theBook.chapters, function (chapter) {
            return chapter !== thisChapter;
        });
        jQuery('#book-chapter-list').html((0, _templates.bookChapterListTemplate)({
            theBook: theBook
        }));
        jQuery('#book-document-list').html((0, _templates.bookDocumentListTemplate)({
            theDocumentList: theDocumentList,
            theBook: theBook
        }));
    });

    jQuery(document).on('click', '#book-document-list td', function () {
        jQuery(this).toggleClass('checked');
    });

    jQuery(document).on('click', '#add-chapter', function () {
        jQuery('#book-document-list td.checked').each(function () {
            var documentId = parseInt(jQuery(this).attr('data-id')),
                lastChapterNumber = _.max(theBook.chapters, function (chapter) {
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
        jQuery('#book-chapter-list').html((0, _templates.bookChapterListTemplate)({
            theBook: theBook
        }));
        jQuery('#book-document-list').html((0, _templates.bookDocumentListTemplate)({
            theDocumentList: theDocumentList,
            theBook: theBook
        }));
    });

    jQuery(document).on('click', '.edit-chapter', function () {
        var thisChapter = _.findWhere(theBook.chapters, {
            text: parseInt(jQuery(this).attr('data-id'))
        });
        editChapterDialog(thisChapter, theBook);
    });

    jQuery(document).on('click', '#select-cover-image-button', function () {
        selectCoverImageDialog(theBook, anImageDB);
        usermediaHelpers.startUsermediaTable();
    });

    jQuery(document).on('click', '#remove-cover-image-button', function () {
        delete theBook.cover_image;
        jQuery('#figure-preview-row').html(bookEpubDataCoverTemplate({
            'theBook': theBook
        }));
    });

    function getFormData() {
        theBook.title = jQuery('#book-title').val();
        theBook.metadata.author = jQuery('#book-metadata-author').val();
        theBook.metadata.subtitle = jQuery('#book-metadata-subtitle').val();
        theBook.metadata.copyright = jQuery('#book-metadata-copyright').val();
        theBook.metadata.publisher = jQuery('#book-metadata-publisher').val();
        theBook.metadata.keywords = jQuery('#book-metadata-keywords').val();
    }

    jQuery('body').append(dialogBody);

    jQuery('#book-settings-citationstyle').dropkick({
        change: function change(value, label) {
            theBook.settings.citationstyle = value;
        }
    });

    jQuery('#book-settings-documentstyle').dropkick({
        change: function change(value, label) {
            theBook.settings.documentstyle = value;
        }
    });

    jQuery('#book-settings-papersize').dropkick({
        change: function change(value, label) {
            theBook.settings.papersize = value;
        }
    });
    var diaButtons = {};
    if (theBook.rights === "w") {
        diaButtons[gettext('Submit')] = function () {
            getFormData();

            saveBook(theBook, theOldBook, this);
        };
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close");
        };
    } else {
        diaButtons[gettext('Close')] = function () {
            jQuery(this).dialog("close");
        };
    }
    jQuery('#book-dialog').dialog({
        draggable: false,
        resizable: false,
        top: 10,
        width: 820,
        height: 590,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        },
        close: function close() {
            jQuery(document).off('click', '#add-chapter');
            jQuery(document).off('click', '.book-sort-up');
            jQuery(document).off('click', '.book-sort-down');
            jQuery(document).off('click', '#add-chapter');
            jQuery(document).off('click', '#book-document-list td');
            jQuery(document).off('click', '.delete-chapter');
            jQuery(document).off('click', '.edit-chapter');
            jQuery(document).off('click', '#select-cover-image-button');
            jQuery(document).off('click', '#remove-cover-image-button');
            jQuery('#book-dialog').dialog('destroy').remove();
        }
    });

    jQuery('#bookoptionsTab').tabs();
};

},{"./templates":13}],5:[function(require,module,exports){
"use strict";

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.Books = undefined;

var _html = require("./exporter/html");

var _latex = require("./exporter/latex");

var _epub = require("./exporter/epub");

var _actions = require("./actions");

var _dialog = require("./accessrights/dialog");

var _templates = require("./templates");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Books = exports.Books = (function () {
    // A class that contains everything that happens on the books page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.

    function Books() {
        _classCallCheck(this, Books);

        this.bindEvents();
    }

    _createClass(Books, [{
        key: "bindEvents",
        value: function bindEvents() {
            window.theBookList = undefined;
            window.theDocumentList = undefined;
            window.theTeamMembers = undefined;
            window.theAccessRights = undefined;
            window.theUser = undefined;
            jQuery(document).ready(function () {
                (0, _actions.getBookListData)();
            });

            jQuery(document).bind('bookDataLoaded', function () {
                jQuery('#book-table tbody').html((0, _templates.bookListTemplate)());
                (0, _actions.startBookTable)();
            });

            jQuery(document).ready(function () {
                jQuery(document).on('click', '.delete-book', function () {
                    var BookId = jQuery(this).attr('data-id');
                    (0, _actions.deleteBookDialog)([BookId]);
                });

                jQuery(document).on('click', '.owned-by-user .rights', function () {
                    var BookId = parseInt(jQuery(this).attr('data-id'));
                    (0, _dialog.createAccessRightsDialog)([BookId]);
                });

                //select all entries
                jQuery('#select-all-entry').bind('change', function () {
                    var newBool = false;
                    if (jQuery(this).prop("checked")) newBool = true;
                    jQuery('.entry-select').not(':disabled').each(function () {
                        this.checked = newBool;
                    });
                });

                //open dropdown for selecting action
                $.addDropdownBox(jQuery('#select-action-dropdown-books'), jQuery('#action-selection-pulldown-books'));

                //submit action for selected document
                jQuery('#action-selection-pulldown-books li > span').bind('mousedown', function () {
                    var actionName = jQuery(this).attr('data-action'),
                        ids = [],
                        aBook = undefined;
                    if ('' == actionName || 'undefined' == typeof actionName) return;
                    jQuery('.entry-select:checked').not(':disabled').each(function () {
                        if (theUser.id != jQuery(this).attr('data-owner') && (actionName === 'delete' || actionName === 'share')) {
                            var theTitle = jQuery(this).parent().parent().parent().find('.book-title').text();
                            theTitle = $.trim(the_title).replace(/[\t\n]/g, '');
                            $.addAlert('error', gettext('You cannot delete or share: ') + theTitle);
                            //return true
                        } else {
                                ids[ids.length] = parseInt(jQuery(this).attr('data-id'));
                            }
                    });
                    if (0 == ids.length) return;
                    switch (actionName) {
                        case 'delete':
                            (0, _actions.deleteBookDialog)(ids);
                            break;
                        case 'share':
                            bookaccessrightsHelpers.createAccessRightsDialog(ids);
                            break;
                        case 'epub':
                            for (var i = 0; i < ids.length; i++) {
                                aBook = _.findWhere(theBookList, {
                                    id: ids[i]
                                });
                                $.addAlert('info', aBook.title + ': ' + gettext('Epub export has been initiated.'));
                                (0, _epub.downloadEpub)(aBook);
                            }
                            break;
                        case 'latex':
                            for (var i = 0; i < ids.length; i++) {
                                aBook = _.findWhere(theBookList, {
                                    id: ids[i]
                                });
                                $.addAlert('info', aBook.title + ': ' + gettext('Latex export has been initiated.'));
                                (0, _latex.downloadLatex)(aBook);
                            }
                            break;
                        case 'html':
                            for (var i = 0; i < ids.length; i++) {
                                aBook = _.findWhere(theBookList, {
                                    id: ids[i]
                                });
                                $.addAlert('info', aBook.title + ': ' + gettext('HTML export has been initiated.'));
                                (0, _html.downloadHtml)(aBook);
                            }
                            break;
                        case 'copy':
                            for (var i = 0; i < ids.length; i++) {
                                (0, _actions.copyBook)(_.findWhere(theBookList, {
                                    id: ids[i]
                                }));
                            }
                            break;
                        case 'print':
                            for (var i = 0; i < ids.length; i++) {
                                window.open('/book/print/' + _.findWhere(theBookList, {
                                    id: ids[i]
                                }).id + '/');
                            }
                            break;
                    }
                });

                jQuery('.create-new-book').bind('click', function () {
                    (0, _actions.createBookDialog)(0);
                });

                jQuery(document).on('click', '.book-title', function () {
                    var bookId = parseInt(jQuery(this).attr('data-id'));
                    (0, _actions.createBookDialog)(bookId);
                });
            });
        }
    }]);

    return Books;
})();

},{"./accessrights/dialog":2,"./actions":4,"./exporter/epub":7,"./exporter/html":9,"./exporter/latex":11,"./templates":13}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.epubBookCopyrightTemplate = exports.epubBookTitlepageTemplate = exports.epubBookCoverTemplate = exports.epubBookOpfTemplate = undefined;

var _epubTemplates = require('../../exporter/epub-templates');

/** A template to create the OPF file of book epubs. */
var epubBookOpfTemplate = exports.epubBookOpfTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= aBook.id %></dc:identifier>\n\
    \t\t<dc:title><%= aBook.title %></dc:title>\n\
    \t\t<dc:creator><% if (aBook.metadata.author && aBook.metadata.author != "") {\
            print(aBook.metadata.author);\
        } else {\
            print(theUser.name);\
        } %></dc:creator>\n\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    <% if (aBook.metadata.copyright && aBook.metadata.copyright != "") { %>\
    \t\t<dc:rights><%- aBook.metadata.copyright %></dc:rights>\
    <% } %>\
    <% if (aBook.metadata.publisher && aBook.metadata.publisher != "") { %>\
    \t\t<dc:publisher><%- aBook.metadata.publisher %></dc:publisher>\
    <% } %>\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    <% if (aBook.metadata.keywords && aBook.metadata.keywords != "") {\
        _.each(aBook.metadata.keywords.split(","),function(keyword) { %>\
            <dc:subject><%- jQuery.trim(keyword) %></dc:subject>\
    <% }); } %>\
    \t</metadata>\n\
    \t<manifest>\n\
    <% if (coverImage) { %>\
        <item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>\
    <% } %>\
    <item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>\
    <% _.each(chapters, function (aChapter) { %>\
        \t\t<item id="t<%- aChapter.number %>" href="document-<%- aChapter.number %>.xhtml" media-type="application/xhtml+xml" />\n\
    <% }); %>\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>\
        <% _.each(images,function(item, index){ %>' + _epubTemplates.opfImageItemTemplatePart + '<% }); %>\
        <% _.each(styleSheets,function(item, index){ %>' + _epubTemplates.opfCssItemTemplatePart + '<% }); %>\
        <% if (math) { %> <%= katexOpfIncludes %><% }%>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
        <% if (coverImage) { %>\
            \t\t<itemref idref="cover" linear="no"/>\
        <% } %>\
        <itemref idref="titlepage" linear="yes"/>\
        <% _.each(chapters, function (aChapter) { %>\
            \t\t<itemref idref="t<%- aChapter.number %>" linear="yes" />\n\
        <% }); %>\
        <itemref idref="copyright" linear="yes"/>\
        <itemref idref="nav" linear="no"/>\
    \t</spine>\n\
    </package>\
    ');
/** A template to create the book epub cover XML. */
var epubBookCoverTemplate = exports.epubBookCoverTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <div id="cover">\
            <img src="<%= coverImage.image.split("/").pop().split("?")[0] %>" alt="' + gettext('Cover Image') + '" title="Cover Image"/>\
        </div>\
    </body>\
</html>\
');

/** A template to create the book epub titlepage XML. */
var epubBookTitlepageTemplate = exports.epubBookTitlepageTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
   <head>\
      <title><%- aBook.title %></title>\
      <meta charset="utf-8"/>\
   </head>\
   <body style="text-align: center;">\
      <div id="title" epub:type="frontmatter titlepage">\
          <h1><%- aBook.title %></h1>\
          <% if (aBook.metadata.subtitle !="") { %>\
            <h2><%- aBook.metadata.subtitle %></h2>\
          <% } %>\
          <% if (aBook.metadata.author !="") { %>\
            <h3>' + gettext('by') + ' <%- aBook.metadata.author %></h3>\
          <% } %>\
      </div>\
   </body>\
</html>\
');

/** A template to create the book epub copyright page XML. */
var epubBookCopyrightTemplate = exports.epubBookCopyrightTemplate = _.template('\
<?xml version="1.0" encoding="UTF-8"?>\
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">\
    <head>\
        <title><%- aBook.title %></title>\
        <meta charset="utf-8"/>\
    </head>\
    <body>\
        <section epub:type="frontmatter copyright-page">\
            <div id="copyright">\
                <p>\
                    <%- aBook.title %>\
                    <% if (aBook.metadata.author !="") { %>\
                        ' + gettext('by') + ' <%- aBook.metadata.author %>\
                    <% } %>\
                </p>\
                <% if (aBook.metadata.copyright !="") { %>\
                    <p><%- aBook.metadata.copyright %></p>\
                <% } %>\
                <p>' + gettext('Title') + ': <% aBook.title %></p>\
                <% if (aBook.metadata.author && aBook.metadata.author !="") { %>\
                    <p>' + gettext('Author') + ': <%- aBook.metadata.author %></p>\
                <% } %>\
                <% if (aBook.metadata.publisher && aBook.metadata.publisher !="") { %>\
                    <p>' + gettext('Published by') + ': <%- aBook.metadata.publisher %></p>\
                <% } %>\
                <p>' + gettext('Last Updated') + ': <%= aBook.updated %></p>\
                <p>' + gettext('Created') + ': <%= aBook.added %></p>\
                <p>' + gettext('Language') + ': <%= language %></p>\
                <p>' + gettext('Created by') + ': <%= creator %></p>\
            </div>\
        </section>\
    </body>\
</html>\
');

},{"../../exporter/epub-templates":16}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadEpub = undefined;

var _katex = require("katex");

var _tools = require("./tools");

var _epubTemplates = require("./epub-templates");

var _opfIncludes = require("../../katex/opf-includes");

var _epub = require("../../exporter/epub");

var _html = require("../../exporter/html");

var _epubTemplates2 = require("../../exporter/epub-templates");

var _json = require("../../exporter/json");

var _tools2 = require("../../exporter/tools");

var _zip = require("../../exporter/zip");

var _format = require("../../citations/format");

var downloadEpub = exports.downloadEpub = function downloadEpub(aBook) {
    (0, _tools.getMissingChapterData)(aBook, function () {
        (0, _tools.getImageAndBibDB)(aBook, function (anImageDB, aBibDB) {
            epubBookExport(aBook, anImageDB, aBibDB);
        });
    });
};

var templates = { ncxTemplate: _epubTemplates2.ncxTemplate, ncxItemTemplate: _epubTemplates2.ncxItemTemplate, navTemplate: _epubTemplates2.navTemplate, navItemTemplate: _epubTemplates2.navItemTemplate };

var epubBookExport = function epubBookExport(aBook, anImageDB, aBibDB) {
    var coverImage = false,
        contentItems = [],
        images = [],
        chapters = [],
        styleSheets = [],
        outputList = [],
        math = false;

    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number;
    });

    if (aBook.cover_image) {
        coverImage = _.findWhere(anImageDB, {
            pk: aBook.cover_image
        });
        images.push({
            url: coverImage.image.split('?')[0],
            filename: coverImage.image.split('/').pop().split('?')[0]
        });

        outputList.push({
            filename: 'EPUB/cover.xhtml',
            contents: (0, _epubTemplates.epubBookCoverTemplate)({ aBook: aBook, coverImage: coverImage })
        });
        contentItems.push({
            link: 'cover.xhtml#cover',
            title: gettext('Cover'),
            docNum: 0,
            id: 0,
            level: 0,
            subItems: []
        });
    }
    contentItems.push({
        link: 'titlepage.xhtml#title',
        title: gettext('Title page'),
        docNum: 0,
        id: 1,
        level: 0,
        subItems: []
    });

    for (var i = 0; i < aBook.chapters.length; i++) {

        var aChapter = {};

        aChapter.document = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        });

        var tempNode = (0, _json.obj2Node)(aChapter.document.contents);

        var contents = document.createElement('body');

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }

        var bibliography = (0, _format.formatCitations)(contents, aBook.settings.citationstyle, aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        images = images.concat((0, _tools2.findImages)(contents));

        var startHTML = '<h1 class="title">' + aChapter.document.title + '</h1>';

        if (aChapter.document.settings && aChapter.document.settings['metadata-subtitle'] && aChapter.document.metadata.subtitle) {
            tempNode = (0, _json.obj2Node)(aChapter.document.metadata.subtitle);
            if (tempNode && tempNode.textContent.length > 0) {
                startHTML += '<h2 class="subtitle">' + tempNode.textContent + '</h2>';
            }
        }
        if (aChapter.document.settings && aChapter.document.settings['metadata-abstract'] && aChapter.document.metadata.abstract) {
            tempNode = (0, _json.obj2Node)(aChapter.document.metadata.abstract);
            if (tempNode && tempNode.textContent.length > 0) {
                startHTML += '<div class="abstract">' + tempNode.textContent + '</div>';
            }
        }

        contents.innerHTML = startHTML + contents.innerHTML;

        contents = (0, _html.cleanHTML)(contents);

        contents = (0, _html.addFigureNumbers)(contents);

        aChapter.number = aBook.chapters[i].number;

        aChapter.part = aBook.chapters[i].part;

        var equations = contents.querySelectorAll('.equation');

        var figureEquations = contents.querySelectorAll('.figure-equation');

        if (equations.length > 0 || figureEquations.length > 0) {
            aChapter.math = true;
            math = true;
        }

        for (var _i = 0; _i < equations.length; _i++) {
            var node = equations[_i];
            var formula = node.getAttribute('data-equation');
            (0, _katex.render)(formula, node);
        }
        for (var _i2 = 0; _i2 < figureEquations.length; _i2++) {
            var node = figureEquations[_i2];
            var formula = node.getAttribute('data-equation');
            (0, _katex.render)(formula, node, {
                displayMode: true
            });
        }

        if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
            contentItems.push({
                link: 'document-' + aBook.chapters[i].number + '.xhtml',
                title: aChapter.part,
                docNum: aChapter.number,
                id: 0,
                level: -1,
                subItems: []
            });
        }

        // Make links to all H1-3 and create a TOC list of them
        contentItems = contentItems.concat((0, _epub.setLinks)(contents, aChapter.number));

        //   aChapter.contents = styleEpubFootnotes(contents)

        aChapter.contents = contents;

        chapters.push(aChapter);
    }

    var includeZips = [],
        httpOutputList = [];

    for (var i = 0; i < chapters.length; i++) {

        chapters[i].contents = (0, _epub.styleEpubFootnotes)(chapters[i].contents);

        var xhtmlCode = (0, _epubTemplates2.xhtmlTemplate)({
            part: chapters[i].part,
            shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
            title: chapters[i].document.title,
            metadata: chapters[i].document.metadata,
            settings: chapters[i].document.settings,
            styleSheets: styleSheets,
            body: (0, _json.obj2Node)((0, _json.node2Obj)(chapters[i].contents), 'xhtml').innerHTML,
            math: chapters[i].math
        });

        xhtmlCode = (0, _html.replaceImgSrc)(xhtmlCode);

        outputList.push({
            filename: 'EPUB/document-' + chapters[i].number + '.xhtml',
            contents: xhtmlCode
        });
    }

    contentItems.push({
        link: 'copyright.xhtml#copyright',
        title: gettext('Copyright'),
        docNum: 0,
        id: 2,
        level: 0,
        subItems: []
    });

    contentItems = (0, _epub.orderLinks)(contentItems);

    var timestamp = (0, _epub.getTimestamp)();

    images = (0, _tools.uniqueObjects)(images);

    // mark cover image
    if (coverImage) {
        _.findWhere(images, {
            url: coverImage.image.split('?')[0]
        }).coverImage = true;
    }

    var opfCode = (0, _epubTemplates.epubBookOpfTemplate)({
        language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
        aBook: aBook,
        theUser: theUser,
        idType: 'fidus',
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets: styleSheets,
        math: math,
        images: images,
        chapters: chapters,
        coverImage: coverImage,
        katexOpfIncludes: _opfIncludes.katexOpfIncludes
    });

    var ncxCode = (0, _epubTemplates2.ncxTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: aBook.title,
        idType: 'fidus',
        id: aBook.id,
        contentItems: contentItems,
        templates: templates
    });

    var navCode = (0, _epubTemplates2.navTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems,
        templates: templates
    });

    outputList = outputList.concat([{
        filename: 'META-INF/container.xml',
        contents: (0, _epubTemplates2.containerTemplate)({})
    }, {
        filename: 'EPUB/document.opf',
        contents: opfCode
    }, {
        filename: 'EPUB/document.ncx',
        contents: ncxCode
    }, {
        filename: 'EPUB/document-nav.xhtml',
        contents: navCode
    }, {
        filename: 'EPUB/titlepage.xhtml',
        contents: (0, _epubTemplates.epubBookTitlepageTemplate)({
            aBook: aBook
        })
    }, {
        filename: 'EPUB/copyright.xhtml',
        contents: (0, _epubTemplates.epubBookCopyrightTemplate)({
            aBook: aBook,
            creator: theUser.name,
            language: gettext('English') //TODO: specify a book language rather than using the current users UI language
        })
    }]);

    for (var i = 0; i < styleSheets.length; i++) {
        outputList.push({
            filename: 'EPUB/' + styleSheets[i].filename,
            contents: styleSheets[i].contents
        });
    }

    for (var i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        });
    }

    if (math) {
        includeZips.push({
            'directory': 'EPUB',
            'url': staticUrl + 'zip/katex-style.zip'
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools2.createSlug)(aBook.title) + '.epub', 'application/epub+zip', includeZips);
};

},{"../../citations/format":14,"../../exporter/epub":17,"../../exporter/epub-templates":16,"../../exporter/html":19,"../../exporter/json":20,"../../exporter/tools":22,"../../exporter/zip":25,"../../katex/opf-includes":26,"./epub-templates":6,"./tools":12,"katex":27}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for HTML export of a book. */
var htmlBookExportTemplate = exports.htmlBookExportTemplate = _.template('\
<!DOCTYPE html>\n\
<html>\n<head><title><%= title %></title>\
    <% var tempNode; %>\
    <% _.each(styleSheets,function(item){ %>\
        \t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />\
    <% }); %>\
    </head><body>\
    <% if (part && part !="") { %>\
        <h1 class="part"><%= part %></h1>\
    <% } %>\
    <h1 class="title"><%= title %></h1>\
    <% if (settings["metadata-subtitle"] && metadata.subtitle) { %>\
        <% tempNode = obj2Node(metadata.subtitle); %>\
        <% if (tempNode.textContent.length > 0) { %>\
            <h2 class="subtitle"><%= tempNode.textContent %></h2>\
        <% } %>\
    <% } %>\
    <% if (settings["metadata-abstract"] && metadata.abstract) { %>\
        <% tempNode = obj2Node(metadata.abstract); %>\
        <% if (tempNode.textContent.length > 0) { %>\
            <div class="abstract"><%= tempNode.textContent %></div>\
        <% } %>\
    <% } %>\
    <% if (settings["metadata-authors"] && metadata.authors) { %>\
        <% tempNode = obj2Node(metadata.authors); %>\
        <% if (tempNode.textContent.length > 0) { %>\
            <div class="authors"><%= tempNode.textContent %></div>\
        <% } %>\
    <% } %>\
    <% if (settings["metadata-keywords"] && metadata.keywords) { %>\
        <% tempNode = obj2Node(metadata.keywords); %>\
        <% if (tempNode.textContent.length > 0) { %>\
            <div class="keywords"><%= tempNode.textContent %></div>\
        <% } %>\
    <% } %>\
    <%= contents %></body></html>');

/** A template to create the book index. */
var htmlBookIndexTemplate = exports.htmlBookIndexTemplate = _.template('\
    <html>\n\
    \t<head>\n\
    \t\t<meta charset="utf-8"></meta>\n\
    \t\t<title><%- aBook.title %></title>\n\
    \t</head>\n\
    \t<body>\n\
    \t\t<h1><%- aBook.title %></h1>\
    <% if (aBook.metadata.subtitle !="") { %>\
        \t\t<h2><%- aBook.metadata.subtitle %></h2>\
    <% } %>\
    <% if (aBook.metadata.author !="") { %>\
        \t\t<h3>' + gettext('by') + ' <%- aBook.metadata.author %></h3>\
    <% } %>\
    \t\t<ol>\n\
        <% _.each(contentItems,function(item){ %>\
            <%= templates.htmlBookIndexItemTemplate({"item":item, "templates": templates})%>\
        <% }); %>\
    \t\t</ol>\n\
    <% if (aBook.metadata.publisher && aBook.metadata.publisher !="") { %>\
        \t\t<p>' + gettext('Published by') + ': <%- aBook.metadata.publisher %></p>\
    <% } %>\
    \t\t<p>' + gettext('Last Updated') + ': <%= aBook.updated %></p>\
    \t\t<p>' + gettext('Created') + ': <%= aBook.added %></p>\
    \t\t<p>' + gettext('Language') + ': <%= language %></p>\
    \t\t<p>' + gettext('Created by') + ': <%= creator %></p>\
    \t</body>\n\
    </html>');
/** A template to create the book index item. */
var htmlBookIndexItemTemplate = exports.htmlBookIndexItemTemplate = _.template('\
\t\t\t\t<li><a href="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.html#<% print(item.id); } %>"><%= item.title %></a>\
    <% if (item.subItems.length > 0) { %>\
        <ol>\
            <% _.each(item.subItems,function(item){ %>\
                <%= templates.htmlBookIndexItemTemplate({"item":item, "templates": templates})%>\
            <% }); %>\
        </ol>\
    <% } %>\
</li>\n');

},{}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadHtml = undefined;

var _katex = require("katex");

var _tools = require("./tools");

var _htmlTemplates = require("./html-templates");

var _json = require("../../exporter/json");

var _epub = require("../../exporter/epub");

var _html = require("../../exporter/html");

var _tools2 = require("../../exporter/tools");

var _zip = require("../../exporter/zip");

var _format = require("../../citations/format");

// Some templates need to be able to refer to these templates, so we hand the templates variable to such
// templates.
var templates = { htmlBookIndexItemTemplate: _htmlTemplates.htmlBookIndexItemTemplate };

var downloadHtml = exports.downloadHtml = function downloadHtml(aBook) {
    (0, _tools.getMissingChapterData)(aBook, function () {
        (0, _tools.getImageAndBibDB)(aBook, function (anImageDB, aBibDB) {
            htmlBookExport(aBook, anImageDB, aBibDB);
        });
    });
};

var htmlBookExport = function htmlBookExport(aBook, anImageDB, aBibDB) {
    var math = false,
        styleSheets = [],
        chapters = [];

    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number;
    });

    for (var i = 0; i < aBook.chapters.length; i++) {

        var aDocument = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        });

        var contents = (0, _json.obj2Node)(aDocument.contents);

        var bibliography = (0, _format.formatCitations)(contents, aBook.settings.citationstyle, aBibDB);

        if (bibliography.length > 0) {
            contents.innerHTML += bibliography;
        }

        var equations = contents.querySelectorAll('.equation');

        var figureEquations = contents.querySelectorAll('.figure-equation');

        if (equations.length > 0 || figureEquations.length > 0) {
            math = true;
        }

        for (var j = 0; j < equations.length; j++) {
            var node = equations[j];
            var formula = node.getAttribute('data-equation');
            (0, _katex.render)(formula, node);
        }
        for (var j = 0; j < figureEquations.length; j++) {
            var node = figureEquations[j];
            var formula = node.getAttribute('data-equation');
            (0, _katex.render)(formula, node, {
                displayMode: true
            });
        }

        chapters.push({ document: aDocument, contents: contents });
    }

    var outputList = [],
        images = [],
        contentItems = [],
        includeZips = [];

    for (var i = 0; i < chapters.length; i++) {

        var contents = chapters[i].contents;

        var aDocument = chapters[i].document;

        var title = aDocument.title;

        images = images.concat((0, _tools2.findImages)(contents));

        contents = (0, _html.cleanHTML)(contents);

        if (aBook.chapters[i].part && aBook.chapters[i].part != '') {
            contentItems.push({
                link: 'document-' + aBook.chapters[i].number + '.html',
                title: aBook.chapters[i].part,
                docNum: aBook.chapters[i].number,
                id: 0,
                level: -1,
                subItems: []
            });
        }

        contentItems.push({
            link: 'document-' + aBook.chapters[i].number + '.html',
            title: title,
            docNum: aBook.chapters[i].number,
            id: 0,
            level: 0,
            subItems: []
        });

        // Make links to all H1-3 and create a TOC list of them
        contentItems = contentItems.concat((0, _epub.setLinks)(contents, aBook.chapters[i].number));

        var contentsCode = (0, _html.replaceImgSrc)(contents.innerHTML);

        var htmlCode = (0, _htmlTemplates.htmlBookExportTemplate)({
            part: aBook.chapters[i].part,
            title: title,
            metadata: aDocument.metadata,
            settings: aDocument.settings,
            styleSheets: styleSheets,
            contents: contentsCode,
            math: math,
            obj2Node: _json.obj2Node
        });

        outputList.push({
            filename: 'document-' + aBook.chapters[i].number + '.html',
            contents: htmlCode
        });
    }

    contentItems = (0, _epub.orderLinks)(contentItems);

    outputList = outputList.concat(styleSheets);

    outputList.push({
        filename: 'index.html',
        contents: (0, _htmlTemplates.htmlBookIndexTemplate)({
            contentItems: contentItems,
            aBook: aBook,
            creator: theUser.name,
            language: gettext('English'), //TODO: specify a book language rather than using the current users UI language
            templates: templates
        })
    });

    if (math) {
        includeZips.push({
            'directory': '',
            'url': staticUrl + 'zip/katex-style.zip'
        });
    }

    images = (0, _tools.uniqueObjects)(images);

    (0, _zip.zipFileCreator)(outputList, images, (0, _tools2.createSlug)(aBook.title) + '.html.zip', false, includeZips);
};

},{"../../citations/format":14,"../../exporter/epub":17,"../../exporter/html":19,"../../exporter/json":20,"../../exporter/tools":22,"../../exporter/zip":25,"./html-templates":8,"./tools":12,"katex":27}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template to create the latex book index. */
var latexBookIndexTemplate = exports.latexBookIndexTemplate = _.template('\
    <%= latexStart %>\
    <% _.each(aBook.chapters,function(chapter){ %>\
        <% if(chapter.part && chapter.part != "") { %>\
            \n\t\\part{<%= chapter.part %>}\
         <% } %>\
        \n\t\\include{chapter-<%= chapter.number%>}\
    <% }); %>\
    <%= latexEnd %>\
');

},{}],11:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadLatex = undefined;

var _tools = require("./tools");

var _latexTemplates = require("./latex-templates");

var _json = require("../../exporter/json");

var _latex = require("../../exporter/latex");

var _tools2 = require("../../exporter/tools");

var _zip = require("../../exporter/zip");

var downloadLatex = exports.downloadLatex = function downloadLatex(aBook) {
    (0, _tools.getMissingChapterData)(aBook, function () {
        (0, _tools.getImageAndBibDB)(aBook, function (anImageDB, aBibDB) {
            latexBookExport(aBook, anImageDB, aBibDB);
        });
    });
};

var latexBookExport = function latexBookExport(aBook, anImageDB, aBibDB) {
    var htmlCode = undefined,
        outputList = [],
        images = [],
        listedWorksList = [],
        allContent = document.createElement('div');

    aBook.chapters = _.sortBy(aBook.chapters, function (chapter) {
        return chapter.number;
    });

    for (var i = 0; i < aBook.chapters.length; i++) {

        var aDocument = _.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        });

        var title = aDocument.title;

        var contents = (0, _json.obj2Node)(aDocument.contents);

        allContent.innerHTML += contents.innerHTML;

        images = images.concat((0, _tools2.findImages)(contents));

        var latexCode = (0, _latex.htmlToLatex)(title, aDocument.owner.name, contents, aBibDB, aDocument.settings, aDocument.metadata, true, listedWorksList);

        listedWorksList = latexCode.listedWorksList;

        outputList.push({
            filename: 'chapter-' + aBook.chapters[i].number + '.tex',
            contents: latexCode.latex
        });
    }
    var author = aBook.owner_name;
    if (aBook.metadata.author && aBook.metadata.author != '') {
        author = aBook.metadata.author;
    }

    var documentFeatures = (0, _latex.findLatexDocumentFeatures)(allContent, aBook.title, author, aBook.metadata.subtitle, aBook.metadata.keywords, aBook.metadata.author, aBook.metadata, 'book');

    var latexStart = documentFeatures.latexStart;
    var latexEnd = documentFeatures.latexEnd;

    outputList.push({
        filename: (0, _tools2.createSlug)(aBook.title) + '.tex',
        contents: (0, _latexTemplates.latexBookIndexTemplate)({
            aBook: aBook,
            latexStart: latexStart,
            latexEnd: latexEnd
        })
    });

    var bibtex = new bibliographyHelpers.bibLatexExport(listedWorksList, aBibDB);

    if (bibtex.bibtex_str.length > 0) {
        outputList.push({
            filename: 'bibliography.bib',
            contents: bibtex.bibtex_str
        });
    }

    images = (0, _tools.uniqueObjects)(images);

    (0, _zip.zipFileCreator)(outputList, images, (0, _tools2.createSlug)(aBook.title) + '.latex.zip');
};

},{"../../exporter/json":20,"../../exporter/latex":21,"../../exporter/tools":22,"../../exporter/zip":25,"./latex-templates":10,"./tools":12}],12:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var getMissingChapterData = exports.getMissingChapterData = function getMissingChapterData(aBook, callback) {
    var bookDocuments = [];

    for (var i = 0; i < aBook.chapters.length; i++) {
        if (!_.findWhere(theDocumentList, { id: aBook.chapters[i].text })) {
            $.addAlert('error', "Cannot produce book as you lack access rights to its chapters.");
            return;
        }
        bookDocuments.push(aBook.chapters[i].text);
    }
    documentHelpers.getMissingDocumentListData(bookDocuments, callback);
};

var getImageAndBibDB = exports.getImageAndBibDB = function getImageAndBibDB(aBook, callback) {
    var documentOwners = [];
    for (var i = 0; i < aBook.chapters.length; i++) {
        documentOwners.push(_.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        }).owner.id);
    }

    documentOwners = _.unique(documentOwners).join(',');

    usermediaHelpers.getAnImageDB(documentOwners, function (anImageDB) {
        bibliographyHelpers.getABibDB(documentOwners, function (aBibDB) {
            callback(anImageDB, aBibDB);
        });
    });
};

var uniqueObjects = exports.uniqueObjects = function uniqueObjects(array) {
    var results = [];

    for (var i = 0; i < array.length; i++) {
        var willCopy = true;
        for (var j = 0; j < i; j++) {
            if (_.isEqual(array[i], array[j])) {
                willCopy = false;
                break;
            }
        }
        if (willCopy) {
            results.push(array[i]);
        }
    }

    return results;
};

},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for the list of books */
var bookListTemplate = exports.bookListTemplate = _.template('\
<% _.each(theBookList,function(aBook,key,list){%>\
    <tr id="Book_<%- aBook.id %>" <% if (theUser.id == aBook.owner) { %>class="owned-by-user"<% } %> >\
       <td width="20">\
           <span class="fw-inline">\
               <input type="checkbox" class="entry-select"\
                   data-id="<%- aBook.id %>"\
                   data-owner="<%- aBook.owner %>"/>\
           </span>\
       </td>\
       <td width="225">\
           <span class="fw-document-table-title fw-inline">\
               <i class="icon-book"></i>\
               <span class="book-title fw-link-text fw-searchable" data-id="<%- aBook.id %>">\
                   <%  if (aBook.title.length > 0) { %>\
                       <%- aBook.title %>\
                   <% } else { %>\
                       ' + gettext('Untitled') + '\
                   <% } %>\
               </span>\
           </span>\
       </td>\
       <td width="115">\
           <span class="fw-inline"><%- aBook.added %></span>\
       </td>\
       <td width="115">\
           <span class="fw-inline"><%- aBook.updated %></span>\
       </td>\
       <td width="170">\
           <span>\
               <img class="fw-avatar" src="<%- aBook.owner_avatar %>" />\
           </span>\
           <span class="fw-inline fw-searchable"><%- aBook.owner_name %></span>\
       </td>\
       <td width="60" align="center">\
           <span class="rights fw-inline" data-id="<%- aBook.id %>">\
               <i data-id="<%- aBook.id %>" class="icon-access-right <%- aBook.rights %>"></i>\
           </span>\
       </td>\
        <td width="40" align="center">\
           <span class="delete-book fw-inline fw-link-text" data-id="<%- aBook.id %>" data-title="<%- aBook.title %>">\
               <% if (theUser.id === aBook.owner) { %><i class="icon-trash"></i><% } %>\
           </span>\
       </td>\
   </tr>\
<% }); %>');

/** A template for the Fidus Writer document file uploader. */
/*var tmp_import_fidus = _.template('<div id="importfidus" title="' + gettext('Import a Fidus file') + '">\
        <form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">\
            <input type="file" id="fidus-uploader" name="fidus" required />\
            <span id="import-fidus-btn" class="fw-button fw-white fw-large">' + gettext('Select a file') + '</span>\
            <label id="import-fidus-name" class="ajax-upload-label"></label>\
        </form>\
    </div>');*/

/** A template for the basic info book template pane */
var bookBasicInfoTemplate = exports.bookBasicInfoTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Title") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-title" value="<%- theBook.title %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Author") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-author" value="<%- theBook.metadata.author %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Subtitle") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-subtitle" value="<%- theBook.metadata.subtitle %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Publisher") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-publisher" value="<%- theBook.metadata.publisher %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Copyright notice") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-copyright" value="<%- theBook.metadata.copyright %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title" title="' + gettext("Comma separated keywords") + '">' + gettext("Keywords") + '</h4>\
        </th>\
        <td>\
            <input class="entryForm" type="text" id="book-metadata-keywords" value="<%- theBook.metadata.keywords %>" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
        </td>\
    </tr>\
');

/** A template for the citation style pane of the book dialog */
var bookBibliographyDataTemplate = exports.bookBibliographyDataTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Citation style") + '</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-citationstyle" id="book-settings-citationstyle" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each(citeproc.styles, function(citationstyle, key) { %>\
                <option value="<%= key %>"<% if(key == theBook.settings.citationstyle) { %> selected<%} %>><%= citeproc.styles[key].name %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
');

/** A template for the print related data pane of the book dialog */
var bookPrintDataTemplate = exports.bookPrintDataTemplate = _.template('\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Document style") + '</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-documentstyle" id="book-settings-documentstyle" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each(documentStyleList, function(documentstyle) { %>\
                <option value="<%= documentstyle.filename %>"<% if(documentstyle.filename == theBook.settings.documentstyle) { %> selected<%} %>><%= documentstyle.title %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
    <tr>\
        <th>\
            <h4 class="fw-tablerow-title">' + gettext("Paper size") + '</h4>\
        </th>\
        <td>\
        <select class="entryForm dk" name="book-settings-papersize" id="book-settings-papersize" <% if (theBook.rights==="r") {print("disabled=disabled")} %> >\
            <% _.each([["folio","' + gettext("Folio (15 x 12 inch)") + '"],["quarto","' + gettext("Quarto (12 × 9 inch)") + '"],["octavo","' + gettext("Octavo (9 x 6 inch)") + '"],["a5","' + gettext("A5") + '"],["a4","' + gettext("A4") + '"]], function(papersize) { %>\
                <option value="<%= papersize[0] %>"<% if(papersize[0] == theBook.settings.papersize) { %> selected<%} %>><%= papersize[1] %></option>\
            <% }) %>\
        </select>\
        </td>\
    </tr>\
');
/** A template for the epub related data pane of the book dialog */
var bookEpubDataTemplate = exports.bookEpubDataTemplate = _.template('\
    <tr id="figure-preview-row">\
        <%= coverImage %>\
    </tr>\
    ');

/** A template for the cover image input on the epub pane of the book dialog. */
var bookEpubDataCover = exports.bookEpubDataCover = _.template('\
        <th class="figure-preview-row">\
            <h4 class="fw-tablerow-title">' + gettext("Cover image") + '</h4>\
        </th>\
        <td>\
            <div class="figure-preview">\
                <div id="inner-figure-preview">\
                    <% if (theBook.cover_image) {%>\
                        <img src="<%= anImageDB[theBook.cover_image].image %>">\
                    <% } %>\
                </div>\
            </div>\
        </td>\
        <% if (theBook.rights==="w") { %>\
            <td class="figure-preview-row">\
                <button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only fw-button fw-dark" id="select-cover-image-button" role="button" aria-disabled="false">\
                    <span class="ui-button-text">' + gettext('Select Image') + '</span>\
                </button>\
                <% if (theBook.cover_image) {%>\
                    <button type="button" class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only fw-button fw-orange" id="remove-cover-image-button" role="button" aria-disabled="false">\
                        <span class="ui-button-text">' + gettext('Remove Image') + '</span>\
                    </button>\
                <% } %>\
            </td>\
        <% } %>\
');

/** A template for the cover image selection for the epub version of a book. */
var bookCoverImageSelectionTemplate = exports.bookCoverImageSelectionTemplate = _.template('\
    <div id="book-cover-image-selection">\
        <table id="imagelist" class="tablesorter fw-document-table" style="width:342px;">\
            <thead class="fw-document-table-header">\
                <tr>\
                    <th width="50">' + gettext('Image') + '</th>\
                    <th width="150">' + gettext('Title') + '</th>\
                </tr>\
            </thead>\
            <tbody class="fw-document-table-body fw-small">\
                <% _.each(anImageDB, function (image) { %>\
                    <tr id="Image_<%- image.pk %>">\
                        <td class="type" style="width:100px;">\
                            <img src="<%- image.thumbnail %>" style="max-heigth:30px;max-width:30px;">\
                        </td>\
                        <td class="title" style="width:212px;">\
                            <span class="fw-inline">\
                                <span class="edit-image fw-link-text icon-figure" data-id="<%- image.pk %>">\
                                    <%- image.title %>\
                                </span>\
                            </span>\
                        </td>\
                        <td class="checkable" style="width:30px;">\
                        </td>\
                    </tr>\
                <% }) %>\
            </tbody>\
        </table>\
        <div class="dialogSubmit">\
            <button class="edit-image createNew fw-button fw-light">' + gettext('Upload new image') + '<span class="icon-plus-circle"></span>\
            </button>\
            <button type="button" id="selectImageFigureButton" class="fw-button fw-dark">' + gettext('Use selected image') + '</button>\
                        <button type="button" id="cancelImageFigureButton" class="fw-button fw-orange">' + gettext('Cancel') + '</button>\
        </div>\
    </div>\
');

/** A template for the book dialog. */
var tmp_book_dialog = _.template('\
    <div id="book-dialog" title="<%- dialogHeader %>">\
        <div id="bookoptionsTab">\
            <ul>\
                <li><a href="#optionTab1" class="fw-button fw-large">' + gettext('Basic info') + '</a></li>\
                <li><a href="#optionTab2" class="fw-button fw-large">' + gettext('Chapters') + '</a></li>\
                <li><a href="#optionTab3" class="fw-button fw-large">' + gettext('Bibliography') + '</a></li>\
                <li><a href="#optionTab4" class="fw-button fw-large">' + gettext('Epub') + '</a></li>\
                <li><a href="#optionTab5" class="fw-button fw-large">' + gettext('Print/PDF') + '</a></li>\
            </ul>\
            <div id="optionTab1"><table class="fw-dialog-table"><tbody><%= basicInfo %></tbody></table></div>\
            <div id="optionTab2"><%= chapters %></div>\
            <div id="optionTab3"><table class="fw-dialog-table"><tbody><%= bibliographyData %></tbody></table></div>\
            <div id="optionTab4"><table class="fw-dialog-table fw-media-uploader"><tbody><%= epubData %></tbody></table></div>\
            <div id="optionTab5"><table class="fw-dialog-table"><tbody><%= printData %></tbody></table></div>\
        </div>\
    </div>');

/** A template for the chapter pane of the book dialog. */
var bookDialogChaptersTemplate = _.template('\
    <% if (theBook.rights==="w") { %>\
        <div class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("My documents") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="332">' + gettext("Documents") + '</th></tr></thead>\
                <tbody class="fw-document-table-body fw-small" id="book-document-list">\
                    <%= documents %>\
                </tbody>\
            </table>\
        </div>\
        <span id="add-chapter" class="fw-button fw-large fw-square fw-light fw-ar-button"><i class="icon-right"></i></span>\
    <% } %>\
        <div class="fw-ar-container">\
            <h3 class="fw-green-title">' + gettext("Book chapters") + '</h3>\
            <table class="fw-document-table">\
                <thead class="fw-document-table-header"><tr><th width="242">' + gettext("Title") + '</th>\
                <% if (theBook.rights==="w") { %>\
                    <th width="30">' + gettext("Sort") + '</th><th width="50">' + gettext("Delete") + '</th></tr></thead>\
                <% } %>\
                <tbody class="fw-document-table-body fw-small" id="book-chapter-list">\
                    <%= chapters %>\
                </tbody>\
            </table>\
        </div>\
    ');

/** A template for the chapter list on the chapter pane the book dialog. */
var bookChapterListTemplate = exports.bookChapterListTemplate = _.template('\
    <% var partCounter = 1; %>\
    <% _.each(_.sortBy(theBook.chapters, function (chapter) {return chapter.number;}), function(aChapter,index,list) { %>\
        <% var aDocument = _.findWhere(theDocumentList, {id: aChapter.text});%>\
            <tr class="<% if(typeof(aDocument) === "undefined") {print("noaccess")} %>" >\
                <td width="222" data-id="<%- aChapter.text %>" class="fw-checkable-td">\
                    <span class="fw-inline">\
                        <% if(typeof(aDocument) === "undefined") {%>\
                            <i class="icon-minus-circle"></i>\
                        <% } %>\
                        <% if (aChapter.part!="") { %>\
                            <b class="part"><%- partCounter++ %>. ' + gettext('Book part') + ': <%- aChapter.part %></b><br>\
                        <% } %>\
                        <%- aChapter.number %>. \
                        <% var documentTitle; if (0===aDocument.title.length) {documentTitle="' + gettext('Untitled') + '";} else {documentTitle=aDocument.title;} %>\
                        <%- documentTitle %>\
                    </span>\
                </td>\
                <% if (theBook.rights==="w") { %>\
                    <td width="30" data-id="<%- aChapter.text %>" class="edit-chapter">\
                        <i class="icon-edit fw-link-text"></i>\
                    </td>\
                        <% if (index!=0) { %>\
                            <td width="10" class="book-sort-up" data-id="<%- aChapter.text %>">\
                                <i class="icon-sort-up fw-link-text"></i>\
                            </td>\
                        <% } else { %>\
                            <td width="10"></td>\
                        <% } %>\
                        <% if ((index+1)!=list.length) { %>\
                            <td width="10" class="book-sort-down" data-id="<%- aChapter.text %>">\
                                <i class="icon-sort-down fw-link-text"></i>\
                            </td>\
                        <% } else { %>\
                            <td width="10"></td>\
                        <% } %>\
                        <td width="50" align="center">\
                            <span class="delete-chapter fw-inline" data-id="<%- aChapter.text %>"><i class="icon-trash fw-link-text"></i></span>\
                        </td>\
                    <% } else { %>\
                        <td width="30"></td>\
                        <td width="10"></td>\
                        <td width="10"></td>\
                        <td width="50"></td>\
                    <% } %>\
            </tr>\
    <% }) %>\
    ');
/** A template for the document list on the chapter pane of the book dialog */
var bookDocumentListTemplate = exports.bookDocumentListTemplate = _.template('\
      <% _.each(theDocumentList, function(aDocument) { %>\
          <% var documentTitle; if (0===aDocument.title.length) {documentTitle="' + gettext('Untitled') + '";} else {documentTitle=aDocument.title;} %>\
          <% if (!(_.findWhere(theBook.chapters, {text:aDocument.id}))) { %>\
              <tr>\
                  <td width="332" data-id="<%- aDocument.id %>" class="fw-checkable fw-checkable-td">\
                      <span class="fw-inline">\
                          <%- documentTitle %>\
                      </span>\
                  </td>\
              </tr>\
          <% } %>\
      <% }) %>\
      ');

/** A template for the chapter dialog for books */
var bookChapterDialogTemplate = exports.bookChapterDialogTemplate = _.template('\
    <div id="book-chapter-dialog" title="<%- dialogHeader %>">\
        <table class="fw-dialog-table">\
            <tr>\
                <th>\
                    <h4 title="' + gettext('If this chapter starts a part of the book, specify the title of that part here') + '">' + gettext('Book part title') + '</h4>\
                </th>\
                <td>\
                    <input type="text" id="book-chapter-part" value="<%- aChapter.part %>">\
                </td>\
           </tr>\
       </table>\
    </div>\
    ');

},{}],14:[function(require,module,exports){
'use strict';

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Functions to display citations and the bibliography.
 */

var formatCitations = exports.formatCitations = function formatCitations(contentElement, citationstyle, aBibDB) {
    var bibliographyHTML = '',
        allCitations = jQuery(contentElement).find('.citation'),
        listedWorksCounter = 0,
        citeprocParams = [],
        bibFormats = [],
        citationsIds = [];

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

    var citeprocObj = getFormattedCitations(citeprocParams, citationstyle, bibFormats, aBibDB);

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

var citeprocSys = (function () {
    function citeprocSys() {
        _classCallCheck(this, citeprocSys);

        this.abbreviations = {
            "default": {}
        };
        this.abbrevsname = "default";
    }

    _createClass(citeprocSys, [{
        key: 'retrieveItem',
        value: function retrieveItem(id) {
            return CSLDB[id];
        }
    }, {
        key: 'retrieveLocale',
        value: function retrieveLocale(lang) {
            return citeproc.locals[lang];
        }
    }, {
        key: 'getAbbreviation',
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

var getFormattedCitations = function getFormattedCitations(citations, citationStyle, citationFormats, aBibDB) {
    bibliographyHelpers.setCSLDB(aBibDB);

    if (citeproc.styles.hasOwnProperty(citationStyle)) {
        citationStyle = citeproc.styles[citationStyle];
    } else {
        for (styleName in citeproc.styles) {
            citationStyle = citeproc.styles[styleName];
            break;
        }
    }

    var citeprocInstance = new CSL.Engine(new citeprocSys(), citationStyle.definition);

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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for each CSS item of an epub's OPF file. */
var opfCssItemTemplatePart = exports.opfCssItemTemplatePart = '\t\t\t<item id="css<%= index %>" href="<%= item.filename %>" media-type="text/css" />\n';

/** A template for each image in an epub's OPF file. */
var opfImageItemTemplatePart = exports.opfImageItemTemplatePart = '\t\t\t<item <% if (item.coverImage) { %>id="cover-image" properties="cover-image"<% } else { %>id="img<%= index %>"<% } %> href="<%= item.filename %>" media-type="image/<% if (item.filename.split(".")[1]==="png") { %>png<% } else if (item.filename.split(".")[1]==="svg") { %>svg+xml<% } else { %>jpeg<% } %>" />\n';

/** A template for the OPF file of an epub. */
var opfTemplate = exports.opfTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= id %></dc:identifier>\n\
    \t\t<dc:title><%= title %></dc:title>\n\
    <% _.each(authors,function(author){ %>\
        \t\t<dc:creator><%= author %></dc:creator>\n\
    <% }); %>\
    <% _.each(keywords,function(keyword){ %>\
        \t\t<dc:subject><%= keyword %></dc:subject>\n\
    <% }); %>\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    \t</metadata>\n\
    \t<manifest>\n\
    \t\t<item id="t1" href="document.xhtml" media-type="application/xhtml+xml" />\n\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <% _.each(images,function(item, index){ %>' + opfImageItemTemplatePart + '<% }); %>\
        <% _.each(styleSheets,function(item, index){ %>' + opfCssItemTemplatePart + '<% }); %>\
        <% if (math) {%> <%= katexOpfIncludes %><% } %>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
    \t\t<itemref idref="t1" />\n\
    \t</spine>\n\
    </package>');

/** A template for the contianer XML of an epub file. */
var containerTemplate = exports.containerTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n\
    \t<rootfiles>\n\
    \t\t<rootfile full-path="EPUB/document.opf" media-type="application/oebps-package+xml"/>\n\
    \t</rootfiles>\n\
    </container>');

/** A template of the NCX file of an epub. */
var ncxTemplate = exports.ncxTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/" xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="<%= shortLang %>">\n\
        \t<head>\n\
                \t\t<meta name="dtb:<%= idType %>" content="<%= id %>"/>\n\
        \t</head>\n\
        \t<docTitle>\n\
            \t\t<text><%= title %></text>\n\
        \t</docTitle>\n\
        \t<navMap>\n\
                \t\t<!-- 2.01 NCX: playOrder is optional -->\n\
            <% _.each(contentItems,function(item){ %>\
               <%= templates.ncxItemTemplate({"item":item,"templates":templates})%>\
            <% }); %>\
        \t</navMap>\n\
    </ncx>');

/** A template for each list item in the navMap of an epub's NCX file. */
var ncxItemTemplate = exports.ncxItemTemplate = _.template('\
\t\t<navPoint id="<%= item.id %><% if (item.docNum) {print("-"+item.docNum);}%>">\n\
        \t\t\t<navLabel>\n\
            \t\t\t\t<text><%= item.title %></text>\n\
        \t\t\t</navLabel>\n\
        \t\t\t<content src="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id) } %>"/>\n\
        <% _.each(item.subItems, function(item) { %>\
            <%= templates.ncxItemTemplate({"item":item,"templates":templates})%>\
        <% }); %>\
    \t\t</navPoint>\n');

/** A template for each CSS item in an epub document file. */
var xhtmlCssItemTemplatePart = '\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />';

/** A template for a document in an epub. */
var xhtmlTemplate = exports.xhtmlTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>"\
        xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title><%= title %></title>\
        <% if(math){ %><link rel="stylesheet" type="text/css" href="katex.min.css" /><% } %>\
        <% _.each(styleSheets,function(item){ %>' + xhtmlCssItemTemplatePart + '<% }); %>\
        </head><body>\
        <% if (part && part !="") {%>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <%= body %></body></html>');

/** A template for an epub's navigation document. */
var navTemplate = exports.navTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>" xmlns:epub="http://www.idpf.org/2007/ops">\n\
    \t<head>\n\
    \t\t<meta charset="utf-8"></meta>\n\
    \t</head>\n\
    \t<body>\n\
    \t\t<nav epub:type="toc" id="toc">\n\
    \t\t\t<ol>\n\
        <% _.each(contentItems,function(item){ %>\
            <%= templates.navItemTemplate({"item":item, "templates":templates})%>\
        <% }); %>\
    \t\t\t</ol>\n\
    \t\t</nav>\n\
    \t</body>\n\
    </html>');

/** A template for each item in an epub's navigation document. */
var navItemTemplate = exports.navItemTemplate = _.template('\t\t\t\t<li><a href="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id); } %>"><%= item.title %></a>\
    <% if (item.subItems.length > 0) { %>\
        <ol>\
            <% _.each(item.subItems,function(item){ %>\
                <%= templates.navItemTemplate({"item":item, "templates": templates})%>\
            <% }); %>\
        </ol>\
    <% } %>\
</li>\n');

},{}],17:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.orderLinks = exports.setLinks = exports.downloadEpub = exports.getTimestamp = exports.styleEpubFootnotes = undefined;

var _html = require("./html");

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var _epubTemplates = require("./epub-templates");

var _opfIncludes = require("../katex/opf-includes");

var _katex = require("katex");

var templates = { ncxTemplate: _epubTemplates.ncxTemplate, ncxItemTemplate: _epubTemplates.ncxItemTemplate, navTemplate: _epubTemplates.navTemplate, navItemTemplate: _epubTemplates.navItemTemplate };

var styleEpubFootnotes = exports.styleEpubFootnotes = function styleEpubFootnotes(htmlCode) {
    // Converts RASH style footnotes into epub footnotes.
    var footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'));
    var footnoteCounter = 1;
    footnotes.forEach(function (footnote) {
        var newFootnote = document.createElement('aside');
        newFootnote.setAttribute('epub:type', 'footnote');
        newFootnote.id = footnote.id;
        while (footnote.firstChild) {
            newFootnote.appendChild(footnote.firstChild);
        }
        newFootnote.firstChild.innerHTML = footnoteCounter + ' ' + newFootnote.firstChild.innerHTML;
        footnote.parentNode.replaceChild(newFootnote, footnote);
        footnoteCounter++;
    });
    var footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('a.fn'));
    var footnoteMarkerCounter = 1;
    footnoteMarkers.forEach(function (fnMarker) {
        var newFnMarker = document.createElement('sup');
        var newFnMarkerLink = document.createElement('a');
        newFnMarkerLink.setAttribute('epub:type', 'noteref');
        newFnMarkerLink.setAttribute('href', fnMarker.getAttribute('href'));
        newFnMarkerLink.innerHTML = footnoteMarkerCounter;
        newFnMarker.appendChild(newFnMarkerLink);
        fnMarker.parentNode.replaceChild(newFnMarker, fnMarker);
        footnoteMarkerCounter++;
    });

    return htmlCode;
};

var getTimestamp = exports.getTimestamp = function getTimestamp() {
    var today = new Date();
    var second = today.getUTCSeconds();
    var minute = today.getUTCMinutes();
    var hour = today.getUTCHours();
    var day = today.getUTCDate();
    var month = today.getUTCMonth() + 1; //January is 0!
    var year = today.getUTCFullYear();

    if (second < 10) {
        second = '0' + second;
    }
    if (minute < 10) {
        minute = '0' + minute;
    }
    if (hour < 10) {
        hour = '0' + hour;
    }
    if (day < 10) {
        day = '0' + day;
    }
    if (month < 10) {
        month = '0' + month;
    }

    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + 'Z';
};

var downloadEpub = exports.downloadEpub = function downloadEpub(aDocument, inEditor) {
    if (inEditor || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var styleSheets = []; //TODO: fill style sheets with something meaningful.
    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Epub export has been initiated.'));

    var contents = (0, _html.joinDocumentParts)(aDocument, aBibDB);
    contents = (0, _html.addFigureNumbers)(contents);

    var images = (0, _tools.findImages)(contents);

    var contentsBody = document.createElement('body');

    while (contents.firstChild) {
        contentsBody.appendChild(contents.firstChild);
    }

    var equations = contentsBody.querySelectorAll('.equation');

    var figureEquations = contentsBody.querySelectorAll('.figure-equation');

    var math = false;

    if (equations.length > 0 || figureEquations.length > 0) {
        math = true;
    }

    for (var i = 0; i < equations.length; i++) {
        var node = equations[i];
        var formula = node.getAttribute('data-equation');
        (0, _katex.render)(formula, node);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        var node = figureEquations[i];
        var formula = node.getAttribute('data-equation');
        (0, _katex.render)(formula, node, {
            displayMode: true
        });
    }

    // Make links to all H1-3 and create a TOC list of them
    var contentItems = orderLinks(setLinks(contentsBody));

    var contentsBodyEpubPrepared = styleEpubFootnotes(contentsBody);

    var xhtmlCode = (0, _epubTemplates.xhtmlTemplate)({
        part: false,
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        styleSheets: styleSheets,
        math: math,
        body: (0, _json.obj2Node)((0, _json.node2Obj)(contentsBodyEpubPrepared), 'xhtml').innerHTML
    });

    xhtmlCode = (0, _html.replaceImgSrc)(xhtmlCode);

    var containerCode = (0, _epubTemplates.containerTemplate)({});

    var timestamp = getTimestamp();

    var authors = [aDocument.owner.name];

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.authors);
        if (tempNode.textContent.length > 0) {
            authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
        }
    }

    var keywords = [];

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.keywords);
        if (tempNode.textContent.length > 0) {
            keywords = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
        }
    }

    var opfCode = (0, _epubTemplates.opfTemplate)({
        language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        authors: authors,
        keywords: keywords,
        idType: 'fidus',
        id: aDocument.id,
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets: styleSheets,
        math: math,
        images: images,
        katexOpfIncludes: _opfIncludes.katexOpfIncludes
    });

    var ncxCode = (0, _epubTemplates.ncxTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        idType: 'fidus',
        id: aDocument.id,
        contentItems: contentItems,
        templates: templates
    });

    var navCode = (0, _epubTemplates.navTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems,
        templates: templates
    });

    var outputList = [{
        filename: 'META-INF/container.xml',
        contents: containerCode
    }, {
        filename: 'EPUB/document.opf',
        contents: opfCode
    }, {
        filename: 'EPUB/document.ncx',
        contents: ncxCode
    }, {
        filename: 'EPUB/document-nav.xhtml',
        contents: navCode
    }, {
        filename: 'EPUB/document.xhtml',
        contents: xhtmlCode
    }];

    for (var i = 0; i < styleSheets.length; i++) {
        var styleSheet = styleSheets[i];
        outputList.push({
            filename: 'EPUB/' + styleSheet.filename,
            contents: styleSheet.contents
        });
    }

    var httpOutputList = [];
    for (var i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        });
    }
    var includeZips = [];
    if (math) {
        includeZips.push({
            'directory': 'EPUB',
            'url': staticUrl + 'zip/katex-style.zip'
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.epub', 'application/epub+zip', includeZips);
};

var setLinks = exports.setLinks = function setLinks(htmlCode, docNum) {
    var contentItems = [],
        title = undefined;

    jQuery(htmlCode).find('h1,h2,h3').each(function () {
        title = jQuery.trim(this.textContent);
        if (title !== '') {
            var contentItem = {};
            contentItem.title = title;
            contentItem.level = parseInt(this.tagName.substring(1, 2));
            if (docNum) {
                contentItem.docNum = docNum;
            }
            if (this.classList.contains('title')) {
                contentItem.level = 0;
            }
            this.id = 'id' + contentItems.length;

            contentItem.id = this.id;
            contentItems.push(contentItem);
        }
    });
    return contentItems;
};

var orderLinks = exports.orderLinks = function orderLinks(contentItems) {
    for (var i = 0; i < contentItems.length; i++) {
        contentItems[i].subItems = [];
        if (i > 0) {
            for (var j = i - 1; j > -1; j--) {
                if (contentItems[j].level < contentItems[i].level) {
                    contentItems[j].subItems.push(contentItems[i]);
                    contentItems[i].delete = true;
                    break;
                }
            }
        }
    }

    for (var i = contentItems.length; i > -1; i--) {
        if (contentItems[i] && contentItems[i].delete) {
            delete contentItems[i].delete;
            contentItems.splice(i, 1);
        }
    }
    return contentItems;
};

},{"../katex/opf-includes":26,"./epub-templates":16,"./html":19,"./json":20,"./tools":22,"./zip":25,"katex":27}],18:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for HTML export of a document. */
var htmlExportTemplate = exports.htmlExportTemplate = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% var tempNode; %>\
        <% _.each(styleSheets, function(item){ %>\
            \t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />\
        <% }); %>\
        </head><body>\
        <% if (part && part !="") { %>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <%= contents %></body></html>');

},{}],19:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.replaceImgSrc = exports.addFigureNumbers = exports.cleanHTML = exports.joinDocumentParts = exports.downloadHtml = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var _htmlTemplates = require("./html-templates");

var _format = require("../citations/format");

var _katex = require("katex");

var downloadHtml = exports.downloadHtml = function downloadHtml(aDocument, inEditor) {
    if (inEditor || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var joinDocumentParts = exports.joinDocumentParts = function joinDocumentParts(aDocument, aBibDB) {

    var contents = document.createElement('div');

    if (aDocument.contents) {
        var tempNode = (0, _json.obj2Node)(aDocument.contents);

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }
    }

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.keywords);
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'keywords';
            contents.insertBefore(tempNode, contents.firstChild);
        }
    }

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.authors);
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'authors';
            contents.insertBefore(tempNode, contents.firstChild);
        }
    }

    if (aDocument.settings['metadata-abstract'] && aDocument.metadata.abstract) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.abstract);
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'abstract';
            contents.insertBefore(tempNode, contents.firstChild);
        }
    }

    if (aDocument.settings['metadata-subtitle'] && aDocument.metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'subtitle';
            contents.insertBefore(tempNode, contents.firstChild);
        }
    }

    if (aDocument.title) {
        var tempNode = document.createElement('h1');
        tempNode.classList.add('title');
        tempNode.textContent = aDocument.title;
        contents.insertBefore(tempNode, contents.firstChild);
    }

    var bibliography = (0, _format.formatCitations)(contents, aDocument.settings.citationstyle, aBibDB);

    if (bibliography.length > 0) {
        var tempNode = document.createElement('div');
        tempNode.innerHTML = bibliography;
        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }
    }

    contents = cleanHTML(contents);
    return contents;
};

var export1 = function export1(aDocument, aBibDB) {
    var styleSheets = [],
        math = false;

    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('HTML export has been initiated.'));

    var contents = joinDocumentParts(aDocument, aBibDB);

    var equations = contents.querySelectorAll('.equation');

    var figureEquations = contents.querySelectorAll('.figure-equation');

    if (equations.length > 0 || figureEquations.length > 0) {
        math = true;
        styleSheets.push({ filename: 'katex.min.css' });
    }

    for (var i = 0; i < equations.length; i++) {
        var node = equations[i];
        var formula = node.getAttribute('data-equation');
        (0, _katex.render)(formula, node);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        var node = figureEquations[i];
        var formula = node.getAttribute('data-equation');
        (0, _katex.render)(formula, node, {
            displayMode: true
        });
    }

    var includeZips = [];

    var httpOutputList = (0, _tools.findImages)(contents);

    contents = addFigureNumbers(contents);

    var contentsCode = replaceImgSrc(contents.innerHTML);

    var htmlCode = (0, _htmlTemplates.htmlExportTemplate)({
        part: false,
        title: title,
        metadata: aDocument.metadata,
        settings: aDocument.settings,
        styleSheets: styleSheets,
        contents: contentsCode
    });

    var outputList = [{
        filename: 'document.html',
        contents: htmlCode
    }];

    for (var i = 0; i < styleSheets.length; i++) {
        var styleSheet = styleSheets[i];
        if (styleSheet.contents) {
            outputList.push(styleSheet);
        }
    }

    if (math) {
        includeZips.push({
            'directory': '',
            'url': staticUrl + 'zip/katex-style.zip'
        });
    }
    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.html.zip', false, includeZips);
};

var cleanHTML = exports.cleanHTML = function cleanHTML(htmlCode) {

    // Replace the footnotes with markers and the footnotes to the back of the
    // document, so they can survive the normalization that happens when
    // assigning innerHTML.
    // Also link the footnote marker with the footnote according to
    // https://rawgit.com/essepuntato/rash/master/documentation/index.html#footnotes.
    var footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote'));
    var footnotesContainer = document.createElement('section');
    footnotesContainer.id = 'fnlist';
    footnotesContainer.setAttribute('role', 'doc-footnotes');

    footnotes.forEach(function (footnote, index) {
        var footnoteMarker = document.createElement('a');
        var counter = index + 1;
        footnoteMarker.setAttribute('href', '#fn' + counter);
        // RASH 0.5 doesn't mark the footnote markers, so we add this class
        footnoteMarker.classList.add('fn');
        footnote.parentNode.replaceChild(footnoteMarker, footnote);
        var newFootnote = document.createElement('section');
        newFootnote.id = 'fn' + counter;
        newFootnote.setAttribute('role', 'doc-footnote');
        while (footnote.firstChild) {
            newFootnote.appendChild(footnote.firstChild);
        }
        footnotesContainer.appendChild(newFootnote);
    });
    htmlCode.appendChild(footnotesContainer);

    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    /* Related to tracked changes
    jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = ''
    })
     jQuery(htmlCode).find('.ins').each(function() {
        this.outerHTML = this.innerHTML
    })
     END tracked changes */

    jQuery(htmlCode).find('.comment').each(function () {
        this.outerHTML = this.innerHTML;
    });

    jQuery(htmlCode).find('script').each(function () {
        this.outerHTML = '';
    });

    return htmlCode;
};

var addFigureNumbers = exports.addFigureNumbers = function addFigureNumbers(htmlCode) {

    jQuery(htmlCode).find('figcaption .figure-cat-figure').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-table').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });
    return htmlCode;
};

var replaceImgSrc = exports.replaceImgSrc = function replaceImgSrc(htmlString) {
    htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm, "<$1 src$2>");
    return htmlString;
};

},{"../citations/format":14,"./html-templates":18,"./json":20,"./tools":22,"./zip":25,"katex":27}],20:[function(require,module,exports){
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

},{}],21:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadLatex = exports.htmlToLatex = exports.findLatexDocumentFeatures = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var _html = require("./html");

var findLatexDocumentFeatures = exports.findLatexDocumentFeatures = function findLatexDocumentFeatures(htmlCode, title, author, subtitle, keywords, specifiedAuthors, metadata, documentClass) {
    var documentEndCommands = '';

    var includePackages = "\\usepackage[utf8]{luainputenc}";

    if (subtitle && metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            includePackages += "\n\\usepackage{titling}                \n\\newcommand{\\subtitle}[1]{%                \n\t\\posttitle{%                \n\t\t\\par\\end{center}                \n\t\t\\begin{center}\\large#1\\end{center}                \n\t\t\\vskip 0.5em}%                \n}";
        }
    }

    if (keywords && metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            includePackages += '\n\\def\\keywords{\\vspace{.5em}\
                \n{\\textit{Keywords}:\\,\\relax%\
                \n}}\
                \n\\def\\endkeywords{\\par}';
        }
    }

    if (jQuery(htmlCode).find('a').length > 0) {
        includePackages += "\n\\usepackage{hyperref}";
    }
    if (jQuery(htmlCode).find('.citation').length > 0) {
        includePackages += "\n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}\n\\bibliography{bibliography}";
        documentEndCommands += '\n\n\\printbibliography';
    }

    if (jQuery(htmlCode).find('figure').length > 0) {
        if (htmlCode.innerHTML.search('.svg">') !== -1) {
            includePackages += "\n\\usepackage{svg}";
        }
        if (htmlCode.innerHTML.search('.png">') !== -1 || htmlCode.innerHTML.search('.jpg">') !== -1 || htmlCode.innerHTML.search('.jpeg">') !== -1) {
            includePackages += "\n\\usepackage{graphicx}";
            // The following scales graphics down to text width, but not scaling them up if they are smaller
            includePackages += "\n\\usepackage{calc}\n\\newlength{\\imgwidth}\n\\newcommand\\scaledgraphics[1]{%\n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%\n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%\n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%\n}";
        }
    }
    if (documentClass === 'book') {
        //TODO: abstract environment should possibly only be included if used
        includePackages += '\n\\newenvironment{abstract}{\\rightskip1in\\itshape}{}';
    }

    var latexStart = '\\documentclass{' + documentClass + '}\n' + includePackages + '\n\\begin{document}\n\n\\title{' + title + '}';

    if (specifiedAuthors && metadata.authors) {
        var tempNode = (0, _json.obj2Node)(metadata.authors);
        if (tempNode.textContent.length > 0) {
            author = tempNode.textContent;
        }
    }

    latexStart += '\n\\author{' + author + '}\n';

    if (subtitle && metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\subtitle{' + tempNode.textContent + '}\n';
        }
    }

    latexStart += '\n\\maketitle\n\n';

    if (keywords && metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\begin{keywords}\n' + tempNode.textContent + '\\end{keywords}\n';
        }
    }

    if (documentClass === 'book') {
        if (metadata.publisher) {
            var tempNode = (0, _json.obj2Node)(metadata.publisher);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        if (metadata.copyright) {
            var tempNode = (0, _json.obj2Node)(metadata.copyright);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        latexStart += '\n\\tableofcontents';
    }

    var latexEnd = documentEndCommands + '\n\n\\end{document}';

    return {
        latexStart: latexStart,
        latexEnd: latexEnd
    };
};

var htmlToLatex = exports.htmlToLatex = function htmlToLatex(title, author, htmlCode, aBibDB, settings, metadata, isChapter, listedWorksList) {
    var latexStart = '',
        latexEnd = '';
    if (!listedWorksList) {
        listedWorksList = [];
    }

    // Remove sections that are marked as deleted
    /*jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = ''
    })*/

    if (isChapter) {
        latexStart += '\\chapter{' + title + '}\n';
        //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML
        if (settings['metadata-subtitle'] && metadata.subtitle) {
            var tempNode = (0, _json.obj2Node)(metadata.subtitle);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\section{' + tempNode.textContent + '}\n';
            }
        }
    } else {
        var documentFeatures = findLatexDocumentFeatures(htmlCode, title, author, settings['metadata-subtitle'], settings['metadata-keywords'], settings['metadata-authors'], metadata, 'article');
        latexStart += documentFeatures.latexStart;
        latexEnd += documentFeatures.latexEnd;
    }

    if (settings['metadata-abstract'] && metadata.abstract) {
        var tempNode = (0, _json.obj2Node)(metadata.abstract);
        if (tempNode.textContent.length > 0) {
            tempNode.id = 'abstract';
            htmlCode.insertBefore(tempNode, htmlCode.firstChild);
        }
    }

    htmlCode = (0, _html.cleanHTML)(htmlCode);
    // Replace the footnotes with markers and the footnotes to the back of the
    // document, so they can survive the normalization that happens when
    // assigning innerHTML.
    /*let footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote'))
    let footnotesContainer = document.createElement('div')
    footnotesContainer.id = 'footnotes-container'
     footnotes.forEach(function(footnote) {
        let footnoteMarker = document.createElement('span')
        footnoteMarker.classList.add('footnote-marker')
        footnote.parentNode.replaceChild(footnoteMarker, footnote)
        footnotesContainer.appendChild(footnote)
    })
    htmlCode.appendChild(footnotesContainer)*/

    /*let footnoteMarkersInHeaders = [].slice.call(htmlCode.querySelectorAll(
      'h1 .footnote-marker, h2 .footnote-marker, h3 .footnote-marker, ul .footnote-marker, ol .footnote-marker'
    )
     footnoteMarkersInHeaders.forEach(function (marker) {
        marker.classList.add('keep')
    })*/

    // Replace nbsp spaces with normal ones
    //htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ')

    // Remove line breaks
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/(\r\n|\n|\r)/gm, '');

    // Escape characters that are protected in some way.
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\{/g, '\{');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\}/g, '\}');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\%/g, '\\\%');

    jQuery(htmlCode).find('i').each(function () {
        jQuery(this).replaceWith('\\emph{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('b').each(function () {
        jQuery(this).replaceWith('\\textbf{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('h1').each(function () {
        jQuery(this).replaceWith('<h1>\n\n\\section{' + this.innerHTML + '}\n</h1>');
    });
    jQuery(htmlCode).find('h2').each(function () {
        jQuery(this).replaceWith('<h2>\n\n\\subsection{' + this.innerHTML + '}\n</h2>');
    });
    jQuery(htmlCode).find('h3').each(function () {
        jQuery(this).replaceWith('<h3>\n\n\\subsubsection{' + this.textHTML + '}\n</h3>');
    });
    jQuery(htmlCode).find('p').each(function () {
        jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('li').each(function () {
        jQuery(this).replaceWith('\n\\item ' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('ul').each(function () {
        jQuery(this).replaceWith('<ul>\n\\begin{itemize}' + this.innerHTML + '\\end{itemize}\n</ul>');
    });
    jQuery(htmlCode).find('ol').each(function () {
        jQuery(this).replaceWith('<ol>\n\\begin{enumerated}' + this.innerHTML + '\\end{enumerated}\n</ol>');
    });
    jQuery(htmlCode).find('code').each(function () {
        jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML + '\n\n\\end{code}\n');
    });
    jQuery(htmlCode).find('div#abstract').each(function () {
        jQuery(this).replaceWith('\n\\begin{abstract}\n\n' + this.innerHTML + '\n\n\\end{abstract}\n');
    });

    // join code paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{code}\n\n\\begin{code}\n\n/g, '');
    jQuery(htmlCode).find('blockquote').each(function () {
        jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML + '\n\n\\end{quote}\n');
    });
    // join quote paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{quote}\n\n\\begin{quote}\n\n/g, '');
    // Replace links, except those for footnotes.
    jQuery(htmlCode).find('a:not(.fn)').each(function () {
        jQuery(this).replaceWith('\\href{' + this.href + '}{' + this.innerHTML + '}');
    });
    jQuery(htmlCode).find('.citation').each(function () {
        var citationEntries = this.hasAttribute('data-bib-entry') ? this.getAttribute('data-bib-entry').split(',') : [],
            citationBefore = this.hasAttribute('data-bib-before') ? this.getAttribute('data-bib-before').split(',') : [],
            citationPage = this.hasAttribute('data-bib-page') ? this.getAttribute('data-bib-page').split(',') : [],
            citationFormat = this.hasAttribute('data-bib-format') ? this.getAttribute('data-bib-format') : '',
            citationCommand = '\\' + citationFormat;

        if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
            (function () {
                // multi source citation without page numbers or text before.
                var citationEntryKeys = [];

                citationEntries.forEach(function (citationEntry) {
                    if (aBibDB[citationEntry]) {
                        citationEntryKeys.push(aBibDB[citationEntry].entry_key);
                        if (listedWorksList.indexOf(citationEntry) === -1) {
                            listedWorksList.push(citationEntry);
                        }
                    }
                });

                citationCommand += '{' + citationEntryKeys.join(',') + '}';
            })();
        } else {
            if (citationEntries.length > 1) {
                citationCommand += 's'; // Switching from \autocite to \autocites
            }

            citationEntries.forEach(function (citationEntry, index) {
                if (!aBibDB[citationEntry]) {
                    return false; // Not present in bibliography database, skip it.
                }

                if (citationBefore[index] && citationBefore[index].length > 0) {
                    citationCommand += '[' + citationBefore[index] + ']';
                    if (!citationPage[index] || citationPage[index].length === 0) {
                        citationCommand += '[]';
                    }
                }
                if (citationPage[index] && citationPage[index].length > 0) {
                    citationCommand += '[' + citationPage[index] + ']';
                }
                citationCommand += '{';

                citationCommand += aBibDB[citationEntry].entry_key;

                if (listedWorksList.indexOf(citationEntry) === -1) {
                    listedWorksList.push(citationEntry);
                }
                citationCommand += '}';
            });
        }

        jQuery(this).replaceWith(citationCommand);
    });

    jQuery(htmlCode).find('figure').each(function () {
        var latexPackage = undefined;
        var figureType = jQuery(this).find('figcaption')[0].firstChild.innerHTML;
        // TODO: make use of figure type
        var caption = jQuery(this).find('figcaption')[0].lastChild.innerHTML;
        var filename = jQuery(this).find('img').attr('data-src');
        if (filename) {
            // TODO: handle formula figures
            var filenameList = filename.split('.');
            if (filenameList[filenameList.length - 1] === 'svg') {
                latexPackage = 'includesvg';
            } else {
                latexPackage = 'scaledgraphics';
            }
            this.outerHTML = '\n\\begin{figure}\n\\' + latexPackage + '{' + filename + '}\n\\caption{' + caption + '}\n\\end{figure}\n';
        }
    });

    jQuery(htmlCode).find('.equation, .figure-equation').each(function () {
        var equation = jQuery(this).attr('data-equation');
        // TODO: The string is for some reason escaped. The following line removes this.
        equation = equation.replace(/\\/g, "*BACKSLASH*").replace(/\*BACKSLASH\*\*BACKSLASH\*/g, "\\").replace(/\*BACKSLASH\*/g, "");
        this.outerHTML = '$' + equation + '$';
    });

    var footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'));
    var footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('a.fn'));

    footnoteMarkers.forEach(function (marker, index) {
        // if the footnote is in one of these containers, we have to put the
        // footnotetext after the containers. If there is no container, we put the
        // footnote where the footnote marker is.
        var containers = [].slice.call(jQuery(marker).parents('h1, h2, h3, ul, ol'));
        if (containers.length > 0) {
            jQuery(marker).html('\\protect\\footnotemark');
            var lastContainer = containers.pop();
            if (!lastContainer.nextSibling || !jQuery(lastContainer.nextSibling).hasClass('footnote-counter-reset')) {
                var fnCounterReset = document.createElement('span');
                fnCounterReset.classList.add('footnote-counter-reset');
                lastContainer.parentNode.insertBefore(fnCounterReset, lastContainer.nextSibling);
            }
            var fnCounter = 1;
            var searchNode = lastContainer.nextSibling.nextSibling;
            while (searchNode && searchNode.nodeType === 1 && searchNode.hasAttribute('role') && searchNode.getAttribute('role') === 'doc-footnote') {
                searchNode = searchNode.nextSibling;
                fnCounter++;
            }
            footnotes[index].innerHTML = "\\stepcounter{footnote}\\footnotetext{" + footnotes[index].innerHTML.trim() + "}";
            lastContainer.parentNode.insertBefore(footnotes[index], searchNode);
            lastContainer.nextSibling.innerHTML = "\\addtocounter{footnote}{-" + fnCounter + "}";
        } else {
            footnotes[index].innerHTML = "\\footnote{" + footnotes[index].innerHTML.trim() + "}";
            marker.appendChild(footnotes[index]);
        }
    });

    /*jQuery(htmlCode).find('.footnote').each(function() {
        jQuery(this).replaceWith('\\footnotext{' + this.innerHTML + '}')
    })*/

    var returnObject = {
        latex: latexStart + htmlCode.textContent + latexEnd
    };
    if (isChapter) {
        returnObject.listedWorksList = listedWorksList;
    } else {
        var bibExport = new bibliographyHelpers.bibLatexExport(listedWorksList, aBibDB);
        returnObject.bibtex = bibExport.bibtex_str;
    }
    return returnObject;
};

var downloadLatex = exports.downloadLatex = function downloadLatex(aDocument, inEditor) {
    if (inEditor || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Latex export has been initiated.'));

    var contents = document.createElement('div');

    var tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    var httpOutputList = (0, _tools.findImages)(contents);

    var latexCode = htmlToLatex(title, aDocument.owner.name, contents, aBibDB, aDocument.settings, aDocument.metadata);

    var outputList = [{
        filename: 'document.tex',
        contents: latexCode.latex
    }];

    if (latexCode.bibtex.length > 0) {
        outputList.push({
            filename: 'bibliography.bib',
            contents: latexCode.bibtex
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.latex.zip');
};

},{"./html":19,"./json":20,"./tools":22,"./zip":25}],22:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var createSlug = exports.createSlug = function createSlug(str) {
    str = str.replace(/[^a-zA-Z0-9\s]/g, "");
    str = str.toLowerCase();
    str = str.replace(/\s/g, '-');
    return str;
};

var findImages = exports.findImages = function findImages(htmlCode) {
    var imageLinks = jQuery(htmlCode).find('img'),
        images = [];

    imageLinks.each(function (index) {
        var src = jQuery(this).attr('src').split('?')[0];
        var name = src.split('/').pop();
        // JPGs are output as PNG elements as well.
        if (name === '') {
            // name was not retrievable so we give the image a unique numerical name like 1.png, 2.jpg, 3.svg, etc. .
            name = index;
        }

        var newImg = document.createElement('img');
        // We set the src of the image as "data-src" for now so that the browser won't try to load the file immediately
        newImg.setAttribute('data-src', name);
        this.parentNode.replaceChild(newImg, this);

        if (!_.findWhere(images, {
            'filename': name
        })) {

            images.push({
                'filename': name,
                'url': src
            });
        }
    });

    return images;
};

},{}],23:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/** Dialog to add a note to a revision before saving. */
var revisionDialogTemplate = exports.revisionDialogTemplate = _.template('\
<div title="' + gettext('Revision description') + '"><p><input type="text" class="revision-note" placeholder="' + gettext('Description (optional)') + '"></p></div>');

},{}],24:[function(require,module,exports){
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

},{"./upload-templates":23}],25:[function(require,module,exports){
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

},{"./download":15,"./upload":24}],26:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
// This file is auto-generated. CHANGES WILL BE OVERWRITTEN! Re-generate by running ./manage.py bundle_katex.
var katexOpfIncludes = exports.katexOpfIncludes = "\n<item id=\"katex-0\" href=\"katex.min.css\" media-type=\"text/plain\" />\n<item id=\"katex-1\" href=\"fonts/KaTeX_Typewriter-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-2\" href=\"fonts/KaTeX_Main-Italic.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-3\" href=\"fonts/KaTeX_Fraktur-Bold.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-4\" href=\"fonts/KaTeX_SansSerif-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-5\" href=\"fonts/KaTeX_Main-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-6\" href=\"fonts/KaTeX_Main-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-7\" href=\"fonts/KaTeX_SansSerif-Bold.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-8\" href=\"fonts/KaTeX_AMS-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-9\" href=\"fonts/KaTeX_Caligraphic-Bold.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-10\" href=\"fonts/KaTeX_Size4-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-11\" href=\"fonts/KaTeX_Math-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-12\" href=\"fonts/KaTeX_Size1-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-13\" href=\"fonts/KaTeX_Math-BoldItalic.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-14\" href=\"fonts/KaTeX_Script-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-15\" href=\"fonts/KaTeX_Main-Italic.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-16\" href=\"fonts/KaTeX_Math-BoldItalic.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-17\" href=\"fonts/KaTeX_Fraktur-Bold.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-18\" href=\"fonts/KaTeX_Main-Bold.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-19\" href=\"fonts/KaTeX_Size1-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-20\" href=\"fonts/KaTeX_SansSerif-Italic.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-21\" href=\"fonts/KaTeX_Math-Italic.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-22\" href=\"fonts/KaTeX_Fraktur-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-23\" href=\"fonts/KaTeX_Script-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-24\" href=\"fonts/KaTeX_Fraktur-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-25\" href=\"fonts/KaTeX_Main-Italic.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-26\" href=\"fonts/KaTeX_Size1-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-27\" href=\"fonts/KaTeX_Size3-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-28\" href=\"fonts/KaTeX_SansSerif-Italic.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-29\" href=\"fonts/KaTeX_Script-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-30\" href=\"fonts/KaTeX_Main-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-31\" href=\"fonts/KaTeX_Math-Italic.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-32\" href=\"fonts/KaTeX_Main-Italic.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-33\" href=\"fonts/KaTeX_Typewriter-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-34\" href=\"fonts/KaTeX_Math-BoldItalic.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-35\" href=\"fonts/KaTeX_AMS-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-36\" href=\"fonts/KaTeX_Size2-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-37\" href=\"fonts/KaTeX_Caligraphic-Bold.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-38\" href=\"fonts/KaTeX_Fraktur-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-39\" href=\"fonts/KaTeX_Typewriter-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-40\" href=\"fonts/KaTeX_Math-Italic.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-41\" href=\"fonts/KaTeX_SansSerif-Bold.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-42\" href=\"fonts/KaTeX_Script-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-43\" href=\"fonts/KaTeX_Caligraphic-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-44\" href=\"fonts/KaTeX_SansSerif-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-45\" href=\"fonts/KaTeX_AMS-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-46\" href=\"fonts/KaTeX_Caligraphic-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-47\" href=\"fonts/KaTeX_Fraktur-Bold.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-48\" href=\"fonts/KaTeX_Main-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-49\" href=\"fonts/KaTeX_SansSerif-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-50\" href=\"fonts/KaTeX_Size4-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-51\" href=\"fonts/KaTeX_Math-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-52\" href=\"fonts/KaTeX_SansSerif-Italic.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-53\" href=\"fonts/KaTeX_Size2-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-54\" href=\"fonts/KaTeX_Fraktur-Bold.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-55\" href=\"fonts/KaTeX_Size2-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-56\" href=\"fonts/KaTeX_SansSerif-Bold.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-57\" href=\"fonts/KaTeX_AMS-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-58\" href=\"fonts/KaTeX_Math-Italic.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-59\" href=\"fonts/KaTeX_SansSerif-Bold.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-60\" href=\"fonts/KaTeX_Main-Bold.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-61\" href=\"fonts/KaTeX_Typewriter-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-62\" href=\"fonts/KaTeX_Size3-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-63\" href=\"fonts/KaTeX_Main-Bold.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-64\" href=\"fonts/KaTeX_Caligraphic-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-65\" href=\"fonts/KaTeX_SansSerif-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-66\" href=\"fonts/KaTeX_Caligraphic-Bold.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-67\" href=\"fonts/KaTeX_Size4-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-68\" href=\"fonts/KaTeX_Main-Bold.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-69\" href=\"fonts/KaTeX_Math-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-70\" href=\"fonts/KaTeX_Size3-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-71\" href=\"fonts/KaTeX_Fraktur-Regular.ttf\" media-type=\"application/x-font-ttf\" />\n<item id=\"katex-72\" href=\"fonts/KaTeX_Caligraphic-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-73\" href=\"fonts/KaTeX_Size2-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-74\" href=\"fonts/KaTeX_Size1-Regular.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-75\" href=\"fonts/KaTeX_SansSerif-Italic.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-76\" href=\"fonts/KaTeX_Size4-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-77\" href=\"fonts/KaTeX_Size3-Regular.woff2\" media-type=\"application/octet-stream\" />\n<item id=\"katex-78\" href=\"fonts/KaTeX_Caligraphic-Bold.woff\" media-type=\"application/octet-stream\" />\n<item id=\"katex-79\" href=\"fonts/KaTeX_Math-Regular.eot\" media-type=\"application/vnd.ms-fontobject\" />\n<item id=\"katex-80\" href=\"fonts/KaTeX_Math-BoldItalic.woff\" media-type=\"application/octet-stream\" />\n";

},{}],27:[function(require,module,exports){
/**
 * This is the main entry point for KaTeX. Here, we expose functions for
 * rendering expressions either to DOM nodes or to markup strings.
 *
 * We also expose the ParseError class to check if errors thrown from KaTeX are
 * errors in the expression, or errors in javascript handling.
 */

var ParseError = require("./src/ParseError");
var Settings = require("./src/Settings");

var buildTree = require("./src/buildTree");
var parseTree = require("./src/parseTree");
var utils = require("./src/utils");

/**
 * Parse and build an expression, and place that expression in the DOM node
 * given.
 */
var render = function(expression, baseNode, options) {
    utils.clearNode(baseNode);

    var settings = new Settings(options);

    var tree = parseTree(expression, settings);
    var node = buildTree(tree, expression, settings).toNode();

    baseNode.appendChild(node);
};

// KaTeX's styles don't work properly in quirks mode. Print out an error, and
// disable rendering.
if (typeof document !== "undefined") {
    if (document.compatMode !== "CSS1Compat") {
        typeof console !== "undefined" && console.warn(
            "Warning: KaTeX doesn't work in quirks mode. Make sure your " +
                "website has a suitable doctype.");

        render = function() {
            throw new ParseError("KaTeX doesn't work in quirks mode.");
        };
    }
}

/**
 * Parse and build an expression, and return the markup for that.
 */
var renderToString = function(expression, options) {
    var settings = new Settings(options);

    var tree = parseTree(expression, settings);
    return buildTree(tree, expression, settings).toMarkup();
};

/**
 * Parse an expression and return the parse tree.
 */
var generateParseTree = function(expression, options) {
    var settings = new Settings(options);
    return parseTree(expression, settings);
};

module.exports = {
    render: render,
    renderToString: renderToString,
    /**
     * NOTE: This method is not currently recommended for public use.
     * The internal tree representation is unstable and is very likely
     * to change. Use at your own risk.
     */
    __parse: generateParseTree,
    ParseError: ParseError
};

},{"./src/ParseError":30,"./src/Settings":32,"./src/buildTree":37,"./src/parseTree":46,"./src/utils":48}],28:[function(require,module,exports){
/**
 * The Lexer class handles tokenizing the input in various ways. Since our
 * parser expects us to be able to backtrack, the lexer allows lexing from any
 * given starting point.
 *
 * Its main exposed function is the `lex` function, which takes a position to
 * lex from and a type of token to lex. It defers to the appropriate `_innerLex`
 * function.
 *
 * The various `_innerLex` functions perform the actual lexing of different
 * kinds.
 */

var matchAt = require("match-at");

var ParseError = require("./ParseError");

// The main lexer class
function Lexer(input) {
    this._input = input;
}

// The resulting token returned from `lex`.
function Token(text, data, position) {
    this.text = text;
    this.data = data;
    this.position = position;
}

// "normal" types of tokens. These are tokens which can be matched by a simple
// regex
var mathNormals = [
    /[/|@.""`0-9a-zA-Z]/, // ords
    /[*+-]/, // bins
    /[=<>:]/, // rels
    /[,;]/, // punctuation
    /['\^_{}]/, // misc
    /[(\[]/, // opens
    /[)\]?!]/, // closes
    /~/, // spacing
    /&/, // horizontal alignment
    /\\\\/ // line break
];

// These are "normal" tokens like above, but should instead be parsed in text
// mode.
var textNormals = [
    /[a-zA-Z0-9`!@*()-=+\[\]'";:?\/.,]/, // ords
    /[{}]/, // grouping
    /~/, // spacing
    /&/, // horizontal alignment
    /\\\\/ // line break
];

// Regexes for matching whitespace
var whitespaceRegex = /\s*/;
var whitespaceConcatRegex = / +|\\  +/;

// This regex matches any other TeX function, which is a backslash followed by a
// word or a single symbol
var anyFunc = /\\(?:[a-zA-Z]+|.)/;

/**
 * This function lexes a single normal token. It takes a position, a list of
 * "normal" tokens to try, and whether it should completely ignore whitespace or
 * not.
 */
Lexer.prototype._innerLex = function(pos, normals, ignoreWhitespace) {
    var input = this._input;
    var whitespace;

    if (ignoreWhitespace) {
        // Get rid of whitespace.
        whitespace = matchAt(whitespaceRegex, input, pos)[0];
        pos += whitespace.length;
    } else {
        // Do the funky concatenation of whitespace that happens in text mode.
        whitespace = matchAt(whitespaceConcatRegex, input, pos);
        if (whitespace !== null) {
            return new Token(" ", null, pos + whitespace[0].length);
        }
    }

    // If there's no more input to parse, return an EOF token
    if (pos === input.length) {
        return new Token("EOF", null, pos);
    }

    var match;
    if ((match = matchAt(anyFunc, input, pos))) {
        // If we match a function token, return it
        return new Token(match[0], null, pos + match[0].length);
    } else {
        // Otherwise, we look through the normal token regexes and see if it's
        // one of them.
        for (var i = 0; i < normals.length; i++) {
            var normal = normals[i];

            if ((match = matchAt(normal, input, pos))) {
                // If it is, return it
                return new Token(
                    match[0], null, pos + match[0].length);
            }
        }
    }

    throw new ParseError(
            "Unexpected character: '" + input[pos] + "'",
            this, pos);
};

// A regex to match a CSS color (like #ffffff or BlueViolet)
var cssColor = /#[a-z0-9]+|[a-z]+/i;

/**
 * This function lexes a CSS color.
 */
Lexer.prototype._innerLexColor = function(pos) {
    var input = this._input;

    // Ignore whitespace
    var whitespace = matchAt(whitespaceRegex, input, pos)[0];
    pos += whitespace.length;

    var match;
    if ((match = matchAt(cssColor, input, pos))) {
        // If we look like a color, return a color
        return new Token(match[0], null, pos + match[0].length);
    } else {
        throw new ParseError("Invalid color", this, pos);
    }
};

// A regex to match a dimension. Dimensions look like
// "1.2em" or ".4pt" or "1 ex"
var sizeRegex = /(-?)\s*(\d+(?:\.\d*)?|\.\d+)\s*([a-z]{2})/;

/**
 * This function lexes a dimension.
 */
Lexer.prototype._innerLexSize = function(pos) {
    var input = this._input;

    // Ignore whitespace
    var whitespace = matchAt(whitespaceRegex, input, pos)[0];
    pos += whitespace.length;

    var match;
    if ((match = matchAt(sizeRegex, input, pos))) {
        var unit = match[3];
        // We only currently handle "em" and "ex" units
        if (unit !== "em" && unit !== "ex") {
            throw new ParseError("Invalid unit: '" + unit + "'", this, pos);
        }
        return new Token(match[0], {
                number: +(match[1] + match[2]),
                unit: unit
            }, pos + match[0].length);
    }

    throw new ParseError("Invalid size", this, pos);
};

/**
 * This function lexes a string of whitespace.
 */
Lexer.prototype._innerLexWhitespace = function(pos) {
    var input = this._input;

    var whitespace = matchAt(whitespaceRegex, input, pos)[0];
    pos += whitespace.length;

    return new Token(whitespace[0], null, pos);
};

/**
 * This function lexes a single token starting at `pos` and of the given mode.
 * Based on the mode, we defer to one of the `_innerLex` functions.
 */
Lexer.prototype.lex = function(pos, mode) {
    if (mode === "math") {
        return this._innerLex(pos, mathNormals, true);
    } else if (mode === "text") {
        return this._innerLex(pos, textNormals, false);
    } else if (mode === "color") {
        return this._innerLexColor(pos);
    } else if (mode === "size") {
        return this._innerLexSize(pos);
    } else if (mode === "whitespace") {
        return this._innerLexWhitespace(pos);
    }
};

module.exports = Lexer;

},{"./ParseError":30,"match-at":49}],29:[function(require,module,exports){
/**
 * This file contains information about the options that the Parser carries
 * around with it while parsing. Data is held in an `Options` object, and when
 * recursing, a new `Options` object can be created with the `.with*` and
 * `.reset` functions.
 */

/**
 * This is the main options class. It contains the style, size, color, and font
 * of the current parse level. It also contains the style and size of the parent
 * parse level, so size changes can be handled efficiently.
 *
 * Each of the `.with*` and `.reset` functions passes its current style and size
 * as the parentStyle and parentSize of the new options class, so parent
 * handling is taken care of automatically.
 */
function Options(data) {
    this.style = data.style;
    this.color = data.color;
    this.size = data.size;
    this.phantom = data.phantom;
    this.font = data.font;

    if (data.parentStyle === undefined) {
        this.parentStyle = data.style;
    } else {
        this.parentStyle = data.parentStyle;
    }

    if (data.parentSize === undefined) {
        this.parentSize = data.size;
    } else {
        this.parentSize = data.parentSize;
    }
}

/**
 * Returns a new options object with the same properties as "this".  Properties
 * from "extension" will be copied to the new options object.
 */
Options.prototype.extend = function(extension) {
    var data = {
        style: this.style,
        size: this.size,
        color: this.color,
        parentStyle: this.style,
        parentSize: this.size,
        phantom: this.phantom,
        font: this.font
    };

    for (var key in extension) {
        if (extension.hasOwnProperty(key)) {
            data[key] = extension[key];
        }
    }

    return new Options(data);
};

/**
 * Create a new options object with the given style.
 */
Options.prototype.withStyle = function(style) {
    return this.extend({
        style: style
    });
};

/**
 * Create a new options object with the given size.
 */
Options.prototype.withSize = function(size) {
    return this.extend({
        size: size
    });
};

/**
 * Create a new options object with the given color.
 */
Options.prototype.withColor = function(color) {
    return this.extend({
        color: color
    });
};

/**
 * Create a new options object with "phantom" set to true.
 */
Options.prototype.withPhantom = function() {
    return this.extend({
        phantom: true
    });
};

/**
 * Create a new options objects with the give font.
 */
Options.prototype.withFont = function(font) {
    return this.extend({
        font: font
    });
};

/**
 * Create a new options object with the same style, size, and color. This is
 * used so that parent style and size changes are handled correctly.
 */
Options.prototype.reset = function() {
    return this.extend({});
};

/**
 * A map of color names to CSS colors.
 * TODO(emily): Remove this when we have real macros
 */
var colorMap = {
    "katex-blue": "#6495ed",
    "katex-orange": "#ffa500",
    "katex-pink": "#ff00af",
    "katex-red": "#df0030",
    "katex-green": "#28ae7b",
    "katex-gray": "gray",
    "katex-purple": "#9d38bd",
    "katex-blueA": "#c7e9f1",
    "katex-blueB": "#9cdceb",
    "katex-blueC": "#58c4dd",
    "katex-blueD": "#29abca",
    "katex-blueE": "#1c758a",
    "katex-tealA": "#acead7",
    "katex-tealB": "#76ddc0",
    "katex-tealC": "#5cd0b3",
    "katex-tealD": "#55c1a7",
    "katex-tealE": "#49a88f",
    "katex-greenA": "#c9e2ae",
    "katex-greenB": "#a6cf8c",
    "katex-greenC": "#83c167",
    "katex-greenD": "#77b05d",
    "katex-greenE": "#699c52",
    "katex-goldA": "#f7c797",
    "katex-goldB": "#f9b775",
    "katex-goldC": "#f0ac5f",
    "katex-goldD": "#e1a158",
    "katex-goldE": "#c78d46",
    "katex-redA": "#f7a1a3",
    "katex-redB": "#ff8080",
    "katex-redC": "#fc6255",
    "katex-redD": "#e65a4c",
    "katex-redE": "#cf5044",
    "katex-maroonA": "#ecabc1",
    "katex-maroonB": "#ec92ab",
    "katex-maroonC": "#c55f73",
    "katex-maroonD": "#a24d61",
    "katex-maroonE": "#94424f",
    "katex-purpleA": "#caa3e8",
    "katex-purpleB": "#b189c6",
    "katex-purpleC": "#9a72ac",
    "katex-purpleD": "#715582",
    "katex-purpleE": "#644172",
    "katex-mintA": "#f5f9e8",
    "katex-mintB": "#edf2df",
    "katex-mintC": "#e0e5cc",
    "katex-grayA": "#fdfdfd",
    "katex-grayB": "#f7f7f7",
    "katex-grayC": "#eeeeee",
    "katex-grayD": "#dddddd",
    "katex-grayE": "#cccccc",
    "katex-grayF": "#aaaaaa",
    "katex-grayG": "#999999",
    "katex-grayH": "#555555",
    "katex-grayI": "#333333",
    "katex-kaBlue": "#314453",
    "katex-kaGreen": "#639b24"
};

/**
 * Gets the CSS color of the current options object, accounting for the
 * `colorMap`.
 */
Options.prototype.getColor = function() {
    if (this.phantom) {
        return "transparent";
    } else {
        return colorMap[this.color] || this.color;
    }
};

module.exports = Options;

},{}],30:[function(require,module,exports){
/**
 * This is the ParseError class, which is the main error thrown by KaTeX
 * functions when something has gone wrong. This is used to distinguish internal
 * errors from errors in the expression that the user provided.
 */
function ParseError(message, lexer, position) {
    var error = "KaTeX parse error: " + message;

    if (lexer !== undefined && position !== undefined) {
        // If we have the input and a position, make the error a bit fancier

        // Prepend some information
        error += " at position " + position + ": ";

        // Get the input
        var input = lexer._input;
        // Insert a combining underscore at the correct position
        input = input.slice(0, position) + "\u0332" +
            input.slice(position);

        // Extract some context from the input and add it to the error
        var begin = Math.max(0, position - 15);
        var end = position + 15;
        error += input.slice(begin, end);
    }

    // Some hackery to make ParseError a prototype of Error
    // See http://stackoverflow.com/a/8460753
    var self = new Error(error);
    self.name = "ParseError";
    self.__proto__ = ParseError.prototype;

    self.position = position;
    return self;
}

// More hackery
ParseError.prototype.__proto__ = Error.prototype;

module.exports = ParseError;

},{}],31:[function(require,module,exports){
var functions = require("./functions");
var environments = require("./environments");
var Lexer = require("./Lexer");
var symbols = require("./symbols");
var utils = require("./utils");

var parseData = require("./parseData");
var ParseError = require("./ParseError");

/**
 * This file contains the parser used to parse out a TeX expression from the
 * input. Since TeX isn't context-free, standard parsers don't work particularly
 * well.
 *
 * The strategy of this parser is as such:
 *
 * The main functions (the `.parse...` ones) take a position in the current
 * parse string to parse tokens from. The lexer (found in Lexer.js, stored at
 * this.lexer) also supports pulling out tokens at arbitrary places. When
 * individual tokens are needed at a position, the lexer is called to pull out a
 * token, which is then used.
 *
 * The main functions also take a mode that the parser is currently in
 * (currently "math" or "text"), which denotes whether the current environment
 * is a math-y one or a text-y one (e.g. inside \text). Currently, this serves
 * to limit the functions which can be used in text mode.
 *
 * The main functions then return an object which contains the useful data that
 * was parsed at its given point, and a new position at the end of the parsed
 * data. The main functions can call each other and continue the parsing by
 * using the returned position as a new starting point.
 *
 * There are also extra `.handle...` functions, which pull out some reused
 * functionality into self-contained functions.
 *
 * The earlier functions return `ParseResult`s, which contain a ParseNode and a
 * new position.
 *
 * The later functions (which are called deeper in the parse) sometimes return
 * ParseFuncOrArgument, which contain a ParseResult as well as some data about
 * whether the parsed object is a function which is missing some arguments, or a
 * standalone object which can be used as an argument to another function.
 */

/**
 * Main Parser class
 */
function Parser(input, settings) {
    // Make a new lexer
    this.lexer = new Lexer(input);
    // Store the settings for use in parsing
    this.settings = settings;
}

var ParseNode = parseData.ParseNode;
var ParseResult = parseData.ParseResult;

/**
 * An initial function (without its arguments), or an argument to a function.
 * The `result` argument should be a ParseResult.
 */
function ParseFuncOrArgument(result, isFunction) {
    this.result = result;
    // Is this a function (i.e. is it something defined in functions.js)?
    this.isFunction = isFunction;
}

/**
 * Checks a result to make sure it has the right type, and throws an
 * appropriate error otherwise.
 */
Parser.prototype.expect = function(result, text) {
    if (result.text !== text) {
        throw new ParseError(
            "Expected '" + text + "', got '" + result.text + "'",
            this.lexer, result.position
        );
    }
};

/**
 * Main parsing function, which parses an entire input.
 *
 * @return {?Array.<ParseNode>}
 */
Parser.prototype.parse = function(input) {
    // Try to parse the input
    var parse = this.parseInput(0, "math");
    return parse.result;
};

/**
 * Parses an entire input tree.
 */
Parser.prototype.parseInput = function(pos, mode) {
    // Parse an expression
    var expression = this.parseExpression(pos, mode, false);
    // If we succeeded, make sure there's an EOF at the end
    this.expect(expression.peek, "EOF");
    return expression;
};

var endOfExpression = ["}", "\\end", "\\right", "&", "\\\\", "\\cr"];

/**
 * Parses an "expression", which is a list of atoms.
 *
 * @param {boolean} breakOnInfix Should the parsing stop when we hit infix
 *                  nodes? This happens when functions have higher precendence
 *                  than infix nodes in implicit parses.
 *
 * @param {?string} breakOnToken The token that the expression should end with,
 *                  or `null` if something else should end the expression.
 *
 * @return {ParseResult}
 */
Parser.prototype.parseExpression = function(pos, mode, breakOnInfix, breakOnToken) {
    var body = [];
    var lex = null;
    // Keep adding atoms to the body until we can't parse any more atoms (either
    // we reached the end, a }, or a \right)
    while (true) {
        lex = this.lexer.lex(pos, mode);
        if (endOfExpression.indexOf(lex.text) !== -1) {
            break;
        }
        if (breakOnToken && lex.text === breakOnToken) {
            break;
        }
        var atom = this.parseAtom(pos, mode);
        if (!atom) {
            if (!this.settings.throwOnError && lex.text[0] === "\\") {
                var errorNode = this.handleUnsupportedCmd(lex.text, mode);
                body.push(errorNode);

                pos = lex.position;
                continue;
            }

            break;
        }
        if (breakOnInfix && atom.result.type === "infix") {
            break;
        }
        body.push(atom.result);
        pos = atom.position;
    }
    var res = new ParseResult(this.handleInfixNodes(body, mode), pos);
    res.peek = lex;
    return res;
};

/**
 * Rewrites infix operators such as \over with corresponding commands such
 * as \frac.
 *
 * There can only be one infix operator per group.  If there's more than one
 * then the expression is ambiguous.  This can be resolved by adding {}.
 *
 * @returns {Array}
 */
Parser.prototype.handleInfixNodes = function (body, mode) {
    var overIndex = -1;
    var func;
    var funcName;

    for (var i = 0; i < body.length; i++) {
        var node = body[i];
        if (node.type === "infix") {
            if (overIndex !== -1) {
                throw new ParseError("only one infix operator per group",
                    this.lexer, -1);
            }
            overIndex = i;
            funcName = node.value.replaceWith;
            func = functions.funcs[funcName];
        }
    }

    if (overIndex !== -1) {
        var numerNode, denomNode;

        var numerBody = body.slice(0, overIndex);
        var denomBody = body.slice(overIndex + 1);

        if (numerBody.length === 1 && numerBody[0].type === "ordgroup") {
            numerNode = numerBody[0];
        } else {
            numerNode = new ParseNode("ordgroup", numerBody, mode);
        }

        if (denomBody.length === 1 && denomBody[0].type === "ordgroup") {
            denomNode = denomBody[0];
        } else {
            denomNode = new ParseNode("ordgroup", denomBody, mode);
        }

        var value = func.handler(funcName, numerNode, denomNode);
        return [new ParseNode(value.type, value, mode)];
    } else {
        return body;
    }
};

// The greediness of a superscript or subscript
var SUPSUB_GREEDINESS = 1;

/**
 * Handle a subscript or superscript with nice errors.
 */
Parser.prototype.handleSupSubscript = function(pos, mode, symbol, name) {
    var group = this.parseGroup(pos, mode);

    if (!group) {
        var lex = this.lexer.lex(pos, mode);

        if (!this.settings.throwOnError && lex.text[0] === "\\") {
            return new ParseResult(
                this.handleUnsupportedCmd(lex.text, mode),
                lex.position);
        } else {
            throw new ParseError(
                "Expected group after '" + symbol + "'", this.lexer, pos);
        }
    } else if (group.isFunction) {
        // ^ and _ have a greediness, so handle interactions with functions'
        // greediness
        var funcGreediness = functions.funcs[group.result.result].greediness;
        if (funcGreediness > SUPSUB_GREEDINESS) {
            return this.parseFunction(pos, mode);
        } else {
            throw new ParseError(
                "Got function '" + group.result.result + "' with no arguments " +
                    "as " + name,
                this.lexer, pos);
        }
    } else {
        return group.result;
    }
};

/**
 * Converts the textual input of an unsupported command into a text node
 * contained within a color node whose color is determined by errorColor
 */
 Parser.prototype.handleUnsupportedCmd = function(text, mode) {
     var textordArray = [];

     for (var i = 0; i < text.length; i++) {
        textordArray.push(new ParseNode("textord", text[i], "text"));
     }

     var textNode = new ParseNode(
         "text",
         {
             body: textordArray,
             type: "text"
         },
         mode);

     var colorNode = new ParseNode(
        "color",
        {
            color: this.settings.errorColor,
            value: [textNode],
            type: "color"
        },
        mode);

     return colorNode;
 };

/**
 * Parses a group with optional super/subscripts.
 *
 * @return {?ParseResult}
 */
Parser.prototype.parseAtom = function(pos, mode) {
    // The body of an atom is an implicit group, so that things like
    // \left(x\right)^2 work correctly.
    var base = this.parseImplicitGroup(pos, mode);

    // In text mode, we don't have superscripts or subscripts
    if (mode === "text") {
        return base;
    }

    // Handle an empty base
    var currPos;
    if (!base) {
        currPos = pos;
        base = undefined;
    } else {
        currPos = base.position;
    }

    var superscript;
    var subscript;
    var result;
    while (true) {
        // Lex the first token
        var lex = this.lexer.lex(currPos, mode);

        if (lex.text === "\\limits" || lex.text === "\\nolimits") {
            // We got a limit control
            if (!base || base.result.type !== "op") {
                throw new ParseError("Limit controls must follow a math operator",
                    this.lexer, currPos);
            }
            else {
                var limits = lex.text === "\\limits";
                base.result.value.limits = limits;
                base.result.value.alwaysHandleSupSub = true;
                currPos = lex.position;
            }
        } else if (lex.text === "^") {
            // We got a superscript start
            if (superscript) {
                throw new ParseError(
                    "Double superscript", this.lexer, currPos);
            }
            result = this.handleSupSubscript(
                lex.position, mode, lex.text, "superscript");
            currPos = result.position;
            superscript = result.result;
        } else if (lex.text === "_") {
            // We got a subscript start
            if (subscript) {
                throw new ParseError(
                    "Double subscript", this.lexer, currPos);
            }
            result = this.handleSupSubscript(
                lex.position, mode, lex.text, "subscript");
            currPos = result.position;
            subscript = result.result;
        } else if (lex.text === "'") {
            // We got a prime
            var prime = new ParseNode("textord", "\\prime", mode);

            // Many primes can be grouped together, so we handle this here
            var primes = [prime];
            currPos = lex.position;
            // Keep lexing tokens until we get something that's not a prime
            while ((lex = this.lexer.lex(currPos, mode)).text === "'") {
                // For each one, add another prime to the list
                primes.push(prime);
                currPos = lex.position;
            }
            // Put them into an ordgroup as the superscript
            superscript = new ParseNode("ordgroup", primes, mode);
        } else {
            // If it wasn't ^, _, or ', stop parsing super/subscripts
            break;
        }
    }

    if (superscript || subscript) {
        // If we got either a superscript or subscript, create a supsub
        return new ParseResult(
            new ParseNode("supsub", {
                base: base && base.result,
                sup: superscript,
                sub: subscript
            }, mode),
            currPos);
    } else {
        // Otherwise return the original body
        return base;
    }
};

// A list of the size-changing functions, for use in parseImplicitGroup
var sizeFuncs = [
    "\\tiny", "\\scriptsize", "\\footnotesize", "\\small", "\\normalsize",
    "\\large", "\\Large", "\\LARGE", "\\huge", "\\Huge"
];

// A list of the style-changing functions, for use in parseImplicitGroup
var styleFuncs = [
    "\\displaystyle", "\\textstyle", "\\scriptstyle", "\\scriptscriptstyle"
];

/**
 * Parses an implicit group, which is a group that starts at the end of a
 * specified, and ends right before a higher explicit group ends, or at EOL. It
 * is used for functions that appear to affect the current style, like \Large or
 * \textrm, where instead of keeping a style we just pretend that there is an
 * implicit grouping after it until the end of the group. E.g.
 *   small text {\Large large text} small text again
 * It is also used for \left and \right to get the correct grouping.
 *
 * @return {?ParseResult}
 */
Parser.prototype.parseImplicitGroup = function(pos, mode) {
    var start = this.parseSymbol(pos, mode);

    if (!start || !start.result) {
        // If we didn't get anything we handle, fall back to parseFunction
        return this.parseFunction(pos, mode);
    }

    var func = start.result.result;
    var body;

    if (func === "\\left") {
        // If we see a left:
        // Parse the entire left function (including the delimiter)
        var left = this.parseFunction(pos, mode);
        // Parse out the implicit body
        body = this.parseExpression(left.position, mode, false);
        // Check the next token
        this.expect(body.peek, "\\right");
        var right = this.parseFunction(body.position, mode);
        return new ParseResult(
            new ParseNode("leftright", {
                body: body.result,
                left: left.result.value.value,
                right: right.result.value.value
            }, mode),
            right.position);
    } else if (func === "\\begin") {
        // begin...end is similar to left...right
        var begin = this.parseFunction(pos, mode);
        var envName = begin.result.value.name;
        if (!environments.hasOwnProperty(envName)) {
            throw new ParseError(
                "No such environment: " + envName,
                this.lexer, begin.result.value.namepos);
        }
        // Build the environment object. Arguments and other information will
        // be made available to the begin and end methods using properties.
        var env = environments[envName];
        var args = [null, mode, envName];
        var newPos = this.parseArguments(
            begin.position, mode, "\\begin{" + envName + "}", env, args);
        args[0] = newPos;
        var result = env.handler.apply(this, args);
        var endLex = this.lexer.lex(result.position, mode);
        this.expect(endLex, "\\end");
        var end = this.parseFunction(result.position, mode);
        if (end.result.value.name !== envName) {
            throw new ParseError(
                "Mismatch: \\begin{" + envName + "} matched " +
                "by \\end{" + end.result.value.name + "}",
                this.lexer, end.namepos);
        }
        result.position = end.position;
        return result;
    } else if (utils.contains(sizeFuncs, func)) {
        // If we see a sizing function, parse out the implict body
        body = this.parseExpression(start.result.position, mode, false);
        return new ParseResult(
            new ParseNode("sizing", {
                // Figure out what size to use based on the list of functions above
                size: "size" + (utils.indexOf(sizeFuncs, func) + 1),
                value: body.result
            }, mode),
            body.position);
    } else if (utils.contains(styleFuncs, func)) {
        // If we see a styling function, parse out the implict body
        body = this.parseExpression(start.result.position, mode, true);
        return new ParseResult(
            new ParseNode("styling", {
                // Figure out what style to use by pulling out the style from
                // the function name
                style: func.slice(1, func.length - 5),
                value: body.result
            }, mode),
            body.position);
    } else {
        // Defer to parseFunction if it's not a function we handle
        return this.parseFunction(pos, mode);
    }
};

/**
 * Parses an entire function, including its base and all of its arguments
 *
 * @return {?ParseResult}
 */
Parser.prototype.parseFunction = function(pos, mode) {
    var baseGroup = this.parseGroup(pos, mode);

    if (baseGroup) {
        if (baseGroup.isFunction) {
            var func = baseGroup.result.result;
            var funcData = functions.funcs[func];
            if (mode === "text" && !funcData.allowedInText) {
                throw new ParseError(
                    "Can't use function '" + func + "' in text mode",
                    this.lexer, baseGroup.position);
            }

            var args = [func];
            var newPos = this.parseArguments(
                baseGroup.result.position, mode, func, funcData, args);
            var result = functions.funcs[func].handler.apply(this, args);
            return new ParseResult(
                new ParseNode(result.type, result, mode),
                newPos);
        } else {
            return baseGroup.result;
        }
    } else {
        return null;
    }
};


/**
 * Parses the arguments of a function or environment
 *
 * @param {string} func  "\name" or "\begin{name}"
 * @param {{numArgs:number,numOptionalArgs:number|undefined}} funcData
 * @param {Array} args  list of arguments to which new ones will be pushed
 * @return the position after all arguments have been parsed
 */
Parser.prototype.parseArguments = function(pos, mode, func, funcData, args) {
    var totalArgs = funcData.numArgs + funcData.numOptionalArgs;
    if (totalArgs === 0) {
        return pos;
    }

    var newPos = pos;
    var baseGreediness = funcData.greediness;
    var positions = [newPos];

    for (var i = 0; i < totalArgs; i++) {
        var argType = funcData.argTypes && funcData.argTypes[i];
        var arg;
        if (i < funcData.numOptionalArgs) {
            if (argType) {
                arg = this.parseSpecialGroup(newPos, argType, mode, true);
            } else {
                arg = this.parseOptionalGroup(newPos, mode);
            }
            if (!arg) {
                args.push(null);
                positions.push(newPos);
                continue;
            }
        } else {
            if (argType) {
                arg = this.parseSpecialGroup(newPos, argType, mode);
            } else {
                arg = this.parseGroup(newPos, mode);
            }
            if (!arg) {
                var lex = this.lexer.lex(newPos, mode);

                if (!this.settings.throwOnError && lex.text[0] === "\\") {
                    arg = new ParseFuncOrArgument(
                        new ParseResult(
                            this.handleUnsupportedCmd(lex.text, mode),
                            lex.position),
                        false);
                } else {
                    throw new ParseError(
                        "Expected group after '" + func + "'", this.lexer, pos);
                }
            }
        }
        var argNode;
        if (arg.isFunction) {
            var argGreediness =
                functions.funcs[arg.result.result].greediness;
            if (argGreediness > baseGreediness) {
                argNode = this.parseFunction(newPos, mode);
            } else {
                throw new ParseError(
                    "Got function '" + arg.result.result + "' as " +
                    "argument to '" + func + "'",
                    this.lexer, arg.result.position - 1);
            }
        } else {
            argNode = arg.result;
        }
        args.push(argNode.result);
        positions.push(argNode.position);
        newPos = argNode.position;
    }

    args.push(positions);

    return newPos;
};


/**
 * Parses a group when the mode is changing. Takes a position, a new mode, and
 * an outer mode that is used to parse the outside.
 *
 * @return {?ParseFuncOrArgument}
 */
Parser.prototype.parseSpecialGroup = function(pos, mode, outerMode, optional) {
    // Handle `original` argTypes
    if (mode === "original") {
        mode = outerMode;
    }

    if (mode === "color" || mode === "size") {
        // color and size modes are special because they should have braces and
        // should only lex a single symbol inside
        var openBrace = this.lexer.lex(pos, outerMode);
        if (optional && openBrace.text !== "[") {
            // optional arguments should return null if they don't exist
            return null;
        }
        this.expect(openBrace, optional ? "[" : "{");
        var inner = this.lexer.lex(openBrace.position, mode);
        var data;
        if (mode === "color") {
            data = inner.text;
        } else {
            data = inner.data;
        }
        var closeBrace = this.lexer.lex(inner.position, outerMode);
        this.expect(closeBrace, optional ? "]" : "}");
        return new ParseFuncOrArgument(
            new ParseResult(
                new ParseNode(mode, data, outerMode),
                closeBrace.position),
            false);
    } else if (mode === "text") {
        // text mode is special because it should ignore the whitespace before
        // it
        var whitespace = this.lexer.lex(pos, "whitespace");
        pos = whitespace.position;
    }

    if (optional) {
        return this.parseOptionalGroup(pos, mode);
    } else {
        return this.parseGroup(pos, mode);
    }
};

/**
 * Parses a group, which is either a single nucleus (like "x") or an expression
 * in braces (like "{x+y}")
 *
 * @return {?ParseFuncOrArgument}
 */
Parser.prototype.parseGroup = function(pos, mode) {
    var start = this.lexer.lex(pos, mode);
    // Try to parse an open brace
    if (start.text === "{") {
        // If we get a brace, parse an expression
        var expression = this.parseExpression(start.position, mode, false);
        // Make sure we get a close brace
        var closeBrace = this.lexer.lex(expression.position, mode);
        this.expect(closeBrace, "}");
        return new ParseFuncOrArgument(
            new ParseResult(
                new ParseNode("ordgroup", expression.result, mode),
                closeBrace.position),
            false);
    } else {
        // Otherwise, just return a nucleus
        return this.parseSymbol(pos, mode);
    }
};

/**
 * Parses a group, which is an expression in brackets (like "[x+y]")
 *
 * @return {?ParseFuncOrArgument}
 */
Parser.prototype.parseOptionalGroup = function(pos, mode) {
    var start = this.lexer.lex(pos, mode);
    // Try to parse an open bracket
    if (start.text === "[") {
        // If we get a brace, parse an expression
        var expression = this.parseExpression(start.position, mode, false, "]");
        // Make sure we get a close bracket
        var closeBracket = this.lexer.lex(expression.position, mode);
        this.expect(closeBracket, "]");
        return new ParseFuncOrArgument(
            new ParseResult(
                new ParseNode("ordgroup", expression.result, mode),
                closeBracket.position),
            false);
    } else {
        // Otherwise, return null,
        return null;
    }
};

/**
 * Parse a single symbol out of the string. Here, we handle both the functions
 * we have defined, as well as the single character symbols
 *
 * @return {?ParseFuncOrArgument}
 */
Parser.prototype.parseSymbol = function(pos, mode) {
    var nucleus = this.lexer.lex(pos, mode);

    if (functions.funcs[nucleus.text]) {
        // If there exists a function with this name, we return the function and
        // say that it is a function.
        return new ParseFuncOrArgument(
            new ParseResult(nucleus.text, nucleus.position),
            true);
    } else if (symbols[mode][nucleus.text]) {
        // Otherwise if this is a no-argument function, find the type it
        // corresponds to in the symbols map
        return new ParseFuncOrArgument(
            new ParseResult(
                new ParseNode(symbols[mode][nucleus.text].group,
                              nucleus.text, mode),
                nucleus.position),
            false);
    } else {
        return null;
    }
};

Parser.prototype.ParseNode = ParseNode;

module.exports = Parser;

},{"./Lexer":28,"./ParseError":30,"./environments":40,"./functions":43,"./parseData":45,"./symbols":47,"./utils":48}],32:[function(require,module,exports){
/**
 * This is a module for storing settings passed into KaTeX. It correctly handles
 * default settings.
 */

/**
 * Helper function for getting a default value if the value is undefined
 */
function get(option, defaultValue) {
    return option === undefined ? defaultValue : option;
}

/**
 * The main Settings object
 *
 * The current options stored are:
 *  - displayMode: Whether the expression should be typeset by default in
 *                 textstyle or displaystyle (default false)
 */
function Settings(options) {
    // allow null options
    options = options || {};
    this.displayMode = get(options.displayMode, false);
    this.throwOnError = get(options.throwOnError, true);
    this.errorColor = get(options.errorColor, "#cc0000");
}

module.exports = Settings;

},{}],33:[function(require,module,exports){
/**
 * This file contains information and classes for the various kinds of styles
 * used in TeX. It provides a generic `Style` class, which holds information
 * about a specific style. It then provides instances of all the different kinds
 * of styles possible, and provides functions to move between them and get
 * information about them.
 */

/**
 * The main style class. Contains a unique id for the style, a size (which is
 * the same for cramped and uncramped version of a style), a cramped flag, and a
 * size multiplier, which gives the size difference between a style and
 * textstyle.
 */
function Style(id, size, multiplier, cramped) {
    this.id = id;
    this.size = size;
    this.cramped = cramped;
    this.sizeMultiplier = multiplier;
}

/**
 * Get the style of a superscript given a base in the current style.
 */
Style.prototype.sup = function() {
    return styles[sup[this.id]];
};

/**
 * Get the style of a subscript given a base in the current style.
 */
Style.prototype.sub = function() {
    return styles[sub[this.id]];
};

/**
 * Get the style of a fraction numerator given the fraction in the current
 * style.
 */
Style.prototype.fracNum = function() {
    return styles[fracNum[this.id]];
};

/**
 * Get the style of a fraction denominator given the fraction in the current
 * style.
 */
Style.prototype.fracDen = function() {
    return styles[fracDen[this.id]];
};

/**
 * Get the cramped version of a style (in particular, cramping a cramped style
 * doesn't change the style).
 */
Style.prototype.cramp = function() {
    return styles[cramp[this.id]];
};

/**
 * HTML class name, like "displaystyle cramped"
 */
Style.prototype.cls = function() {
    return sizeNames[this.size] + (this.cramped ? " cramped" : " uncramped");
};

/**
 * HTML Reset class name, like "reset-textstyle"
 */
Style.prototype.reset = function() {
    return resetNames[this.size];
};

// IDs of the different styles
var D = 0;
var Dc = 1;
var T = 2;
var Tc = 3;
var S = 4;
var Sc = 5;
var SS = 6;
var SSc = 7;

// String names for the different sizes
var sizeNames = [
    "displaystyle textstyle",
    "textstyle",
    "scriptstyle",
    "scriptscriptstyle"
];

// Reset names for the different sizes
var resetNames = [
    "reset-textstyle",
    "reset-textstyle",
    "reset-scriptstyle",
    "reset-scriptscriptstyle"
];

// Instances of the different styles
var styles = [
    new Style(D, 0, 1.0, false),
    new Style(Dc, 0, 1.0, true),
    new Style(T, 1, 1.0, false),
    new Style(Tc, 1, 1.0, true),
    new Style(S, 2, 0.7, false),
    new Style(Sc, 2, 0.7, true),
    new Style(SS, 3, 0.5, false),
    new Style(SSc, 3, 0.5, true)
];

// Lookup tables for switching from one style to another
var sup = [S, Sc, S, Sc, SS, SSc, SS, SSc];
var sub = [Sc, Sc, Sc, Sc, SSc, SSc, SSc, SSc];
var fracNum = [T, Tc, S, Sc, SS, SSc, SS, SSc];
var fracDen = [Tc, Tc, Sc, Sc, SSc, SSc, SSc, SSc];
var cramp = [Dc, Dc, Tc, Tc, Sc, Sc, SSc, SSc];

// We only export some of the styles. Also, we don't export the `Style` class so
// no more styles can be generated.
module.exports = {
    DISPLAY: styles[D],
    TEXT: styles[T],
    SCRIPT: styles[S],
    SCRIPTSCRIPT: styles[SS]
};

},{}],34:[function(require,module,exports){
/**
 * This module contains general functions that can be used for building
 * different kinds of domTree nodes in a consistent manner.
 */

var domTree = require("./domTree");
var fontMetrics = require("./fontMetrics");
var symbols = require("./symbols");
var utils = require("./utils");

var greekCapitals = [
    "\\Gamma",
    "\\Delta",
    "\\Theta",
    "\\Lambda",
    "\\Xi",
    "\\Pi",
    "\\Sigma",
    "\\Upsilon",
    "\\Phi",
    "\\Psi",
    "\\Omega"
];

var dotlessLetters = [
    "\u0131",   // dotless i, \imath
    "\u0237"    // dotless j, \jmath
];

/**
 * Makes a symbolNode after translation via the list of symbols in symbols.js.
 * Correctly pulls out metrics for the character, and optionally takes a list of
 * classes to be attached to the node.
 */
var makeSymbol = function(value, style, mode, color, classes) {
    // Replace the value with its replaced value from symbol.js
    if (symbols[mode][value] && symbols[mode][value].replace) {
        value = symbols[mode][value].replace;
    }

    var metrics = fontMetrics.getCharacterMetrics(value, style);

    var symbolNode;
    if (metrics) {
        symbolNode = new domTree.symbolNode(
            value, metrics.height, metrics.depth, metrics.italic, metrics.skew,
            classes);
    } else {
        // TODO(emily): Figure out a good way to only print this in development
        typeof console !== "undefined" && console.warn(
            "No character metrics for '" + value + "' in style '" +
                style + "'");
        symbolNode = new domTree.symbolNode(value, 0, 0, 0, 0, classes);
    }

    if (color) {
        symbolNode.style.color = color;
    }

    return symbolNode;
};

/**
 * Makes a symbol in Main-Regular or AMS-Regular.
 * Used for rel, bin, open, close, inner, and punct.
 */
var mathsym = function(value, mode, color, classes) {
    // Decide what font to render the symbol in by its entry in the symbols
    // table.
    // Have a special case for when the value = \ because the \ is used as a
    // textord in unsupported command errors but cannot be parsed as a regular
    // text ordinal and is therefore not present as a symbol in the symbols
    // table for text
    if (value === "\\" || symbols[mode][value].font === "main") {
        return makeSymbol(value, "Main-Regular", mode, color, classes);
    } else {
        return makeSymbol(
            value, "AMS-Regular", mode, color, classes.concat(["amsrm"]));
    }
};

/**
 * Makes a symbol in the default font for mathords and textords.
 */
var mathDefault = function(value, mode, color, classes, type) {
    if (type === "mathord") {
        return mathit(value, mode, color, classes);
    } else if (type === "textord") {
        return makeSymbol(
            value, "Main-Regular", mode, color, classes.concat(["mathrm"]));
    } else {
        throw new Error("unexpected type: " + type + " in mathDefault");
    }
};

/**
 * Makes a symbol in the italic math font.
 */
var mathit = function(value, mode, color, classes) {
    if (/[0-9]/.test(value.charAt(0)) ||
            // glyphs for \imath and \jmath do not exist in Math-Italic so we
            // need to use Main-Italic instead
            utils.contains(dotlessLetters, value) ||
            utils.contains(greekCapitals, value)) {
        return makeSymbol(
            value, "Main-Italic", mode, color, classes.concat(["mainit"]));
    } else {
        return makeSymbol(
            value, "Math-Italic", mode, color, classes.concat(["mathit"]));
    }
};

/**
 * Makes either a mathord or textord in the correct font and color.
 */
var makeOrd = function(group, options, type) {
    var mode = group.mode;
    var value = group.value;
    if (symbols[mode][value] && symbols[mode][value].replace) {
        value = symbols[mode][value].replace;
    }

    var classes = ["mord"];
    var color = options.getColor();

    var font = options.font;
    if (font) {
        if (font === "mathit" || utils.contains(dotlessLetters, value)) {
            return mathit(value, mode, color, classes);
        } else {
            var fontName = fontMap[font].fontName;
            if (fontMetrics.getCharacterMetrics(value, fontName)) {
                return makeSymbol(value, fontName, mode, color, classes.concat([font]));
            } else {
                return mathDefault(value, mode, color, classes, type);
            }
        }
    } else {
        return mathDefault(value, mode, color, classes, type);
    }
};

/**
 * Calculate the height, depth, and maxFontSize of an element based on its
 * children.
 */
var sizeElementFromChildren = function(elem) {
    var height = 0;
    var depth = 0;
    var maxFontSize = 0;

    if (elem.children) {
        for (var i = 0; i < elem.children.length; i++) {
            if (elem.children[i].height > height) {
                height = elem.children[i].height;
            }
            if (elem.children[i].depth > depth) {
                depth = elem.children[i].depth;
            }
            if (elem.children[i].maxFontSize > maxFontSize) {
                maxFontSize = elem.children[i].maxFontSize;
            }
        }
    }

    elem.height = height;
    elem.depth = depth;
    elem.maxFontSize = maxFontSize;
};

/**
 * Makes a span with the given list of classes, list of children, and color.
 */
var makeSpan = function(classes, children, color) {
    var span = new domTree.span(classes, children);

    sizeElementFromChildren(span);

    if (color) {
        span.style.color = color;
    }

    return span;
};

/**
 * Makes a document fragment with the given list of children.
 */
var makeFragment = function(children) {
    var fragment = new domTree.documentFragment(children);

    sizeElementFromChildren(fragment);

    return fragment;
};

/**
 * Makes an element placed in each of the vlist elements to ensure that each
 * element has the same max font size. To do this, we create a zero-width space
 * with the correct font size.
 */
var makeFontSizer = function(options, fontSize) {
    var fontSizeInner = makeSpan([], [new domTree.symbolNode("\u200b")]);
    fontSizeInner.style.fontSize = (fontSize / options.style.sizeMultiplier) + "em";

    var fontSizer = makeSpan(
        ["fontsize-ensurer", "reset-" + options.size, "size5"],
        [fontSizeInner]);

    return fontSizer;
};

/**
 * Makes a vertical list by stacking elements and kerns on top of each other.
 * Allows for many different ways of specifying the positioning method.
 *
 * Arguments:
 *  - children: A list of child or kern nodes to be stacked on top of each other
 *              (i.e. the first element will be at the bottom, and the last at
 *              the top). Element nodes are specified as
 *                {type: "elem", elem: node}
 *              while kern nodes are specified as
 *                {type: "kern", size: size}
 *  - positionType: The method by which the vlist should be positioned. Valid
 *                  values are:
 *                   - "individualShift": The children list only contains elem
 *                                        nodes, and each node contains an extra
 *                                        "shift" value of how much it should be
 *                                        shifted (note that shifting is always
 *                                        moving downwards). positionData is
 *                                        ignored.
 *                   - "top": The positionData specifies the topmost point of
 *                            the vlist (note this is expected to be a height,
 *                            so positive values move up)
 *                   - "bottom": The positionData specifies the bottommost point
 *                               of the vlist (note this is expected to be a
 *                               depth, so positive values move down
 *                   - "shift": The vlist will be positioned such that its
 *                              baseline is positionData away from the baseline
 *                              of the first child. Positive values move
 *                              downwards.
 *                   - "firstBaseline": The vlist will be positioned such that
 *                                      its baseline is aligned with the
 *                                      baseline of the first child.
 *                                      positionData is ignored. (this is
 *                                      equivalent to "shift" with
 *                                      positionData=0)
 *  - positionData: Data used in different ways depending on positionType
 *  - options: An Options object
 *
 */
var makeVList = function(children, positionType, positionData, options) {
    var depth;
    var currPos;
    var i;
    if (positionType === "individualShift") {
        var oldChildren = children;
        children = [oldChildren[0]];

        // Add in kerns to the list of children to get each element to be
        // shifted to the correct specified shift
        depth = -oldChildren[0].shift - oldChildren[0].elem.depth;
        currPos = depth;
        for (i = 1; i < oldChildren.length; i++) {
            var diff = -oldChildren[i].shift - currPos -
                oldChildren[i].elem.depth;
            var size = diff -
                (oldChildren[i - 1].elem.height +
                 oldChildren[i - 1].elem.depth);

            currPos = currPos + diff;

            children.push({type: "kern", size: size});
            children.push(oldChildren[i]);
        }
    } else if (positionType === "top") {
        // We always start at the bottom, so calculate the bottom by adding up
        // all the sizes
        var bottom = positionData;
        for (i = 0; i < children.length; i++) {
            if (children[i].type === "kern") {
                bottom -= children[i].size;
            } else {
                bottom -= children[i].elem.height + children[i].elem.depth;
            }
        }
        depth = bottom;
    } else if (positionType === "bottom") {
        depth = -positionData;
    } else if (positionType === "shift") {
        depth = -children[0].elem.depth - positionData;
    } else if (positionType === "firstBaseline") {
        depth = -children[0].elem.depth;
    } else {
        depth = 0;
    }

    // Make the fontSizer
    var maxFontSize = 0;
    for (i = 0; i < children.length; i++) {
        if (children[i].type === "elem") {
            maxFontSize = Math.max(maxFontSize, children[i].elem.maxFontSize);
        }
    }
    var fontSizer = makeFontSizer(options, maxFontSize);

    // Create a new list of actual children at the correct offsets
    var realChildren = [];
    currPos = depth;
    for (i = 0; i < children.length; i++) {
        if (children[i].type === "kern") {
            currPos += children[i].size;
        } else {
            var child = children[i].elem;

            var shift = -child.depth - currPos;
            currPos += child.height + child.depth;

            var childWrap = makeSpan([], [fontSizer, child]);
            childWrap.height -= shift;
            childWrap.depth += shift;
            childWrap.style.top = shift + "em";

            realChildren.push(childWrap);
        }
    }

    // Add in an element at the end with no offset to fix the calculation of
    // baselines in some browsers (namely IE, sometimes safari)
    var baselineFix = makeSpan(
        ["baseline-fix"], [fontSizer, new domTree.symbolNode("\u200b")]);
    realChildren.push(baselineFix);

    var vlist = makeSpan(["vlist"], realChildren);
    // Fix the final height and depth, in case there were kerns at the ends
    // since the makeSpan calculation won't take that in to account.
    vlist.height = Math.max(currPos, vlist.height);
    vlist.depth = Math.max(-depth, vlist.depth);
    return vlist;
};

// A table of size -> font size for the different sizing functions
var sizingMultiplier = {
    size1: 0.5,
    size2: 0.7,
    size3: 0.8,
    size4: 0.9,
    size5: 1.0,
    size6: 1.2,
    size7: 1.44,
    size8: 1.73,
    size9: 2.07,
    size10: 2.49
};

// A map of spacing functions to their attributes, like size and corresponding
// CSS class
var spacingFunctions = {
    "\\qquad": {
        size: "2em",
        className: "qquad"
    },
    "\\quad": {
        size: "1em",
        className: "quad"
    },
    "\\enspace": {
        size: "0.5em",
        className: "enspace"
    },
    "\\;": {
        size: "0.277778em",
        className: "thickspace"
    },
    "\\:": {
        size: "0.22222em",
        className: "mediumspace"
    },
    "\\,": {
        size: "0.16667em",
        className: "thinspace"
    },
    "\\!": {
        size: "-0.16667em",
        className: "negativethinspace"
    }
};

/**
 * Maps TeX font commands to objects containing:
 * - variant: string used for "mathvariant" attribute in buildMathML.js
 * - fontName: the "style" parameter to fontMetrics.getCharacterMetrics
 */
// A map between tex font commands an MathML mathvariant attribute values
var fontMap = {
    // styles
    "mathbf": {
        variant: "bold",
        fontName: "Main-Bold"
    },
    "mathrm": {
        variant: "normal",
        fontName: "Main-Regular"
    },

    // "mathit" is missing because it requires the use of two fonts: Main-Italic
    // and Math-Italic.  This is handled by a special case in makeOrd which ends
    // up calling mathit.

    // families
    "mathbb": {
        variant: "double-struck",
        fontName: "AMS-Regular"
    },
    "mathcal": {
        variant: "script",
        fontName: "Caligraphic-Regular"
    },
    "mathfrak": {
        variant: "fraktur",
        fontName: "Fraktur-Regular"
    },
    "mathscr": {
        variant: "script",
        fontName: "Script-Regular"
    },
    "mathsf": {
        variant: "sans-serif",
        fontName: "SansSerif-Regular"
    },
    "mathtt": {
        variant: "monospace",
        fontName: "Typewriter-Regular"
    }
};

module.exports = {
    fontMap: fontMap,
    makeSymbol: makeSymbol,
    mathsym: mathsym,
    makeSpan: makeSpan,
    makeFragment: makeFragment,
    makeVList: makeVList,
    makeOrd: makeOrd,
    sizingMultiplier: sizingMultiplier,
    spacingFunctions: spacingFunctions
};

},{"./domTree":39,"./fontMetrics":41,"./symbols":47,"./utils":48}],35:[function(require,module,exports){
/**
 * This file does the main work of building a domTree structure from a parse
 * tree. The entry point is the `buildHTML` function, which takes a parse tree.
 * Then, the buildExpression, buildGroup, and various groupTypes functions are
 * called, to produce a final HTML tree.
 */

var ParseError = require("./ParseError");
var Style = require("./Style");

var buildCommon = require("./buildCommon");
var delimiter = require("./delimiter");
var domTree = require("./domTree");
var fontMetrics = require("./fontMetrics");
var utils = require("./utils");

var makeSpan = buildCommon.makeSpan;

/**
 * Take a list of nodes, build them in order, and return a list of the built
 * nodes. This function handles the `prev` node correctly, and passes the
 * previous element from the list as the prev of the next element.
 */
var buildExpression = function(expression, options, prev) {
    var groups = [];
    for (var i = 0; i < expression.length; i++) {
        var group = expression[i];
        groups.push(buildGroup(group, options, prev));
        prev = group;
    }
    return groups;
};

// List of types used by getTypeOfGroup,
// see https://github.com/Khan/KaTeX/wiki/Examining-TeX#group-types
var groupToType = {
    mathord: "mord",
    textord: "mord",
    bin: "mbin",
    rel: "mrel",
    text: "mord",
    open: "mopen",
    close: "mclose",
    inner: "minner",
    genfrac: "mord",
    array: "mord",
    spacing: "mord",
    punct: "mpunct",
    ordgroup: "mord",
    op: "mop",
    katex: "mord",
    overline: "mord",
    rule: "mord",
    leftright: "minner",
    sqrt: "mord",
    accent: "mord"
};

/**
 * Gets the final math type of an expression, given its group type. This type is
 * used to determine spacing between elements, and affects bin elements by
 * causing them to change depending on what types are around them. This type
 * must be attached to the outermost node of an element as a CSS class so that
 * spacing with its surrounding elements works correctly.
 *
 * Some elements can be mapped one-to-one from group type to math type, and
 * those are listed in the `groupToType` table.
 *
 * Others (usually elements that wrap around other elements) often have
 * recursive definitions, and thus call `getTypeOfGroup` on their inner
 * elements.
 */
var getTypeOfGroup = function(group) {
    if (group == null) {
        // Like when typesetting $^3$
        return groupToType.mathord;
    } else if (group.type === "supsub") {
        return getTypeOfGroup(group.value.base);
    } else if (group.type === "llap" || group.type === "rlap") {
        return getTypeOfGroup(group.value);
    } else if (group.type === "color") {
        return getTypeOfGroup(group.value.value);
    } else if (group.type === "sizing") {
        return getTypeOfGroup(group.value.value);
    } else if (group.type === "styling") {
        return getTypeOfGroup(group.value.value);
    } else if (group.type === "delimsizing") {
        return groupToType[group.value.delimType];
    } else {
        return groupToType[group.type];
    }
};

/**
 * Sometimes, groups perform special rules when they have superscripts or
 * subscripts attached to them. This function lets the `supsub` group know that
 * its inner element should handle the superscripts and subscripts instead of
 * handling them itself.
 */
var shouldHandleSupSub = function(group, options) {
    if (!group) {
        return false;
    } else if (group.type === "op") {
        // Operators handle supsubs differently when they have limits
        // (e.g. `\displaystyle\sum_2^3`)
        return group.value.limits &&
            (options.style.size === Style.DISPLAY.size || group.value.alwaysHandleSupSub);
    } else if (group.type === "accent") {
        return isCharacterBox(group.value.base);
    } else {
        return null;
    }
};

/**
 * Sometimes we want to pull out the innermost element of a group. In most
 * cases, this will just be the group itself, but when ordgroups and colors have
 * a single element, we want to pull that out.
 */
var getBaseElem = function(group) {
    if (!group) {
        return false;
    } else if (group.type === "ordgroup") {
        if (group.value.length === 1) {
            return getBaseElem(group.value[0]);
        } else {
            return group;
        }
    } else if (group.type === "color") {
        if (group.value.value.length === 1) {
            return getBaseElem(group.value.value[0]);
        } else {
            return group;
        }
    } else {
        return group;
    }
};

/**
 * TeXbook algorithms often reference "character boxes", which are simply groups
 * with a single character in them. To decide if something is a character box,
 * we find its innermost group, and see if it is a single character.
 */
var isCharacterBox = function(group) {
    var baseElem = getBaseElem(group);

    // These are all they types of groups which hold single characters
    return baseElem.type === "mathord" ||
        baseElem.type === "textord" ||
        baseElem.type === "bin" ||
        baseElem.type === "rel" ||
        baseElem.type === "inner" ||
        baseElem.type === "open" ||
        baseElem.type === "close" ||
        baseElem.type === "punct";
};

var makeNullDelimiter = function(options) {
    return makeSpan([
        "sizing", "reset-" + options.size, "size5",
        options.style.reset(), Style.TEXT.cls(),
        "nulldelimiter"
    ]);
};

/**
 * This is a map of group types to the function used to handle that type.
 * Simpler types come at the beginning, while complicated types come afterwards.
 */
var groupTypes = {
    mathord: function(group, options, prev) {
        return buildCommon.makeOrd(group, options, "mathord");
    },

    textord: function(group, options, prev) {
        return buildCommon.makeOrd(group, options, "textord");
    },

    bin: function(group, options, prev) {
        var className = "mbin";
        // Pull out the most recent element. Do some special handling to find
        // things at the end of a \color group. Note that we don't use the same
        // logic for ordgroups (which count as ords).
        var prevAtom = prev;
        while (prevAtom && prevAtom.type === "color") {
            var atoms = prevAtom.value.value;
            prevAtom = atoms[atoms.length - 1];
        }
        // See TeXbook pg. 442-446, Rules 5 and 6, and the text before Rule 19.
        // Here, we determine whether the bin should turn into an ord. We
        // currently only apply Rule 5.
        if (!prev || utils.contains(["mbin", "mopen", "mrel", "mop", "mpunct"],
                getTypeOfGroup(prevAtom))) {
            group.type = "textord";
            className = "mord";
        }

        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), [className]);
    },

    rel: function(group, options, prev) {
        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), ["mrel"]);
    },

    open: function(group, options, prev) {
        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), ["mopen"]);
    },

    close: function(group, options, prev) {
        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), ["mclose"]);
    },

    inner: function(group, options, prev) {
        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), ["minner"]);
    },

    punct: function(group, options, prev) {
        return buildCommon.mathsym(
            group.value, group.mode, options.getColor(), ["mpunct"]);
    },

    ordgroup: function(group, options, prev) {
        return makeSpan(
            ["mord", options.style.cls()],
            buildExpression(group.value, options.reset())
        );
    },

    text: function(group, options, prev) {
        return makeSpan(["text", "mord", options.style.cls()],
            buildExpression(group.value.body, options.reset()));
    },

    color: function(group, options, prev) {
        var elements = buildExpression(
            group.value.value,
            options.withColor(group.value.color),
            prev
        );

        // \color isn't supposed to affect the type of the elements it contains.
        // To accomplish this, we wrap the results in a fragment, so the inner
        // elements will be able to directly interact with their neighbors. For
        // example, `\color{red}{2 +} 3` has the same spacing as `2 + 3`
        return new buildCommon.makeFragment(elements);
    },

    supsub: function(group, options, prev) {
        // Superscript and subscripts are handled in the TeXbook on page
        // 445-446, rules 18(a-f).

        // Here is where we defer to the inner group if it should handle
        // superscripts and subscripts itself.
        if (shouldHandleSupSub(group.value.base, options)) {
            return groupTypes[group.value.base.type](group, options, prev);
        }

        var base = buildGroup(group.value.base, options.reset());
        var supmid, submid, sup, sub;

        if (group.value.sup) {
            sup = buildGroup(group.value.sup,
                    options.withStyle(options.style.sup()));
            supmid = makeSpan(
                    [options.style.reset(), options.style.sup().cls()], [sup]);
        }

        if (group.value.sub) {
            sub = buildGroup(group.value.sub,
                    options.withStyle(options.style.sub()));
            submid = makeSpan(
                    [options.style.reset(), options.style.sub().cls()], [sub]);
        }

        // Rule 18a
        var supShift, subShift;
        if (isCharacterBox(group.value.base)) {
            supShift = 0;
            subShift = 0;
        } else {
            supShift = base.height - fontMetrics.metrics.supDrop;
            subShift = base.depth + fontMetrics.metrics.subDrop;
        }

        // Rule 18c
        var minSupShift;
        if (options.style === Style.DISPLAY) {
            minSupShift = fontMetrics.metrics.sup1;
        } else if (options.style.cramped) {
            minSupShift = fontMetrics.metrics.sup3;
        } else {
            minSupShift = fontMetrics.metrics.sup2;
        }

        // scriptspace is a font-size-independent size, so scale it
        // appropriately
        var multiplier = Style.TEXT.sizeMultiplier *
                options.style.sizeMultiplier;
        var scriptspace =
            (0.5 / fontMetrics.metrics.ptPerEm) / multiplier + "em";

        var supsub;
        if (!group.value.sup) {
            // Rule 18b
            subShift = Math.max(
                subShift, fontMetrics.metrics.sub1,
                sub.height - 0.8 * fontMetrics.metrics.xHeight);

            supsub = buildCommon.makeVList([
                {type: "elem", elem: submid}
            ], "shift", subShift, options);

            supsub.children[0].style.marginRight = scriptspace;

            // Subscripts shouldn't be shifted by the base's italic correction.
            // Account for that by shifting the subscript back the appropriate
            // amount. Note we only do this when the base is a single symbol.
            if (base instanceof domTree.symbolNode) {
                supsub.children[0].style.marginLeft = -base.italic + "em";
            }
        } else if (!group.value.sub) {
            // Rule 18c, d
            supShift = Math.max(supShift, minSupShift,
                sup.depth + 0.25 * fontMetrics.metrics.xHeight);

            supsub = buildCommon.makeVList([
                {type: "elem", elem: supmid}
            ], "shift", -supShift, options);

            supsub.children[0].style.marginRight = scriptspace;
        } else {
            supShift = Math.max(
                supShift, minSupShift,
                sup.depth + 0.25 * fontMetrics.metrics.xHeight);
            subShift = Math.max(subShift, fontMetrics.metrics.sub2);

            var ruleWidth = fontMetrics.metrics.defaultRuleThickness;

            // Rule 18e
            if ((supShift - sup.depth) - (sub.height - subShift) <
                    4 * ruleWidth) {
                subShift = 4 * ruleWidth - (supShift - sup.depth) + sub.height;
                var psi = 0.8 * fontMetrics.metrics.xHeight -
                    (supShift - sup.depth);
                if (psi > 0) {
                    supShift += psi;
                    subShift -= psi;
                }
            }

            supsub = buildCommon.makeVList([
                {type: "elem", elem: submid, shift: subShift},
                {type: "elem", elem: supmid, shift: -supShift}
            ], "individualShift", null, options);

            // See comment above about subscripts not being shifted
            if (base instanceof domTree.symbolNode) {
                supsub.children[0].style.marginLeft = -base.italic + "em";
            }

            supsub.children[0].style.marginRight = scriptspace;
            supsub.children[1].style.marginRight = scriptspace;
        }

        return makeSpan([getTypeOfGroup(group.value.base)],
            [base, supsub]);
    },

    genfrac: function(group, options, prev) {
        // Fractions are handled in the TeXbook on pages 444-445, rules 15(a-e).
        // Figure out what style this fraction should be in based on the
        // function used
        var fstyle = options.style;
        if (group.value.size === "display") {
            fstyle = Style.DISPLAY;
        } else if (group.value.size === "text") {
            fstyle = Style.TEXT;
        }

        var nstyle = fstyle.fracNum();
        var dstyle = fstyle.fracDen();

        var numer = buildGroup(group.value.numer, options.withStyle(nstyle));
        var numerreset = makeSpan([fstyle.reset(), nstyle.cls()], [numer]);

        var denom = buildGroup(group.value.denom, options.withStyle(dstyle));
        var denomreset = makeSpan([fstyle.reset(), dstyle.cls()], [denom]);

        var ruleWidth;
        if (group.value.hasBarLine) {
            ruleWidth = fontMetrics.metrics.defaultRuleThickness /
                options.style.sizeMultiplier;
        } else {
            ruleWidth = 0;
        }

        // Rule 15b
        var numShift;
        var clearance;
        var denomShift;
        if (fstyle.size === Style.DISPLAY.size) {
            numShift = fontMetrics.metrics.num1;
            if (ruleWidth > 0) {
                clearance = 3 * ruleWidth;
            } else {
                clearance = 7 * fontMetrics.metrics.defaultRuleThickness;
            }
            denomShift = fontMetrics.metrics.denom1;
        } else {
            if (ruleWidth > 0) {
                numShift = fontMetrics.metrics.num2;
                clearance = ruleWidth;
            } else {
                numShift = fontMetrics.metrics.num3;
                clearance = 3 * fontMetrics.metrics.defaultRuleThickness;
            }
            denomShift = fontMetrics.metrics.denom2;
        }

        var frac;
        if (ruleWidth === 0) {
            // Rule 15c
            var candiateClearance =
                (numShift - numer.depth) - (denom.height - denomShift);
            if (candiateClearance < clearance) {
                numShift += 0.5 * (clearance - candiateClearance);
                denomShift += 0.5 * (clearance - candiateClearance);
            }

            frac = buildCommon.makeVList([
                {type: "elem", elem: denomreset, shift: denomShift},
                {type: "elem", elem: numerreset, shift: -numShift}
            ], "individualShift", null, options);
        } else {
            // Rule 15d
            var axisHeight = fontMetrics.metrics.axisHeight;

            if ((numShift - numer.depth) - (axisHeight + 0.5 * ruleWidth) <
                    clearance) {
                numShift +=
                    clearance - ((numShift - numer.depth) -
                                 (axisHeight + 0.5 * ruleWidth));
            }

            if ((axisHeight - 0.5 * ruleWidth) - (denom.height - denomShift) <
                    clearance) {
                denomShift +=
                    clearance - ((axisHeight - 0.5 * ruleWidth) -
                                 (denom.height - denomShift));
            }

            var mid = makeSpan(
                [options.style.reset(), Style.TEXT.cls(), "frac-line"]);
            // Manually set the height of the line because its height is
            // created in CSS
            mid.height = ruleWidth;

            var midShift = -(axisHeight - 0.5 * ruleWidth);

            frac = buildCommon.makeVList([
                {type: "elem", elem: denomreset, shift: denomShift},
                {type: "elem", elem: mid,        shift: midShift},
                {type: "elem", elem: numerreset, shift: -numShift}
            ], "individualShift", null, options);
        }

        // Since we manually change the style sometimes (with \dfrac or \tfrac),
        // account for the possible size change here.
        frac.height *= fstyle.sizeMultiplier / options.style.sizeMultiplier;
        frac.depth *= fstyle.sizeMultiplier / options.style.sizeMultiplier;

        // Rule 15e
        var delimSize;
        if (fstyle.size === Style.DISPLAY.size) {
            delimSize = fontMetrics.metrics.delim1;
        } else {
            delimSize = fontMetrics.metrics.getDelim2(fstyle);
        }

        var leftDelim, rightDelim;
        if (group.value.leftDelim == null) {
            leftDelim = makeNullDelimiter(options);
        } else {
            leftDelim = delimiter.customSizedDelim(
                group.value.leftDelim, delimSize, true,
                options.withStyle(fstyle), group.mode);
        }
        if (group.value.rightDelim == null) {
            rightDelim = makeNullDelimiter(options);
        } else {
            rightDelim = delimiter.customSizedDelim(
                group.value.rightDelim, delimSize, true,
                options.withStyle(fstyle), group.mode);
        }

        return makeSpan(
            ["mord", options.style.reset(), fstyle.cls()],
            [leftDelim, makeSpan(["mfrac"], [frac]), rightDelim],
            options.getColor());
    },

    array: function(group, options, prev) {
        var r, c;
        var nr = group.value.body.length;
        var nc = 0;
        var body = new Array(nr);

        // Horizontal spacing
        var pt = 1 / fontMetrics.metrics.ptPerEm;
        var arraycolsep = 5 * pt; // \arraycolsep in article.cls

        // Vertical spacing
        var baselineskip = 12 * pt; // see size10.clo
        // Default \arraystretch from lttab.dtx
        // TODO(gagern): may get redefined once we have user-defined macros
        var arraystretch = utils.deflt(group.value.arraystretch, 1);
        var arrayskip = arraystretch * baselineskip;
        var arstrutHeight = 0.7 * arrayskip; // \strutbox in ltfsstrc.dtx and
        var arstrutDepth = 0.3 * arrayskip;  // \@arstrutbox in lttab.dtx

        var totalHeight = 0;
        for (r = 0; r < group.value.body.length; ++r) {
            var inrow = group.value.body[r];
            var height = arstrutHeight; // \@array adds an \@arstrut
            var depth = arstrutDepth;   // to each tow (via the template)

            if (nc < inrow.length) {
                nc = inrow.length;
            }

            var outrow = new Array(inrow.length);
            for (c = 0; c < inrow.length; ++c) {
                var elt = buildGroup(inrow[c], options);
                if (depth < elt.depth) {
                    depth = elt.depth;
                }
                if (height < elt.height) {
                    height = elt.height;
                }
                outrow[c] = elt;
            }

            var gap = 0;
            if (group.value.rowGaps[r]) {
                gap = group.value.rowGaps[r].value;
                switch (gap.unit) {
                case "em":
                    gap = gap.number;
                    break;
                case "ex":
                    gap = gap.number * fontMetrics.metrics.emPerEx;
                    break;
                default:
                    console.error("Can't handle unit " + gap.unit);
                    gap = 0;
                }
                if (gap > 0) { // \@argarraycr
                    gap += arstrutDepth;
                    if (depth < gap) {
                        depth = gap; // \@xargarraycr
                    }
                    gap = 0;
                }
            }

            outrow.height = height;
            outrow.depth = depth;
            totalHeight += height;
            outrow.pos = totalHeight;
            totalHeight += depth + gap; // \@yargarraycr
            body[r] = outrow;
        }

        var offset = totalHeight / 2 + fontMetrics.metrics.axisHeight;
        var colDescriptions = group.value.cols || [];
        var cols = [];
        var colSep;
        var colDescrNum;
        for (c = 0, colDescrNum = 0;
             // Continue while either there are more columns or more column
             // descriptions, so trailing separators don't get lost.
             c < nc || colDescrNum < colDescriptions.length;
             ++c, ++colDescrNum) {

            var colDescr = colDescriptions[colDescrNum] || {};

            var firstSeparator = true;
            while (colDescr.type === "separator") {
                // If there is more than one separator in a row, add a space
                // between them.
                if (!firstSeparator) {
                    colSep = makeSpan(["arraycolsep"], []);
                    colSep.style.width =
                        fontMetrics.metrics.doubleRuleSep + "em";
                    cols.push(colSep);
                }

                if (colDescr.separator === "|") {
                    var separator = makeSpan(
                        ["vertical-separator"],
                        []);
                    separator.style.height = totalHeight + "em";
                    separator.style.verticalAlign =
                        -(totalHeight - offset) + "em";

                    cols.push(separator);
                } else {
                    throw new ParseError(
                        "Invalid separator type: " + colDescr.separator);
                }

                colDescrNum++;
                colDescr = colDescriptions[colDescrNum] || {};
                firstSeparator = false;
            }

            if (c >= nc) {
                continue;
            }

            var sepwidth;
            if (c > 0 || group.value.hskipBeforeAndAfter) {
                sepwidth = utils.deflt(colDescr.pregap, arraycolsep);
                if (sepwidth !== 0) {
                    colSep = makeSpan(["arraycolsep"], []);
                    colSep.style.width = sepwidth + "em";
                    cols.push(colSep);
                }
            }

            var col = [];
            for (r = 0; r < nr; ++r) {
                var row = body[r];
                var elem = row[c];
                if (!elem) {
                    continue;
                }
                var shift = row.pos - offset;
                elem.depth = row.depth;
                elem.height = row.height;
                col.push({type: "elem", elem: elem, shift: shift});
            }

            col = buildCommon.makeVList(col, "individualShift", null, options);
            col = makeSpan(
                ["col-align-" + (colDescr.align || "c")],
                [col]);
            cols.push(col);

            if (c < nc - 1 || group.value.hskipBeforeAndAfter) {
                sepwidth = utils.deflt(colDescr.postgap, arraycolsep);
                if (sepwidth !== 0) {
                    colSep = makeSpan(["arraycolsep"], []);
                    colSep.style.width = sepwidth + "em";
                    cols.push(colSep);
                }
            }
        }
        body = makeSpan(["mtable"], cols);
        return makeSpan(["mord"], [body], options.getColor());
    },

    spacing: function(group, options, prev) {
        if (group.value === "\\ " || group.value === "\\space" ||
            group.value === " " || group.value === "~") {
            // Spaces are generated by adding an actual space. Each of these
            // things has an entry in the symbols table, so these will be turned
            // into appropriate outputs.
            return makeSpan(
                ["mord", "mspace"],
                [buildCommon.mathsym(group.value, group.mode)]
            );
        } else {
            // Other kinds of spaces are of arbitrary width. We use CSS to
            // generate these.
            return makeSpan(
                ["mord", "mspace",
                 buildCommon.spacingFunctions[group.value].className]);
        }
    },

    llap: function(group, options, prev) {
        var inner = makeSpan(
            ["inner"], [buildGroup(group.value.body, options.reset())]);
        var fix = makeSpan(["fix"], []);
        return makeSpan(
            ["llap", options.style.cls()], [inner, fix]);
    },

    rlap: function(group, options, prev) {
        var inner = makeSpan(
            ["inner"], [buildGroup(group.value.body, options.reset())]);
        var fix = makeSpan(["fix"], []);
        return makeSpan(
            ["rlap", options.style.cls()], [inner, fix]);
    },

    op: function(group, options, prev) {
        // Operators are handled in the TeXbook pg. 443-444, rule 13(a).
        var supGroup;
        var subGroup;
        var hasLimits = false;
        if (group.type === "supsub" ) {
            // If we have limits, supsub will pass us its group to handle. Pull
            // out the superscript and subscript and set the group to the op in
            // its base.
            supGroup = group.value.sup;
            subGroup = group.value.sub;
            group = group.value.base;
            hasLimits = true;
        }

        // Most operators have a large successor symbol, but these don't.
        var noSuccessor = [
            "\\smallint"
        ];

        var large = false;
        if (options.style.size === Style.DISPLAY.size &&
            group.value.symbol &&
            !utils.contains(noSuccessor, group.value.body)) {

            // Most symbol operators get larger in displaystyle (rule 13)
            large = true;
        }

        var base;
        var baseShift = 0;
        var slant = 0;
        if (group.value.symbol) {
            // If this is a symbol, create the symbol.
            var style = large ? "Size2-Regular" : "Size1-Regular";
            base = buildCommon.makeSymbol(
                group.value.body, style, "math", options.getColor(),
                ["op-symbol", large ? "large-op" : "small-op", "mop"]);

            // Shift the symbol so its center lies on the axis (rule 13). It
            // appears that our fonts have the centers of the symbols already
            // almost on the axis, so these numbers are very small. Note we
            // don't actually apply this here, but instead it is used either in
            // the vlist creation or separately when there are no limits.
            baseShift = (base.height - base.depth) / 2 -
                fontMetrics.metrics.axisHeight *
                options.style.sizeMultiplier;

            // The slant of the symbol is just its italic correction.
            slant = base.italic;
        } else {
            // Otherwise, this is a text operator. Build the text from the
            // operator's name.
            // TODO(emily): Add a space in the middle of some of these
            // operators, like \limsup
            var output = [];
            for (var i = 1; i < group.value.body.length; i++) {
                output.push(buildCommon.mathsym(group.value.body[i], group.mode));
            }
            base = makeSpan(["mop"], output, options.getColor());
        }

        if (hasLimits) {
            // IE 8 clips \int if it is in a display: inline-block. We wrap it
            // in a new span so it is an inline, and works.
            base = makeSpan([], [base]);

            var supmid, supKern, submid, subKern;
            // We manually have to handle the superscripts and subscripts. This,
            // aside from the kern calculations, is copied from supsub.
            if (supGroup) {
                var sup = buildGroup(
                    supGroup, options.withStyle(options.style.sup()));
                supmid = makeSpan(
                    [options.style.reset(), options.style.sup().cls()], [sup]);

                supKern = Math.max(
                    fontMetrics.metrics.bigOpSpacing1,
                    fontMetrics.metrics.bigOpSpacing3 - sup.depth);
            }

            if (subGroup) {
                var sub = buildGroup(
                    subGroup, options.withStyle(options.style.sub()));
                submid = makeSpan(
                    [options.style.reset(), options.style.sub().cls()],
                    [sub]);

                subKern = Math.max(
                    fontMetrics.metrics.bigOpSpacing2,
                    fontMetrics.metrics.bigOpSpacing4 - sub.height);
            }

            // Build the final group as a vlist of the possible subscript, base,
            // and possible superscript.
            var finalGroup, top, bottom;
            if (!supGroup) {
                top = base.height - baseShift;

                finalGroup = buildCommon.makeVList([
                    {type: "kern", size: fontMetrics.metrics.bigOpSpacing5},
                    {type: "elem", elem: submid},
                    {type: "kern", size: subKern},
                    {type: "elem", elem: base}
                ], "top", top, options);

                // Here, we shift the limits by the slant of the symbol. Note
                // that we are supposed to shift the limits by 1/2 of the slant,
                // but since we are centering the limits adding a full slant of
                // margin will shift by 1/2 that.
                finalGroup.children[0].style.marginLeft = -slant + "em";
            } else if (!subGroup) {
                bottom = base.depth + baseShift;

                finalGroup = buildCommon.makeVList([
                    {type: "elem", elem: base},
                    {type: "kern", size: supKern},
                    {type: "elem", elem: supmid},
                    {type: "kern", size: fontMetrics.metrics.bigOpSpacing5}
                ], "bottom", bottom, options);

                // See comment above about slants
                finalGroup.children[1].style.marginLeft = slant + "em";
            } else if (!supGroup && !subGroup) {
                // This case probably shouldn't occur (this would mean the
                // supsub was sending us a group with no superscript or
                // subscript) but be safe.
                return base;
            } else {
                bottom = fontMetrics.metrics.bigOpSpacing5 +
                    submid.height + submid.depth +
                    subKern +
                    base.depth + baseShift;

                finalGroup = buildCommon.makeVList([
                    {type: "kern", size: fontMetrics.metrics.bigOpSpacing5},
                    {type: "elem", elem: submid},
                    {type: "kern", size: subKern},
                    {type: "elem", elem: base},
                    {type: "kern", size: supKern},
                    {type: "elem", elem: supmid},
                    {type: "kern", size: fontMetrics.metrics.bigOpSpacing5}
                ], "bottom", bottom, options);

                // See comment above about slants
                finalGroup.children[0].style.marginLeft = -slant + "em";
                finalGroup.children[2].style.marginLeft = slant + "em";
            }

            return makeSpan(["mop", "op-limits"], [finalGroup]);
        } else {
            if (group.value.symbol) {
                base.style.top = baseShift + "em";
            }

            return base;
        }
    },

    katex: function(group, options, prev) {
        // The KaTeX logo. The offsets for the K and a were chosen to look
        // good, but the offsets for the T, E, and X were taken from the
        // definition of \TeX in TeX (see TeXbook pg. 356)
        var k = makeSpan(
            ["k"], [buildCommon.mathsym("K", group.mode)]);
        var a = makeSpan(
            ["a"], [buildCommon.mathsym("A", group.mode)]);

        a.height = (a.height + 0.2) * 0.75;
        a.depth = (a.height - 0.2) * 0.75;

        var t = makeSpan(
            ["t"], [buildCommon.mathsym("T", group.mode)]);
        var e = makeSpan(
            ["e"], [buildCommon.mathsym("E", group.mode)]);

        e.height = (e.height - 0.2155);
        e.depth = (e.depth + 0.2155);

        var x = makeSpan(
            ["x"], [buildCommon.mathsym("X", group.mode)]);

        return makeSpan(
            ["katex-logo", "mord"], [k, a, t, e, x], options.getColor());
    },

    overline: function(group, options, prev) {
        // Overlines are handled in the TeXbook pg 443, Rule 9.

        // Build the inner group in the cramped style.
        var innerGroup = buildGroup(group.value.body,
                options.withStyle(options.style.cramp()));

        var ruleWidth = fontMetrics.metrics.defaultRuleThickness /
            options.style.sizeMultiplier;

        // Create the line above the body
        var line = makeSpan(
            [options.style.reset(), Style.TEXT.cls(), "overline-line"]);
        line.height = ruleWidth;
        line.maxFontSize = 1.0;

        // Generate the vlist, with the appropriate kerns
        var vlist = buildCommon.makeVList([
            {type: "elem", elem: innerGroup},
            {type: "kern", size: 3 * ruleWidth},
            {type: "elem", elem: line},
            {type: "kern", size: ruleWidth}
        ], "firstBaseline", null, options);

        return makeSpan(["overline", "mord"], [vlist], options.getColor());
    },

    sqrt: function(group, options, prev) {
        // Square roots are handled in the TeXbook pg. 443, Rule 11.

        // First, we do the same steps as in overline to build the inner group
        // and line
        var inner = buildGroup(group.value.body,
                options.withStyle(options.style.cramp()));

        var ruleWidth = fontMetrics.metrics.defaultRuleThickness /
            options.style.sizeMultiplier;

        var line = makeSpan(
            [options.style.reset(), Style.TEXT.cls(), "sqrt-line"], [],
            options.getColor());
        line.height = ruleWidth;
        line.maxFontSize = 1.0;

        var phi = ruleWidth;
        if (options.style.id < Style.TEXT.id) {
            phi = fontMetrics.metrics.xHeight;
        }

        // Calculate the clearance between the body and line
        var lineClearance = ruleWidth + phi / 4;

        var innerHeight =
            (inner.height + inner.depth) * options.style.sizeMultiplier;
        var minDelimiterHeight = innerHeight + lineClearance + ruleWidth;

        // Create a \surd delimiter of the required minimum size
        var delim = makeSpan(["sqrt-sign"], [
            delimiter.customSizedDelim("\\surd", minDelimiterHeight,
                                       false, options, group.mode)],
                             options.getColor());

        var delimDepth = (delim.height + delim.depth) - ruleWidth;

        // Adjust the clearance based on the delimiter size
        if (delimDepth > inner.height + inner.depth + lineClearance) {
            lineClearance =
                (lineClearance + delimDepth - inner.height - inner.depth) / 2;
        }

        // Shift the delimiter so that its top lines up with the top of the line
        var delimShift = -(inner.height + lineClearance + ruleWidth) + delim.height;
        delim.style.top = delimShift + "em";
        delim.height -= delimShift;
        delim.depth += delimShift;

        // We add a special case here, because even when `inner` is empty, we
        // still get a line. So, we use a simple heuristic to decide if we
        // should omit the body entirely. (note this doesn't work for something
        // like `\sqrt{\rlap{x}}`, but if someone is doing that they deserve for
        // it not to work.
        var body;
        if (inner.height === 0 && inner.depth === 0) {
            body = makeSpan();
        } else {
            body = buildCommon.makeVList([
                {type: "elem", elem: inner},
                {type: "kern", size: lineClearance},
                {type: "elem", elem: line},
                {type: "kern", size: ruleWidth}
            ], "firstBaseline", null, options);
        }

        if (!group.value.index) {
            return makeSpan(["sqrt", "mord"], [delim, body]);
        } else {
            // Handle the optional root index

            // The index is always in scriptscript style
            var root = buildGroup(
                group.value.index,
                options.withStyle(Style.SCRIPTSCRIPT));
            var rootWrap = makeSpan(
                [options.style.reset(), Style.SCRIPTSCRIPT.cls()],
                [root]);

            // Figure out the height and depth of the inner part
            var innerRootHeight = Math.max(delim.height, body.height);
            var innerRootDepth = Math.max(delim.depth, body.depth);

            // The amount the index is shifted by. This is taken from the TeX
            // source, in the definition of `\r@@t`.
            var toShift = 0.6 * (innerRootHeight - innerRootDepth);

            // Build a VList with the superscript shifted up correctly
            var rootVList = buildCommon.makeVList(
                [{type: "elem", elem: rootWrap}],
                "shift", -toShift, options);
            // Add a class surrounding it so we can add on the appropriate
            // kerning
            var rootVListWrap = makeSpan(["root"], [rootVList]);

            return makeSpan(["sqrt", "mord"], [rootVListWrap, delim, body]);
        }
    },

    sizing: function(group, options, prev) {
        // Handle sizing operators like \Huge. Real TeX doesn't actually allow
        // these functions inside of math expressions, so we do some special
        // handling.
        var inner = buildExpression(group.value.value,
                options.withSize(group.value.size), prev);

        var span = makeSpan(["mord"],
            [makeSpan(["sizing", "reset-" + options.size, group.value.size,
                       options.style.cls()],
                      inner)]);

        // Calculate the correct maxFontSize manually
        var fontSize = buildCommon.sizingMultiplier[group.value.size];
        span.maxFontSize = fontSize * options.style.sizeMultiplier;

        return span;
    },

    styling: function(group, options, prev) {
        // Style changes are handled in the TeXbook on pg. 442, Rule 3.

        // Figure out what style we're changing to.
        var style = {
            "display": Style.DISPLAY,
            "text": Style.TEXT,
            "script": Style.SCRIPT,
            "scriptscript": Style.SCRIPTSCRIPT
        };

        var newStyle = style[group.value.style];

        // Build the inner expression in the new style.
        var inner = buildExpression(
            group.value.value, options.withStyle(newStyle), prev);

        return makeSpan([options.style.reset(), newStyle.cls()], inner);
    },

    font: function(group, options, prev) {
        var font = group.value.font;
        return buildGroup(group.value.body, options.withFont(font), prev);
    },

    delimsizing: function(group, options, prev) {
        var delim = group.value.value;

        if (delim === ".") {
            // Empty delimiters still count as elements, even though they don't
            // show anything.
            return makeSpan([groupToType[group.value.delimType]]);
        }

        // Use delimiter.sizedDelim to generate the delimiter.
        return makeSpan(
            [groupToType[group.value.delimType]],
            [delimiter.sizedDelim(
                delim, group.value.size, options, group.mode)]);
    },

    leftright: function(group, options, prev) {
        // Build the inner expression
        var inner = buildExpression(group.value.body, options.reset());

        var innerHeight = 0;
        var innerDepth = 0;

        // Calculate its height and depth
        for (var i = 0; i < inner.length; i++) {
            innerHeight = Math.max(inner[i].height, innerHeight);
            innerDepth = Math.max(inner[i].depth, innerDepth);
        }

        // The size of delimiters is the same, regardless of what style we are
        // in. Thus, to correctly calculate the size of delimiter we need around
        // a group, we scale down the inner size based on the size.
        innerHeight *= options.style.sizeMultiplier;
        innerDepth *= options.style.sizeMultiplier;

        var leftDelim;
        if (group.value.left === ".") {
            // Empty delimiters in \left and \right make null delimiter spaces.
            leftDelim = makeNullDelimiter(options);
        } else {
            // Otherwise, use leftRightDelim to generate the correct sized
            // delimiter.
            leftDelim = delimiter.leftRightDelim(
                group.value.left, innerHeight, innerDepth, options,
                group.mode);
        }
        // Add it to the beginning of the expression
        inner.unshift(leftDelim);

        var rightDelim;
        // Same for the right delimiter
        if (group.value.right === ".") {
            rightDelim = makeNullDelimiter(options);
        } else {
            rightDelim = delimiter.leftRightDelim(
                group.value.right, innerHeight, innerDepth, options,
                group.mode);
        }
        // Add it to the end of the expression.
        inner.push(rightDelim);

        return makeSpan(
            ["minner", options.style.cls()], inner, options.getColor());
    },

    rule: function(group, options, prev) {
        // Make an empty span for the rule
        var rule = makeSpan(["mord", "rule"], [], options.getColor());

        // Calculate the shift, width, and height of the rule, and account for units
        var shift = 0;
        if (group.value.shift) {
            shift = group.value.shift.number;
            if (group.value.shift.unit === "ex") {
                shift *= fontMetrics.metrics.xHeight;
            }
        }

        var width = group.value.width.number;
        if (group.value.width.unit === "ex") {
            width *= fontMetrics.metrics.xHeight;
        }

        var height = group.value.height.number;
        if (group.value.height.unit === "ex") {
            height *= fontMetrics.metrics.xHeight;
        }

        // The sizes of rules are absolute, so make it larger if we are in a
        // smaller style.
        shift /= options.style.sizeMultiplier;
        width /= options.style.sizeMultiplier;
        height /= options.style.sizeMultiplier;

        // Style the rule to the right size
        rule.style.borderRightWidth = width + "em";
        rule.style.borderTopWidth = height + "em";
        rule.style.bottom = shift + "em";

        // Record the height and width
        rule.width = width;
        rule.height = height + shift;
        rule.depth = -shift;

        return rule;
    },

    accent: function(group, options, prev) {
        // Accents are handled in the TeXbook pg. 443, rule 12.
        var base = group.value.base;

        var supsubGroup;
        if (group.type === "supsub") {
            // If our base is a character box, and we have superscripts and
            // subscripts, the supsub will defer to us. In particular, we want
            // to attach the superscripts and subscripts to the inner body (so
            // that the position of the superscripts and subscripts won't be
            // affected by the height of the accent). We accomplish this by
            // sticking the base of the accent into the base of the supsub, and
            // rendering that, while keeping track of where the accent is.

            // The supsub group is the group that was passed in
            var supsub = group;
            // The real accent group is the base of the supsub group
            group = supsub.value.base;
            // The character box is the base of the accent group
            base = group.value.base;
            // Stick the character box into the base of the supsub group
            supsub.value.base = base;

            // Rerender the supsub group with its new base, and store that
            // result.
            supsubGroup = buildGroup(
                supsub, options.reset(), prev);
        }

        // Build the base group
        var body = buildGroup(
            base, options.withStyle(options.style.cramp()));

        // Calculate the skew of the accent. This is based on the line "If the
        // nucleus is not a single character, let s = 0; otherwise set s to the
        // kern amount for the nucleus followed by the \skewchar of its font."
        // Note that our skew metrics are just the kern between each character
        // and the skewchar.
        var skew;
        if (isCharacterBox(base)) {
            // If the base is a character box, then we want the skew of the
            // innermost character. To do that, we find the innermost character:
            var baseChar = getBaseElem(base);
            // Then, we render its group to get the symbol inside it
            var baseGroup = buildGroup(
                baseChar, options.withStyle(options.style.cramp()));
            // Finally, we pull the skew off of the symbol.
            skew = baseGroup.skew;
            // Note that we now throw away baseGroup, because the layers we
            // removed with getBaseElem might contain things like \color which
            // we can't get rid of.
            // TODO(emily): Find a better way to get the skew
        } else {
            skew = 0;
        }

        // calculate the amount of space between the body and the accent
        var clearance = Math.min(body.height, fontMetrics.metrics.xHeight);

        // Build the accent
        var accent = buildCommon.makeSymbol(
            group.value.accent, "Main-Regular", "math", options.getColor());
        // Remove the italic correction of the accent, because it only serves to
        // shift the accent over to a place we don't want.
        accent.italic = 0;

        // The \vec character that the fonts use is a combining character, and
        // thus shows up much too far to the left. To account for this, we add a
        // specific class which shifts the accent over to where we want it.
        // TODO(emily): Fix this in a better way, like by changing the font
        var vecClass = group.value.accent === "\\vec" ? "accent-vec" : null;

        var accentBody = makeSpan(["accent-body", vecClass], [
            makeSpan([], [accent])]);

        accentBody = buildCommon.makeVList([
            {type: "elem", elem: body},
            {type: "kern", size: -clearance},
            {type: "elem", elem: accentBody}
        ], "firstBaseline", null, options);

        // Shift the accent over by the skew. Note we shift by twice the skew
        // because we are centering the accent, so by adding 2*skew to the left,
        // we shift it to the right by 1*skew.
        accentBody.children[1].style.marginLeft = 2 * skew + "em";

        var accentWrap = makeSpan(["mord", "accent"], [accentBody]);

        if (supsubGroup) {
            // Here, we replace the "base" child of the supsub with our newly
            // generated accent.
            supsubGroup.children[0] = accentWrap;

            // Since we don't rerun the height calculation after replacing the
            // accent, we manually recalculate height.
            supsubGroup.height = Math.max(accentWrap.height, supsubGroup.height);

            // Accents should always be ords, even when their innards are not.
            supsubGroup.classes[0] = "mord";

            return supsubGroup;
        } else {
            return accentWrap;
        }
    },

    phantom: function(group, options, prev) {
        var elements = buildExpression(
            group.value.value,
            options.withPhantom(),
            prev
        );

        // \phantom isn't supposed to affect the elements it contains.
        // See "color" for more details.
        return new buildCommon.makeFragment(elements);
    }
};

/**
 * buildGroup is the function that takes a group and calls the correct groupType
 * function for it. It also handles the interaction of size and style changes
 * between parents and children.
 */
var buildGroup = function(group, options, prev) {
    if (!group) {
        return makeSpan();
    }

    if (groupTypes[group.type]) {
        // Call the groupTypes function
        var groupNode = groupTypes[group.type](group, options, prev);
        var multiplier;

        // If the style changed between the parent and the current group,
        // account for the size difference
        if (options.style !== options.parentStyle) {
            multiplier = options.style.sizeMultiplier /
                    options.parentStyle.sizeMultiplier;

            groupNode.height *= multiplier;
            groupNode.depth *= multiplier;
        }

        // If the size changed between the parent and the current group, account
        // for that size difference.
        if (options.size !== options.parentSize) {
            multiplier = buildCommon.sizingMultiplier[options.size] /
                    buildCommon.sizingMultiplier[options.parentSize];

            groupNode.height *= multiplier;
            groupNode.depth *= multiplier;
        }

        return groupNode;
    } else {
        throw new ParseError(
            "Got group of unknown type: '" + group.type + "'");
    }
};

/**
 * Take an entire parse tree, and build it into an appropriate set of HTML
 * nodes.
 */
var buildHTML = function(tree, options) {
    // buildExpression is destructive, so we need to make a clone
    // of the incoming tree so that it isn't accidentally changed
    tree = JSON.parse(JSON.stringify(tree));

    // Build the expression contained in the tree
    var expression = buildExpression(tree, options);
    var body = makeSpan(["base", options.style.cls()], expression);

    // Add struts, which ensure that the top of the HTML element falls at the
    // height of the expression, and the bottom of the HTML element falls at the
    // depth of the expression.
    var topStrut = makeSpan(["strut"]);
    var bottomStrut = makeSpan(["strut", "bottom"]);

    topStrut.style.height = body.height + "em";
    bottomStrut.style.height = (body.height + body.depth) + "em";
    // We'd like to use `vertical-align: top` but in IE 9 this lowers the
    // baseline of the box to the bottom of this strut (instead staying in the
    // normal place) so we use an absolute value for vertical-align instead
    bottomStrut.style.verticalAlign = -body.depth + "em";

    // Wrap the struts and body together
    var htmlNode = makeSpan(["katex-html"], [topStrut, bottomStrut, body]);

    htmlNode.setAttribute("aria-hidden", "true");

    return htmlNode;
};

module.exports = buildHTML;

},{"./ParseError":30,"./Style":33,"./buildCommon":34,"./delimiter":38,"./domTree":39,"./fontMetrics":41,"./utils":48}],36:[function(require,module,exports){
/**
 * This file converts a parse tree into a cooresponding MathML tree. The main
 * entry point is the `buildMathML` function, which takes a parse tree from the
 * parser.
 */

var buildCommon = require("./buildCommon");
var fontMetrics = require("./fontMetrics");
var mathMLTree = require("./mathMLTree");
var ParseError = require("./ParseError");
var symbols = require("./symbols");
var utils = require("./utils");

var makeSpan = buildCommon.makeSpan;
var fontMap = buildCommon.fontMap;

/**
 * Takes a symbol and converts it into a MathML text node after performing
 * optional replacement from symbols.js.
 */
var makeText = function(text, mode) {
    if (symbols[mode][text] && symbols[mode][text].replace) {
        text = symbols[mode][text].replace;
    }

    return new mathMLTree.TextNode(text);
};

/**
 * Returns the math variant as a string or null if none is required.
 */
var getVariant = function(group, options) {
    var font = options.font;
    if (!font) {
        return null;
    }

    var mode = group.mode;
    if (font === "mathit") {
        return "italic";
    }

    var value = group.value;
    if (utils.contains(["\\imath", "\\jmath"], value)) {
        return null;
    }

    if (symbols[mode][value] && symbols[mode][value].replace) {
        value = symbols[mode][value].replace;
    }

    var fontName = fontMap[font].fontName;
    if (fontMetrics.getCharacterMetrics(value, fontName)) {
        return fontMap[options.font].variant;
    }

    return null;
};

/**
 * Functions for handling the different types of groups found in the parse
 * tree. Each function should take a parse group and return a MathML node.
 */
var groupTypes = {
    mathord: function(group, options) {
        var node = new mathMLTree.MathNode(
            "mi",
            [makeText(group.value, group.mode)]);

        var variant = getVariant(group, options);
        if (variant) {
            node.setAttribute("mathvariant", variant);
        }
        return node;
    },

    textord: function(group, options) {
        var text = makeText(group.value, group.mode);

        var variant = getVariant(group, options) || "normal";

        var node;
        if (/[0-9]/.test(group.value)) {
            // TODO(kevinb) merge adjacent <mn> nodes
            // do it as a post processing step
            node = new mathMLTree.MathNode("mn", [text]);
            if (options.font) {
                node.setAttribute("mathvariant", variant);
            }
        } else {
            node = new mathMLTree.MathNode("mi", [text]);
            node.setAttribute("mathvariant", variant);
        }

        return node;
    },

    bin: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        return node;
    },

    rel: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        return node;
    },

    open: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        return node;
    },

    close: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        return node;
    },

    inner: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        return node;
    },

    punct: function(group) {
        var node = new mathMLTree.MathNode(
            "mo", [makeText(group.value, group.mode)]);

        node.setAttribute("separator", "true");

        return node;
    },

    ordgroup: function(group, options) {
        var inner = buildExpression(group.value, options);

        var node = new mathMLTree.MathNode("mrow", inner);

        return node;
    },

    text: function(group, options) {
        var inner = buildExpression(group.value.body, options);

        var node = new mathMLTree.MathNode("mtext", inner);

        return node;
    },

    color: function(group, options) {
        var inner = buildExpression(group.value.value, options);

        var node = new mathMLTree.MathNode("mstyle", inner);

        node.setAttribute("mathcolor", group.value.color);

        return node;
    },

    supsub: function(group, options) {
        var children = [buildGroup(group.value.base, options)];

        if (group.value.sub) {
            children.push(buildGroup(group.value.sub, options));
        }

        if (group.value.sup) {
            children.push(buildGroup(group.value.sup, options));
        }

        var nodeType;
        if (!group.value.sub) {
            nodeType = "msup";
        } else if (!group.value.sup) {
            nodeType = "msub";
        } else {
            nodeType = "msubsup";
        }

        var node = new mathMLTree.MathNode(nodeType, children);

        return node;
    },

    genfrac: function(group, options) {
        var node = new mathMLTree.MathNode(
            "mfrac",
            [buildGroup(group.value.numer, options),
             buildGroup(group.value.denom, options)]);

        if (!group.value.hasBarLine) {
            node.setAttribute("linethickness", "0px");
        }

        if (group.value.leftDelim != null || group.value.rightDelim != null) {
            var withDelims = [];

            if (group.value.leftDelim != null) {
                var leftOp = new mathMLTree.MathNode(
                    "mo", [new mathMLTree.TextNode(group.value.leftDelim)]);

                leftOp.setAttribute("fence", "true");

                withDelims.push(leftOp);
            }

            withDelims.push(node);

            if (group.value.rightDelim != null) {
                var rightOp = new mathMLTree.MathNode(
                    "mo", [new mathMLTree.TextNode(group.value.rightDelim)]);

                rightOp.setAttribute("fence", "true");

                withDelims.push(rightOp);
            }

            var outerNode = new mathMLTree.MathNode("mrow", withDelims);

            return outerNode;
        }

        return node;
    },

    array: function(group, options) {
        return new mathMLTree.MathNode(
            "mtable", group.value.body.map(function(row) {
                return new mathMLTree.MathNode(
                    "mtr", row.map(function(cell) {
                        return new mathMLTree.MathNode(
                            "mtd", [buildGroup(cell, options)]);
                    }));
            }));
    },

    sqrt: function(group, options) {
        var node;
        if (group.value.index) {
            node = new mathMLTree.MathNode(
                "mroot", [
                    buildGroup(group.value.body, options),
                    buildGroup(group.value.index, options)
                ]);
        } else {
            node = new mathMLTree.MathNode(
                "msqrt", [buildGroup(group.value.body, options)]);
        }

        return node;
    },

    leftright: function(group, options) {
        var inner = buildExpression(group.value.body, options);

        if (group.value.left !== ".") {
            var leftNode = new mathMLTree.MathNode(
                "mo", [makeText(group.value.left, group.mode)]);

            leftNode.setAttribute("fence", "true");

            inner.unshift(leftNode);
        }

        if (group.value.right !== ".") {
            var rightNode = new mathMLTree.MathNode(
                "mo", [makeText(group.value.right, group.mode)]);

            rightNode.setAttribute("fence", "true");

            inner.push(rightNode);
        }

        var outerNode = new mathMLTree.MathNode("mrow", inner);

        return outerNode;
    },

    accent: function(group, options) {
        var accentNode = new mathMLTree.MathNode(
            "mo", [makeText(group.value.accent, group.mode)]);

        var node = new mathMLTree.MathNode(
            "mover",
            [buildGroup(group.value.base, options),
             accentNode]);

        node.setAttribute("accent", "true");

        return node;
    },

    spacing: function(group) {
        var node;

        if (group.value === "\\ " || group.value === "\\space" ||
            group.value === " " || group.value === "~") {
            node = new mathMLTree.MathNode(
                "mtext", [new mathMLTree.TextNode("\u00a0")]);
        } else {
            node = new mathMLTree.MathNode("mspace");

            node.setAttribute(
                "width", buildCommon.spacingFunctions[group.value].size);
        }

        return node;
    },

    op: function(group) {
        var node;

        // TODO(emily): handle big operators using the `largeop` attribute

        if (group.value.symbol) {
            // This is a symbol. Just add the symbol.
            node = new mathMLTree.MathNode(
                "mo", [makeText(group.value.body, group.mode)]);
        } else {
            // This is a text operator. Add all of the characters from the
            // operator's name.
            // TODO(emily): Add a space in the middle of some of these
            // operators, like \limsup.
            node = new mathMLTree.MathNode(
                "mi", [new mathMLTree.TextNode(group.value.body.slice(1))]);
        }

        return node;
    },

    katex: function(group) {
        var node = new mathMLTree.MathNode(
            "mtext", [new mathMLTree.TextNode("KaTeX")]);

        return node;
    },

    font: function(group, options) {
        var font = group.value.font;
        return buildGroup(group.value.body, options.withFont(font));
    },

    delimsizing: function(group) {
        var children = [];

        if (group.value.value !== ".") {
            children.push(makeText(group.value.value, group.mode));
        }

        var node = new mathMLTree.MathNode("mo", children);

        if (group.value.delimType === "open" ||
            group.value.delimType === "close") {
            // Only some of the delimsizing functions act as fences, and they
            // return "open" or "close" delimTypes.
            node.setAttribute("fence", "true");
        } else {
            // Explicitly disable fencing if it's not a fence, to override the
            // defaults.
            node.setAttribute("fence", "false");
        }

        return node;
    },

    styling: function(group, options) {
        var inner = buildExpression(group.value.value, options);

        var node = new mathMLTree.MathNode("mstyle", inner);

        var styleAttributes = {
            "display": ["0", "true"],
            "text": ["0", "false"],
            "script": ["1", "false"],
            "scriptscript": ["2", "false"]
        };

        var attr = styleAttributes[group.value.style];

        node.setAttribute("scriptlevel", attr[0]);
        node.setAttribute("displaystyle", attr[1]);

        return node;
    },

    sizing: function(group, options) {
        var inner = buildExpression(group.value.value, options);

        var node = new mathMLTree.MathNode("mstyle", inner);

        // TODO(emily): This doesn't produce the correct size for nested size
        // changes, because we don't keep state of what style we're currently
        // in, so we can't reset the size to normal before changing it.  Now
        // that we're passing an options parameter we should be able to fix
        // this.
        node.setAttribute(
            "mathsize", buildCommon.sizingMultiplier[group.value.size] + "em");

        return node;
    },

    overline: function(group, options) {
        var operator = new mathMLTree.MathNode(
            "mo", [new mathMLTree.TextNode("\u203e")]);
        operator.setAttribute("stretchy", "true");

        var node = new mathMLTree.MathNode(
            "mover",
            [buildGroup(group.value.body, options),
             operator]);
        node.setAttribute("accent", "true");

        return node;
    },

    rule: function(group) {
        // TODO(emily): Figure out if there's an actual way to draw black boxes
        // in MathML.
        var node = new mathMLTree.MathNode("mrow");

        return node;
    },

    llap: function(group, options) {
        var node = new mathMLTree.MathNode(
            "mpadded", [buildGroup(group.value.body, options)]);

        node.setAttribute("lspace", "-1width");
        node.setAttribute("width", "0px");

        return node;
    },

    rlap: function(group, options) {
        var node = new mathMLTree.MathNode(
            "mpadded", [buildGroup(group.value.body, options)]);

        node.setAttribute("width", "0px");

        return node;
    },

    phantom: function(group, options, prev) {
        var inner = buildExpression(group.value.value, options);
        return new mathMLTree.MathNode("mphantom", inner);
    }
};

/**
 * Takes a list of nodes, builds them, and returns a list of the generated
 * MathML nodes. A little simpler than the HTML version because we don't do any
 * previous-node handling.
 */
var buildExpression = function(expression, options) {
    var groups = [];
    for (var i = 0; i < expression.length; i++) {
        var group = expression[i];
        groups.push(buildGroup(group, options));
    }
    return groups;
};

/**
 * Takes a group from the parser and calls the appropriate groupTypes function
 * on it to produce a MathML node.
 */
var buildGroup = function(group, options) {
    if (!group) {
        return new mathMLTree.MathNode("mrow");
    }

    if (groupTypes[group.type]) {
        // Call the groupTypes function
        return groupTypes[group.type](group, options);
    } else {
        throw new ParseError(
            "Got group of unknown type: '" + group.type + "'");
    }
};

/**
 * Takes a full parse tree and settings and builds a MathML representation of
 * it. In particular, we put the elements from building the parse tree into a
 * <semantics> tag so we can also include that TeX source as an annotation.
 *
 * Note that we actually return a domTree element with a `<math>` inside it so
 * we can do appropriate styling.
 */
var buildMathML = function(tree, texExpression, options) {
    var expression = buildExpression(tree, options);

    // Wrap up the expression in an mrow so it is presented in the semantics
    // tag correctly.
    var wrapper = new mathMLTree.MathNode("mrow", expression);

    // Build a TeX annotation of the source
    var annotation = new mathMLTree.MathNode(
        "annotation", [new mathMLTree.TextNode(texExpression)]);

    annotation.setAttribute("encoding", "application/x-tex");

    var semantics = new mathMLTree.MathNode(
        "semantics", [wrapper, annotation]);

    var math = new mathMLTree.MathNode("math", [semantics]);

    // You can't style <math> nodes, so we wrap the node in a span.
    return makeSpan(["katex-mathml"], [math]);
};

module.exports = buildMathML;

},{"./ParseError":30,"./buildCommon":34,"./fontMetrics":41,"./mathMLTree":44,"./symbols":47,"./utils":48}],37:[function(require,module,exports){
var buildHTML = require("./buildHTML");
var buildMathML = require("./buildMathML");
var buildCommon = require("./buildCommon");
var Options = require("./Options");
var Settings = require("./Settings");
var Style = require("./Style");

var makeSpan = buildCommon.makeSpan;

var buildTree = function(tree, expression, settings) {
    settings = settings || new Settings({});

    var startStyle = Style.TEXT;
    if (settings.displayMode) {
        startStyle = Style.DISPLAY;
    }

    // Setup the default options
    var options = new Options({
        style: startStyle,
        size: "size5"
    });

    // `buildHTML` sometimes messes with the parse tree (like turning bins ->
    // ords), so we build the MathML version first.
    var mathMLNode = buildMathML(tree, expression, options);
    var htmlNode = buildHTML(tree, options);

    var katexNode = makeSpan(["katex"], [
        mathMLNode, htmlNode
    ]);

    if (settings.displayMode) {
        return makeSpan(["katex-display"], [katexNode]);
    } else {
        return katexNode;
    }
};

module.exports = buildTree;

},{"./Options":29,"./Settings":32,"./Style":33,"./buildCommon":34,"./buildHTML":35,"./buildMathML":36}],38:[function(require,module,exports){
/**
 * This file deals with creating delimiters of various sizes. The TeXbook
 * discusses these routines on page 441-442, in the "Another subroutine sets box
 * x to a specified variable delimiter" paragraph.
 *
 * There are three main routines here. `makeSmallDelim` makes a delimiter in the
 * normal font, but in either text, script, or scriptscript style.
 * `makeLargeDelim` makes a delimiter in textstyle, but in one of the Size1,
 * Size2, Size3, or Size4 fonts. `makeStackedDelim` makes a delimiter out of
 * smaller pieces that are stacked on top of one another.
 *
 * The functions take a parameter `center`, which determines if the delimiter
 * should be centered around the axis.
 *
 * Then, there are three exposed functions. `sizedDelim` makes a delimiter in
 * one of the given sizes. This is used for things like `\bigl`.
 * `customSizedDelim` makes a delimiter with a given total height+depth. It is
 * called in places like `\sqrt`. `leftRightDelim` makes an appropriate
 * delimiter which surrounds an expression of a given height an depth. It is
 * used in `\left` and `\right`.
 */

var ParseError = require("./ParseError");
var Style = require("./Style");

var buildCommon = require("./buildCommon");
var fontMetrics = require("./fontMetrics");
var symbols = require("./symbols");
var utils = require("./utils");

var makeSpan = buildCommon.makeSpan;

/**
 * Get the metrics for a given symbol and font, after transformation (i.e.
 * after following replacement from symbols.js)
 */
var getMetrics = function(symbol, font) {
    if (symbols.math[symbol] && symbols.math[symbol].replace) {
        return fontMetrics.getCharacterMetrics(
            symbols.math[symbol].replace, font);
    } else {
        return fontMetrics.getCharacterMetrics(
            symbol, font);
    }
};

/**
 * Builds a symbol in the given font size (note size is an integer)
 */
var mathrmSize = function(value, size, mode) {
    return buildCommon.makeSymbol(value, "Size" + size + "-Regular", mode);
};

/**
 * Puts a delimiter span in a given style, and adds appropriate height, depth,
 * and maxFontSizes.
 */
var styleWrap = function(delim, toStyle, options) {
    var span = makeSpan(
        ["style-wrap", options.style.reset(), toStyle.cls()], [delim]);

    var multiplier = toStyle.sizeMultiplier / options.style.sizeMultiplier;

    span.height *= multiplier;
    span.depth *= multiplier;
    span.maxFontSize = toStyle.sizeMultiplier;

    return span;
};

/**
 * Makes a small delimiter. This is a delimiter that comes in the Main-Regular
 * font, but is restyled to either be in textstyle, scriptstyle, or
 * scriptscriptstyle.
 */
var makeSmallDelim = function(delim, style, center, options, mode) {
    var text = buildCommon.makeSymbol(delim, "Main-Regular", mode);

    var span = styleWrap(text, style, options);

    if (center) {
        var shift =
            (1 - options.style.sizeMultiplier / style.sizeMultiplier) *
            fontMetrics.metrics.axisHeight;

        span.style.top = shift + "em";
        span.height -= shift;
        span.depth += shift;
    }

    return span;
};

/**
 * Makes a large delimiter. This is a delimiter that comes in the Size1, Size2,
 * Size3, or Size4 fonts. It is always rendered in textstyle.
 */
var makeLargeDelim = function(delim, size, center, options, mode) {
    var inner = mathrmSize(delim, size, mode);

    var span = styleWrap(
        makeSpan(["delimsizing", "size" + size],
                 [inner], options.getColor()),
        Style.TEXT, options);

    if (center) {
        var shift = (1 - options.style.sizeMultiplier) *
            fontMetrics.metrics.axisHeight;

        span.style.top = shift + "em";
        span.height -= shift;
        span.depth += shift;
    }

    return span;
};

/**
 * Make an inner span with the given offset and in the given font. This is used
 * in `makeStackedDelim` to make the stacking pieces for the delimiter.
 */
var makeInner = function(symbol, font, mode) {
    var sizeClass;
    // Apply the correct CSS class to choose the right font.
    if (font === "Size1-Regular") {
        sizeClass = "delim-size1";
    } else if (font === "Size4-Regular") {
        sizeClass = "delim-size4";
    }

    var inner = makeSpan(
        ["delimsizinginner", sizeClass],
        [makeSpan([], [buildCommon.makeSymbol(symbol, font, mode)])]);

    // Since this will be passed into `makeVList` in the end, wrap the element
    // in the appropriate tag that VList uses.
    return {type: "elem", elem: inner};
};

/**
 * Make a stacked delimiter out of a given delimiter, with the total height at
 * least `heightTotal`. This routine is mentioned on page 442 of the TeXbook.
 */
var makeStackedDelim = function(delim, heightTotal, center, options, mode) {
    // There are four parts, the top, an optional middle, a repeated part, and a
    // bottom.
    var top, middle, repeat, bottom;
    top = repeat = bottom = delim;
    middle = null;
    // Also keep track of what font the delimiters are in
    var font = "Size1-Regular";

    // We set the parts and font based on the symbol. Note that we use
    // '\u23d0' instead of '|' and '\u2016' instead of '\\|' for the
    // repeats of the arrows
    if (delim === "\\uparrow") {
        repeat = bottom = "\u23d0";
    } else if (delim === "\\Uparrow") {
        repeat = bottom = "\u2016";
    } else if (delim === "\\downarrow") {
        top = repeat = "\u23d0";
    } else if (delim === "\\Downarrow") {
        top = repeat = "\u2016";
    } else if (delim === "\\updownarrow") {
        top = "\\uparrow";
        repeat = "\u23d0";
        bottom = "\\downarrow";
    } else if (delim === "\\Updownarrow") {
        top = "\\Uparrow";
        repeat = "\u2016";
        bottom = "\\Downarrow";
    } else if (delim === "[" || delim === "\\lbrack") {
        top = "\u23a1";
        repeat = "\u23a2";
        bottom = "\u23a3";
        font = "Size4-Regular";
    } else if (delim === "]" || delim === "\\rbrack") {
        top = "\u23a4";
        repeat = "\u23a5";
        bottom = "\u23a6";
        font = "Size4-Regular";
    } else if (delim === "\\lfloor") {
        repeat = top = "\u23a2";
        bottom = "\u23a3";
        font = "Size4-Regular";
    } else if (delim === "\\lceil") {
        top = "\u23a1";
        repeat = bottom = "\u23a2";
        font = "Size4-Regular";
    } else if (delim === "\\rfloor") {
        repeat = top = "\u23a5";
        bottom = "\u23a6";
        font = "Size4-Regular";
    } else if (delim === "\\rceil") {
        top = "\u23a4";
        repeat = bottom = "\u23a5";
        font = "Size4-Regular";
    } else if (delim === "(") {
        top = "\u239b";
        repeat = "\u239c";
        bottom = "\u239d";
        font = "Size4-Regular";
    } else if (delim === ")") {
        top = "\u239e";
        repeat = "\u239f";
        bottom = "\u23a0";
        font = "Size4-Regular";
    } else if (delim === "\\{" || delim === "\\lbrace") {
        top = "\u23a7";
        middle = "\u23a8";
        bottom = "\u23a9";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\}" || delim === "\\rbrace") {
        top = "\u23ab";
        middle = "\u23ac";
        bottom = "\u23ad";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\lgroup") {
        top = "\u23a7";
        bottom = "\u23a9";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\rgroup") {
        top = "\u23ab";
        bottom = "\u23ad";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\lmoustache") {
        top = "\u23a7";
        bottom = "\u23ad";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\rmoustache") {
        top = "\u23ab";
        bottom = "\u23a9";
        repeat = "\u23aa";
        font = "Size4-Regular";
    } else if (delim === "\\surd") {
        top = "\ue001";
        bottom = "\u23b7";
        repeat = "\ue000";
        font = "Size4-Regular";
    }

    // Get the metrics of the four sections
    var topMetrics = getMetrics(top, font);
    var topHeightTotal = topMetrics.height + topMetrics.depth;
    var repeatMetrics = getMetrics(repeat, font);
    var repeatHeightTotal = repeatMetrics.height + repeatMetrics.depth;
    var bottomMetrics = getMetrics(bottom, font);
    var bottomHeightTotal = bottomMetrics.height + bottomMetrics.depth;
    var middleHeightTotal = 0;
    var middleFactor = 1;
    if (middle !== null) {
        var middleMetrics = getMetrics(middle, font);
        middleHeightTotal = middleMetrics.height + middleMetrics.depth;
        middleFactor = 2; // repeat symmetrically above and below middle
    }

    // Calcuate the minimal height that the delimiter can have.
    // It is at least the size of the top, bottom, and optional middle combined.
    var minHeight = topHeightTotal + bottomHeightTotal + middleHeightTotal;

    // Compute the number of copies of the repeat symbol we will need
    var repeatCount = Math.ceil(
        (heightTotal - minHeight) / (middleFactor * repeatHeightTotal));

    // Compute the total height of the delimiter including all the symbols
    var realHeightTotal =
        minHeight + repeatCount * middleFactor * repeatHeightTotal;

    // The center of the delimiter is placed at the center of the axis. Note
    // that in this context, "center" means that the delimiter should be
    // centered around the axis in the current style, while normally it is
    // centered around the axis in textstyle.
    var axisHeight = fontMetrics.metrics.axisHeight;
    if (center) {
        axisHeight *= options.style.sizeMultiplier;
    }
    // Calculate the depth
    var depth = realHeightTotal / 2 - axisHeight;

    // Now, we start building the pieces that will go into the vlist

    // Keep a list of the inner pieces
    var inners = [];

    // Add the bottom symbol
    inners.push(makeInner(bottom, font, mode));

    var i;
    if (middle === null) {
        // Add that many symbols
        for (i = 0; i < repeatCount; i++) {
            inners.push(makeInner(repeat, font, mode));
        }
    } else {
        // When there is a middle bit, we need the middle part and two repeated
        // sections
        for (i = 0; i < repeatCount; i++) {
            inners.push(makeInner(repeat, font, mode));
        }
        inners.push(makeInner(middle, font, mode));
        for (i = 0; i < repeatCount; i++) {
            inners.push(makeInner(repeat, font, mode));
        }
    }

    // Add the top symbol
    inners.push(makeInner(top, font, mode));

    // Finally, build the vlist
    var inner = buildCommon.makeVList(inners, "bottom", depth, options);

    return styleWrap(
        makeSpan(["delimsizing", "mult"], [inner], options.getColor()),
        Style.TEXT, options);
};

// There are three kinds of delimiters, delimiters that stack when they become
// too large
var stackLargeDelimiters = [
    "(", ")", "[", "\\lbrack", "]", "\\rbrack",
    "\\{", "\\lbrace", "\\}", "\\rbrace",
    "\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
    "\\surd"
];

// delimiters that always stack
var stackAlwaysDelimiters = [
    "\\uparrow", "\\downarrow", "\\updownarrow",
    "\\Uparrow", "\\Downarrow", "\\Updownarrow",
    "|", "\\|", "\\vert", "\\Vert",
    "\\lvert", "\\rvert", "\\lVert", "\\rVert",
    "\\lgroup", "\\rgroup", "\\lmoustache", "\\rmoustache"
];

// and delimiters that never stack
var stackNeverDelimiters = [
    "<", ">", "\\langle", "\\rangle", "/", "\\backslash"
];

// Metrics of the different sizes. Found by looking at TeX's output of
// $\bigl| // \Bigl| \biggl| \Biggl| \showlists$
// Used to create stacked delimiters of appropriate sizes in makeSizedDelim.
var sizeToMaxHeight = [0, 1.2, 1.8, 2.4, 3.0];

/**
 * Used to create a delimiter of a specific size, where `size` is 1, 2, 3, or 4.
 */
var makeSizedDelim = function(delim, size, options, mode) {
    // < and > turn into \langle and \rangle in delimiters
    if (delim === "<") {
        delim = "\\langle";
    } else if (delim === ">") {
        delim = "\\rangle";
    }

    // Sized delimiters are never centered.
    if (utils.contains(stackLargeDelimiters, delim) ||
        utils.contains(stackNeverDelimiters, delim)) {
        return makeLargeDelim(delim, size, false, options, mode);
    } else if (utils.contains(stackAlwaysDelimiters, delim)) {
        return makeStackedDelim(
            delim, sizeToMaxHeight[size], false, options, mode);
    } else {
        throw new ParseError("Illegal delimiter: '" + delim + "'");
    }
};

/**
 * There are three different sequences of delimiter sizes that the delimiters
 * follow depending on the kind of delimiter. This is used when creating custom
 * sized delimiters to decide whether to create a small, large, or stacked
 * delimiter.
 *
 * In real TeX, these sequences aren't explicitly defined, but are instead
 * defined inside the font metrics. Since there are only three sequences that
 * are possible for the delimiters that TeX defines, it is easier to just encode
 * them explicitly here.
 */

// Delimiters that never stack try small delimiters and large delimiters only
var stackNeverDelimiterSequence = [
    {type: "small", style: Style.SCRIPTSCRIPT},
    {type: "small", style: Style.SCRIPT},
    {type: "small", style: Style.TEXT},
    {type: "large", size: 1},
    {type: "large", size: 2},
    {type: "large", size: 3},
    {type: "large", size: 4}
];

// Delimiters that always stack try the small delimiters first, then stack
var stackAlwaysDelimiterSequence = [
    {type: "small", style: Style.SCRIPTSCRIPT},
    {type: "small", style: Style.SCRIPT},
    {type: "small", style: Style.TEXT},
    {type: "stack"}
];

// Delimiters that stack when large try the small and then large delimiters, and
// stack afterwards
var stackLargeDelimiterSequence = [
    {type: "small", style: Style.SCRIPTSCRIPT},
    {type: "small", style: Style.SCRIPT},
    {type: "small", style: Style.TEXT},
    {type: "large", size: 1},
    {type: "large", size: 2},
    {type: "large", size: 3},
    {type: "large", size: 4},
    {type: "stack"}
];

/**
 * Get the font used in a delimiter based on what kind of delimiter it is.
 */
var delimTypeToFont = function(type) {
    if (type.type === "small") {
        return "Main-Regular";
    } else if (type.type === "large") {
        return "Size" + type.size + "-Regular";
    } else if (type.type === "stack") {
        return "Size4-Regular";
    }
};

/**
 * Traverse a sequence of types of delimiters to decide what kind of delimiter
 * should be used to create a delimiter of the given height+depth.
 */
var traverseSequence = function(delim, height, sequence, options) {
    // Here, we choose the index we should start at in the sequences. In smaller
    // sizes (which correspond to larger numbers in style.size) we start earlier
    // in the sequence. Thus, scriptscript starts at index 3-3=0, script starts
    // at index 3-2=1, text starts at 3-1=2, and display starts at min(2,3-0)=2
    var start = Math.min(2, 3 - options.style.size);
    for (var i = start; i < sequence.length; i++) {
        if (sequence[i].type === "stack") {
            // This is always the last delimiter, so we just break the loop now.
            break;
        }

        var metrics = getMetrics(delim, delimTypeToFont(sequence[i]));
        var heightDepth = metrics.height + metrics.depth;

        // Small delimiters are scaled down versions of the same font, so we
        // account for the style change size.

        if (sequence[i].type === "small") {
            heightDepth *= sequence[i].style.sizeMultiplier;
        }

        // Check if the delimiter at this size works for the given height.
        if (heightDepth > height) {
            return sequence[i];
        }
    }

    // If we reached the end of the sequence, return the last sequence element.
    return sequence[sequence.length - 1];
};

/**
 * Make a delimiter of a given height+depth, with optional centering. Here, we
 * traverse the sequences, and create a delimiter that the sequence tells us to.
 */
var makeCustomSizedDelim = function(delim, height, center, options, mode) {
    if (delim === "<") {
        delim = "\\langle";
    } else if (delim === ">") {
        delim = "\\rangle";
    }

    // Decide what sequence to use
    var sequence;
    if (utils.contains(stackNeverDelimiters, delim)) {
        sequence = stackNeverDelimiterSequence;
    } else if (utils.contains(stackLargeDelimiters, delim)) {
        sequence = stackLargeDelimiterSequence;
    } else {
        sequence = stackAlwaysDelimiterSequence;
    }

    // Look through the sequence
    var delimType = traverseSequence(delim, height, sequence, options);

    // Depending on the sequence element we decided on, call the appropriate
    // function.
    if (delimType.type === "small") {
        return makeSmallDelim(delim, delimType.style, center, options, mode);
    } else if (delimType.type === "large") {
        return makeLargeDelim(delim, delimType.size, center, options, mode);
    } else if (delimType.type === "stack") {
        return makeStackedDelim(delim, height, center, options, mode);
    }
};

/**
 * Make a delimiter for use with `\left` and `\right`, given a height and depth
 * of an expression that the delimiters surround.
 */
var makeLeftRightDelim = function(delim, height, depth, options, mode) {
    // We always center \left/\right delimiters, so the axis is always shifted
    var axisHeight =
        fontMetrics.metrics.axisHeight * options.style.sizeMultiplier;

    // Taken from TeX source, tex.web, function make_left_right
    var delimiterFactor = 901;
    var delimiterExtend = 5.0 / fontMetrics.metrics.ptPerEm;

    var maxDistFromAxis = Math.max(
        height - axisHeight, depth + axisHeight);

    var totalHeight = Math.max(
        // In real TeX, calculations are done using integral values which are
        // 65536 per pt, or 655360 per em. So, the division here truncates in
        // TeX but doesn't here, producing different results. If we wanted to
        // exactly match TeX's calculation, we could do
        //   Math.floor(655360 * maxDistFromAxis / 500) *
        //    delimiterFactor / 655360
        // (To see the difference, compare
        //    x^{x^{\left(\rule{0.1em}{0.68em}\right)}}
        // in TeX and KaTeX)
        maxDistFromAxis / 500 * delimiterFactor,
        2 * maxDistFromAxis - delimiterExtend);

    // Finally, we defer to `makeCustomSizedDelim` with our calculated total
    // height
    return makeCustomSizedDelim(delim, totalHeight, true, options, mode);
};

module.exports = {
    sizedDelim: makeSizedDelim,
    customSizedDelim: makeCustomSizedDelim,
    leftRightDelim: makeLeftRightDelim
};

},{"./ParseError":30,"./Style":33,"./buildCommon":34,"./fontMetrics":41,"./symbols":47,"./utils":48}],39:[function(require,module,exports){
/**
 * These objects store the data about the DOM nodes we create, as well as some
 * extra data. They can then be transformed into real DOM nodes with the
 * `toNode` function or HTML markup using `toMarkup`. They are useful for both
 * storing extra properties on the nodes, as well as providing a way to easily
 * work with the DOM.
 *
 * Similar functions for working with MathML nodes exist in mathMLTree.js.
 */

var utils = require("./utils");

/**
 * Create an HTML className based on a list of classes. In addition to joining
 * with spaces, we also remove null or empty classes.
 */
var createClass = function(classes) {
    classes = classes.slice();
    for (var i = classes.length - 1; i >= 0; i--) {
        if (!classes[i]) {
            classes.splice(i, 1);
        }
    }

    return classes.join(" ");
};

/**
 * This node represents a span node, with a className, a list of children, and
 * an inline style. It also contains information about its height, depth, and
 * maxFontSize.
 */
function span(classes, children, height, depth, maxFontSize, style) {
    this.classes = classes || [];
    this.children = children || [];
    this.height = height || 0;
    this.depth = depth || 0;
    this.maxFontSize = maxFontSize || 0;
    this.style = style || {};
    this.attributes = {};
}

/**
 * Sets an arbitrary attribute on the span. Warning: use this wisely. Not all
 * browsers support attributes the same, and having too many custom attributes
 * is probably bad.
 */
span.prototype.setAttribute = function(attribute, value) {
    this.attributes[attribute] = value;
};

/**
 * Convert the span into an HTML node
 */
span.prototype.toNode = function() {
    var span = document.createElement("span");

    // Apply the class
    span.className = createClass(this.classes);

    // Apply inline styles
    for (var style in this.style) {
        if (Object.prototype.hasOwnProperty.call(this.style, style)) {
            span.style[style] = this.style[style];
        }
    }

    // Apply attributes
    for (var attr in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            span.setAttribute(attr, this.attributes[attr]);
        }
    }

    // Append the children, also as HTML nodes
    for (var i = 0; i < this.children.length; i++) {
        span.appendChild(this.children[i].toNode());
    }

    return span;
};

/**
 * Convert the span into an HTML markup string
 */
span.prototype.toMarkup = function() {
    var markup = "<span";

    // Add the class
    if (this.classes.length) {
        markup += " class=\"";
        markup += utils.escape(createClass(this.classes));
        markup += "\"";
    }

    var styles = "";

    // Add the styles, after hyphenation
    for (var style in this.style) {
        if (this.style.hasOwnProperty(style)) {
            styles += utils.hyphenate(style) + ":" + this.style[style] + ";";
        }
    }

    if (styles) {
        markup += " style=\"" + utils.escape(styles) + "\"";
    }

    // Add the attributes
    for (var attr in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            markup += " " + attr + "=\"";
            markup += utils.escape(this.attributes[attr]);
            markup += "\"";
        }
    }

    markup += ">";

    // Add the markup of the children, also as markup
    for (var i = 0; i < this.children.length; i++) {
        markup += this.children[i].toMarkup();
    }

    markup += "</span>";

    return markup;
};

/**
 * This node represents a document fragment, which contains elements, but when
 * placed into the DOM doesn't have any representation itself. Thus, it only
 * contains children and doesn't have any HTML properties. It also keeps track
 * of a height, depth, and maxFontSize.
 */
function documentFragment(children, height, depth, maxFontSize) {
    this.children = children || [];
    this.height = height || 0;
    this.depth = depth || 0;
    this.maxFontSize = maxFontSize || 0;
}

/**
 * Convert the fragment into a node
 */
documentFragment.prototype.toNode = function() {
    // Create a fragment
    var frag = document.createDocumentFragment();

    // Append the children
    for (var i = 0; i < this.children.length; i++) {
        frag.appendChild(this.children[i].toNode());
    }

    return frag;
};

/**
 * Convert the fragment into HTML markup
 */
documentFragment.prototype.toMarkup = function() {
    var markup = "";

    // Simply concatenate the markup for the children together
    for (var i = 0; i < this.children.length; i++) {
        markup += this.children[i].toMarkup();
    }

    return markup;
};

/**
 * A symbol node contains information about a single symbol. It either renders
 * to a single text node, or a span with a single text node in it, depending on
 * whether it has CSS classes, styles, or needs italic correction.
 */
function symbolNode(value, height, depth, italic, skew, classes, style) {
    this.value = value || "";
    this.height = height || 0;
    this.depth = depth || 0;
    this.italic = italic || 0;
    this.skew = skew || 0;
    this.classes = classes || [];
    this.style = style || {};
    this.maxFontSize = 0;
}

/**
 * Creates a text node or span from a symbol node. Note that a span is only
 * created if it is needed.
 */
symbolNode.prototype.toNode = function() {
    var node = document.createTextNode(this.value);
    var span = null;

    if (this.italic > 0) {
        span = document.createElement("span");
        span.style.marginRight = this.italic + "em";
    }

    if (this.classes.length > 0) {
        span = span || document.createElement("span");
        span.className = createClass(this.classes);
    }

    for (var style in this.style) {
        if (this.style.hasOwnProperty(style)) {
            span = span || document.createElement("span");
            span.style[style] = this.style[style];
        }
    }

    if (span) {
        span.appendChild(node);
        return span;
    } else {
        return node;
    }
};

/**
 * Creates markup for a symbol node.
 */
symbolNode.prototype.toMarkup = function() {
    // TODO(alpert): More duplication than I'd like from
    // span.prototype.toMarkup and symbolNode.prototype.toNode...
    var needsSpan = false;

    var markup = "<span";

    if (this.classes.length) {
        needsSpan = true;
        markup += " class=\"";
        markup += utils.escape(createClass(this.classes));
        markup += "\"";
    }

    var styles = "";

    if (this.italic > 0) {
        styles += "margin-right:" + this.italic + "em;";
    }
    for (var style in this.style) {
        if (this.style.hasOwnProperty(style)) {
            styles += utils.hyphenate(style) + ":" + this.style[style] + ";";
        }
    }

    if (styles) {
        needsSpan = true;
        markup += " style=\"" + utils.escape(styles) + "\"";
    }

    var escaped = utils.escape(this.value);
    if (needsSpan) {
        markup += ">";
        markup += escaped;
        markup += "</span>";
        return markup;
    } else {
        return escaped;
    }
};

module.exports = {
    span: span,
    documentFragment: documentFragment,
    symbolNode: symbolNode
};

},{"./utils":48}],40:[function(require,module,exports){
var fontMetrics = require("./fontMetrics");
var parseData = require("./parseData");
var ParseError = require("./ParseError");

var ParseNode = parseData.ParseNode;
var ParseResult = parseData.ParseResult;

/**
 * Parse the body of the environment, with rows delimited by \\ and
 * columns delimited by &, and create a nested list in row-major order
 * with one group per cell.
 */
function parseArray(parser, pos, mode, result) {
    var row = [], body = [row], rowGaps = [];
    while (true) {
        var cell = parser.parseExpression(pos, mode, false, null);
        row.push(new ParseNode("ordgroup", cell.result, mode));
        pos = cell.position;
        var next = cell.peek.text;
        if (next === "&") {
            pos = cell.peek.position;
        } else if (next === "\\end") {
            break;
        } else if (next === "\\\\" || next === "\\cr") {
            var cr = parser.parseFunction(pos, mode);
            rowGaps.push(cr.result.value.size);
            pos = cr.position;
            row = [];
            body.push(row);
        } else {
            throw new ParseError("Expected & or \\\\ or \\end",
                                 parser.lexer, cell.peek.position);
        }
    }
    result.body = body;
    result.rowGaps = rowGaps;
    return new ParseResult(new ParseNode(result.type, result, mode), pos);
}

/*
 * An environment definition is very similar to a function definition.
 * Each element of the following array may contain
 *  - names: The names associated with a function. This can be used to
 *           share one implementation between several similar environments.
 *  - numArgs: The number of arguments after the \begin{name} function.
 *  - argTypes: (optional) Just like for a function
 *  - allowedInText: (optional) Whether or not the environment is allowed inside
 *                   text mode (default false) (not enforced yet)
 *  - numOptionalArgs: (optional) Just like for a function
 *  - handler: The function that is called to handle this environment.
 *             It will receive the following arguments:
 *             - pos: the current position of the parser.
 *             - mode: the current parsing mode.
 *             - envName: the name of the environment, one of the listed names.
 *             - [args]: the arguments passed to \begin.
 *             - positions: the positions associated with these arguments.
 */

var environmentDefinitions = [

    // Arrays are part of LaTeX, defined in lttab.dtx so its documentation
    // is part of the source2e.pdf file of LaTeX2e source documentation.
    {
        names: ["array"],
        numArgs: 1,
        handler: function(pos, mode, envName, colalign, positions) {
            var parser = this;
            colalign = colalign.value.map ? colalign.value : [colalign];
            var cols = colalign.map(function(node) {
                var ca = node.value;
                if ("lcr".indexOf(ca) !== -1) {
                    return {
                        type: "align",
                        align: ca
                    };
                } else if (ca === "|") {
                    return {
                        type: "separator",
                        separator: "|"
                    };
                }
                throw new ParseError(
                    "Unknown column alignment: " + node.value,
                    parser.lexer, positions[1]);
            });
            var res = {
                type: "array",
                cols: cols,
                hskipBeforeAndAfter: true // \@preamble in lttab.dtx
            };
            res = parseArray(parser, pos, mode, res);
            return res;
        }
    },

    // The matrix environments of amsmath builds on the array environment
    // of LaTeX, which is discussed above.
    {
        names: [
            "matrix",
            "pmatrix",
            "bmatrix",
            "Bmatrix",
            "vmatrix",
            "Vmatrix"
        ],
        handler: function(pos, mode, envName) {
            var delimiters = {
                "matrix": null,
                "pmatrix": ["(", ")"],
                "bmatrix": ["[", "]"],
                "Bmatrix": ["\\{", "\\}"],
                "vmatrix": ["|", "|"],
                "Vmatrix": ["\\Vert", "\\Vert"]
            }[envName];
            var res = {
                type: "array",
                hskipBeforeAndAfter: false // \hskip -\arraycolsep in amsmath
            };
            res = parseArray(this, pos, mode, res);
            if (delimiters) {
                res.result = new ParseNode("leftright", {
                    body: [res.result],
                    left: delimiters[0],
                    right: delimiters[1]
                }, mode);
            }
            return res;
        }
    },

    // A cases environment (in amsmath.sty) is almost equivalent to
    // \def\arraystretch{1.2}%
    // \left\{\begin{array}{@{}l@{\quad}l@{}} … \end{array}\right.
    {
        names: ["cases"],
        handler: function(pos, mode, envName) {
            var res = {
                type: "array",
                arraystretch: 1.2,
                cols: [{
                    type: "align",
                    align: "l",
                    pregap: 0,
                    postgap: fontMetrics.metrics.quad
                }, {
                    type: "align",
                    align: "l",
                    pregap: 0,
                    postgap: 0
                }]
            };
            res = parseArray(this, pos, mode, res);
            res.result = new ParseNode("leftright", {
                body: [res.result],
                left: "\\{",
                right: "."
            }, mode);
            return res;
        }
    }
];

module.exports = (function() {
    // nested function so we don't leak i and j into the module scope
    var exports = {};
    for (var i = 0; i < environmentDefinitions.length; ++i) {
        var def = environmentDefinitions[i];
        def.greediness = 1;
        def.allowedInText = !!def.allowedInText;
        def.numArgs = def.numArgs || 0;
        def.numOptionalArgs = def.numOptionalArgs || 0;
        for (var j = 0; j < def.names.length; ++j) {
            exports[def.names[j]] = def;
        }
    }
    return exports;
})();

},{"./ParseError":30,"./fontMetrics":41,"./parseData":45}],41:[function(require,module,exports){
/* jshint unused:false */

var Style = require("./Style");

/**
 * This file contains metrics regarding fonts and individual symbols. The sigma
 * and xi variables, as well as the metricMap map contain data extracted from
 * TeX, TeX font metrics, and the TTF files. These data are then exposed via the
 * `metrics` variable and the getCharacterMetrics function.
 */

// These font metrics are extracted from TeX by using
// \font\a=cmmi10
// \showthe\fontdimenX\a
// where X is the corresponding variable number. These correspond to the font
// parameters of the symbol fonts. In TeX, there are actually three sets of
// dimensions, one for each of textstyle, scriptstyle, and scriptscriptstyle,
// but we only use the textstyle ones, and scale certain dimensions accordingly.
// See the TeXbook, page 441.
var sigma1 = 0.025;
var sigma2 = 0;
var sigma3 = 0;
var sigma4 = 0;
var sigma5 = 0.431;
var sigma6 = 1;
var sigma7 = 0;
var sigma8 = 0.677;
var sigma9 = 0.394;
var sigma10 = 0.444;
var sigma11 = 0.686;
var sigma12 = 0.345;
var sigma13 = 0.413;
var sigma14 = 0.363;
var sigma15 = 0.289;
var sigma16 = 0.150;
var sigma17 = 0.247;
var sigma18 = 0.386;
var sigma19 = 0.050;
var sigma20 = 2.390;
var sigma21 = 1.01;
var sigma21Script = 0.81;
var sigma21ScriptScript = 0.71;
var sigma22 = 0.250;

// These font metrics are extracted from TeX by using
// \font\a=cmex10
// \showthe\fontdimenX\a
// where X is the corresponding variable number. These correspond to the font
// parameters of the extension fonts (family 3). See the TeXbook, page 441.
var xi1 = 0;
var xi2 = 0;
var xi3 = 0;
var xi4 = 0;
var xi5 = 0.431;
var xi6 = 1;
var xi7 = 0;
var xi8 = 0.04;
var xi9 = 0.111;
var xi10 = 0.166;
var xi11 = 0.2;
var xi12 = 0.6;
var xi13 = 0.1;

// This value determines how large a pt is, for metrics which are defined in
// terms of pts.
// This value is also used in katex.less; if you change it make sure the values
// match.
var ptPerEm = 10.0;

// The space between adjacent `|` columns in an array definition. From
// `\showthe\doublerulesep` in LaTeX.
var doubleRuleSep = 2.0 / ptPerEm;

/**
 * This is just a mapping from common names to real metrics
 */
var metrics = {
    xHeight: sigma5,
    quad: sigma6,
    num1: sigma8,
    num2: sigma9,
    num3: sigma10,
    denom1: sigma11,
    denom2: sigma12,
    sup1: sigma13,
    sup2: sigma14,
    sup3: sigma15,
    sub1: sigma16,
    sub2: sigma17,
    supDrop: sigma18,
    subDrop: sigma19,
    axisHeight: sigma22,
    defaultRuleThickness: xi8,
    bigOpSpacing1: xi9,
    bigOpSpacing2: xi10,
    bigOpSpacing3: xi11,
    bigOpSpacing4: xi12,
    bigOpSpacing5: xi13,
    ptPerEm: ptPerEm,
    emPerEx: sigma5 / sigma6,
    doubleRuleSep: doubleRuleSep,

    // TODO(alpert): Missing parallel structure here. We should probably add
    // style-specific metrics for all of these.
    delim1: sigma20,
    getDelim2: function(style) {
        if (style.size === Style.TEXT.size) {
            return sigma21;
        } else if (style.size === Style.SCRIPT.size) {
            return sigma21Script;
        } else if (style.size === Style.SCRIPTSCRIPT.size) {
            return sigma21ScriptScript;
        }
        throw new Error("Unexpected style size: " + style.size);
    }
};

// This map contains a mapping from font name and character code to character
// metrics, including height, depth, italic correction, and skew (kern from the
// character to the corresponding \skewchar)
// This map is generated via `make metrics`. It should not be changed manually.
var metricMap = require("./fontMetricsData");

/**
 * This function is a convience function for looking up information in the
 * metricMap table. It takes a character as a string, and a style
 */
var getCharacterMetrics = function(character, style) {
    return metricMap[style][character.charCodeAt(0)];
};

module.exports = {
    metrics: metrics,
    getCharacterMetrics: getCharacterMetrics
};

},{"./Style":33,"./fontMetricsData":42}],42:[function(require,module,exports){
module.exports = {
"AMS-Regular": {
  "65": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.16667, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.16667, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.16667, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "165": {"depth": 0.0, "height": 0.675, "italic": 0.025, "skew": 0.0},
  "174": {"depth": 0.15559, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "240": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "295": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.9, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.9, "italic": 0.0, "skew": 0.0},
  "989": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "1008": {"depth": 0.0, "height": 0.43056, "italic": 0.04028, "skew": 0.0},
  "8245": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8463": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8487": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8498": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8502": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8503": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8504": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8513": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8592": {"depth": -0.03598, "height": 0.46402, "italic": 0.0, "skew": 0.0},
  "8594": {"depth": -0.03598, "height": 0.46402, "italic": 0.0, "skew": 0.0},
  "8602": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8603": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8606": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8608": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8610": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8611": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8619": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8620": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8621": {"depth": -0.13313, "height": 0.37788, "italic": 0.0, "skew": 0.0},
  "8622": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8624": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8625": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8630": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8631": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8634": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8635": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8638": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8639": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8642": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8643": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8644": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8646": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8647": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8648": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8649": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8650": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8651": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8652": {"depth": 0.01354, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8653": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8654": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8655": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8666": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8667": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8669": {"depth": -0.13313, "height": 0.37788, "italic": 0.0, "skew": 0.0},
  "8672": {"depth": -0.064, "height": 0.437, "italic": 0, "skew": 0},
  "8674": {"depth": -0.064, "height": 0.437, "italic": 0, "skew": 0},
  "8705": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "8708": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8709": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8717": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8722": {"depth": -0.03598, "height": 0.46402, "italic": 0.0, "skew": 0.0},
  "8724": {"depth": 0.08198, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8726": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8733": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8736": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8737": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8738": {"depth": 0.03517, "height": 0.52239, "italic": 0.0, "skew": 0.0},
  "8739": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8740": {"depth": 0.25142, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8741": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8742": {"depth": 0.25142, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8756": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8757": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8764": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8765": {"depth": -0.13313, "height": 0.37788, "italic": 0.0, "skew": 0.0},
  "8769": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8770": {"depth": -0.03625, "height": 0.46375, "italic": 0.0, "skew": 0.0},
  "8774": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8776": {"depth": -0.01688, "height": 0.48312, "italic": 0.0, "skew": 0.0},
  "8778": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8782": {"depth": 0.06062, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8783": {"depth": 0.06062, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8785": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8786": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8787": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8790": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8791": {"depth": 0.22958, "height": 0.72958, "italic": 0.0, "skew": 0.0},
  "8796": {"depth": 0.08198, "height": 0.91667, "italic": 0.0, "skew": 0.0},
  "8806": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "8807": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "8808": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "8809": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "8812": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "8814": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8815": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8816": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8817": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8818": {"depth": 0.22958, "height": 0.72958, "italic": 0.0, "skew": 0.0},
  "8819": {"depth": 0.22958, "height": 0.72958, "italic": 0.0, "skew": 0.0},
  "8822": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8823": {"depth": 0.1808, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8828": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8829": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8830": {"depth": 0.22958, "height": 0.72958, "italic": 0.0, "skew": 0.0},
  "8831": {"depth": 0.22958, "height": 0.72958, "italic": 0.0, "skew": 0.0},
  "8832": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8833": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8840": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8841": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8842": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8843": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8847": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8848": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8858": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8859": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8861": {"depth": 0.08198, "height": 0.58198, "italic": 0.0, "skew": 0.0},
  "8862": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8863": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8864": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8865": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "8872": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8873": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8874": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8876": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8877": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8878": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8879": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8882": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8883": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8884": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8885": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8888": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8890": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8891": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8892": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8901": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8903": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8905": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8906": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "8907": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8908": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8909": {"depth": -0.03598, "height": 0.46402, "italic": 0.0, "skew": 0.0},
  "8910": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8911": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8912": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8913": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8914": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8915": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8916": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8918": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8919": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8920": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8921": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "8922": {"depth": 0.38569, "height": 0.88569, "italic": 0.0, "skew": 0.0},
  "8923": {"depth": 0.38569, "height": 0.88569, "italic": 0.0, "skew": 0.0},
  "8926": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8927": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "8928": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8929": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8934": {"depth": 0.23222, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8935": {"depth": 0.23222, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8936": {"depth": 0.23222, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8937": {"depth": 0.23222, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "8938": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8939": {"depth": 0.20576, "height": 0.70576, "italic": 0.0, "skew": 0.0},
  "8940": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8941": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "8994": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8995": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "9416": {"depth": 0.15559, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "9484": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "9488": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "9492": {"depth": 0.0, "height": 0.37788, "italic": 0.0, "skew": 0.0},
  "9496": {"depth": 0.0, "height": 0.37788, "italic": 0.0, "skew": 0.0},
  "9585": {"depth": 0.19444, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "9586": {"depth": 0.19444, "height": 0.74111, "italic": 0.0, "skew": 0.0},
  "9632": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "9633": {"depth": 0.0, "height": 0.675, "italic": 0.0, "skew": 0.0},
  "9650": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9651": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9654": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9660": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9661": {"depth": 0.0, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9664": {"depth": 0.03517, "height": 0.54986, "italic": 0.0, "skew": 0.0},
  "9674": {"depth": 0.11111, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "9733": {"depth": 0.19444, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "10003": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "10016": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "10731": {"depth": 0.11111, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "10846": {"depth": 0.19444, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "10877": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "10878": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "10885": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "10886": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "10887": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "10888": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "10889": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10890": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10891": {"depth": 0.48256, "height": 0.98256, "italic": 0.0, "skew": 0.0},
  "10892": {"depth": 0.48256, "height": 0.98256, "italic": 0.0, "skew": 0.0},
  "10901": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "10902": {"depth": 0.13667, "height": 0.63667, "italic": 0.0, "skew": 0.0},
  "10933": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10934": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10935": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10936": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10937": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10938": {"depth": 0.26167, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "10949": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "10950": {"depth": 0.25583, "height": 0.75583, "italic": 0.0, "skew": 0.0},
  "10955": {"depth": 0.28481, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "10956": {"depth": 0.28481, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "57350": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "57351": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "57352": {"depth": 0.08167, "height": 0.58167, "italic": 0.0, "skew": 0.0},
  "57353": {"depth": 0.0, "height": 0.43056, "italic": 0.04028, "skew": 0.0},
  "57356": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57357": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57358": {"depth": 0.41951, "height": 0.91951, "italic": 0.0, "skew": 0.0},
  "57359": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "57360": {"depth": 0.30274, "height": 0.79383, "italic": 0.0, "skew": 0.0},
  "57361": {"depth": 0.41951, "height": 0.91951, "italic": 0.0, "skew": 0.0},
  "57366": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57367": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57368": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57369": {"depth": 0.25142, "height": 0.75726, "italic": 0.0, "skew": 0.0},
  "57370": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "57371": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0}
},
"Caligraphic-Regular": {
  "48": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.19445},
  "66": {"depth": 0.0, "height": 0.68333, "italic": 0.03041, "skew": 0.13889},
  "67": {"depth": 0.0, "height": 0.68333, "italic": 0.05834, "skew": 0.13889},
  "68": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.08334},
  "69": {"depth": 0.0, "height": 0.68333, "italic": 0.08944, "skew": 0.11111},
  "70": {"depth": 0.0, "height": 0.68333, "italic": 0.09931, "skew": 0.11111},
  "71": {"depth": 0.09722, "height": 0.68333, "italic": 0.0593, "skew": 0.11111},
  "72": {"depth": 0.0, "height": 0.68333, "italic": 0.00965, "skew": 0.11111},
  "73": {"depth": 0.0, "height": 0.68333, "italic": 0.07382, "skew": 0.0},
  "74": {"depth": 0.09722, "height": 0.68333, "italic": 0.18472, "skew": 0.16667},
  "75": {"depth": 0.0, "height": 0.68333, "italic": 0.01445, "skew": 0.05556},
  "76": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.13889},
  "77": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.13889},
  "78": {"depth": 0.0, "height": 0.68333, "italic": 0.14736, "skew": 0.08334},
  "79": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.11111},
  "80": {"depth": 0.0, "height": 0.68333, "italic": 0.08222, "skew": 0.08334},
  "81": {"depth": 0.09722, "height": 0.68333, "italic": 0.0, "skew": 0.11111},
  "82": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "83": {"depth": 0.0, "height": 0.68333, "italic": 0.075, "skew": 0.13889},
  "84": {"depth": 0.0, "height": 0.68333, "italic": 0.25417, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68333, "italic": 0.09931, "skew": 0.08334},
  "86": {"depth": 0.0, "height": 0.68333, "italic": 0.08222, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68333, "italic": 0.08222, "skew": 0.08334},
  "88": {"depth": 0.0, "height": 0.68333, "italic": 0.14643, "skew": 0.13889},
  "89": {"depth": 0.09722, "height": 0.68333, "italic": 0.08222, "skew": 0.08334},
  "90": {"depth": 0.0, "height": 0.68333, "italic": 0.07944, "skew": 0.13889}
},
"Fraktur-Regular": {
  "33": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "40": {"depth": 0.24982, "height": 0.74947, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.24982, "height": 0.74947, "italic": 0.0, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "43": {"depth": 0.08319, "height": 0.58283, "italic": 0.0, "skew": 0.0},
  "44": {"depth": 0.0, "height": 0.10803, "italic": 0.0, "skew": 0.0},
  "45": {"depth": 0.08319, "height": 0.58283, "italic": 0.0, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.10803, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.24982, "height": 0.74947, "italic": 0.0, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "59": {"depth": 0.12604, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "61": {"depth": -0.13099, "height": 0.36866, "italic": 0.0, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.12604, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.06302, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.12604, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.03781, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "90": {"depth": 0.12604, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.24982, "height": 0.74947, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.24982, "height": 0.74947, "italic": 0.0, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "103": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "104": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.18906, "height": 0.52396, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.52396, "italic": 0.0, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.52396, "italic": 0.0, "skew": 0.0},
  "120": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "122": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "8216": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "8217": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "58112": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "58113": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "58114": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "58115": {"depth": 0.18906, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "58116": {"depth": 0.18906, "height": 0.47534, "italic": 0.0, "skew": 0.0},
  "58117": {"depth": 0.0, "height": 0.69141, "italic": 0.0, "skew": 0.0},
  "58118": {"depth": 0.0, "height": 0.62119, "italic": 0.0, "skew": 0.0},
  "58119": {"depth": 0.0, "height": 0.47534, "italic": 0.0, "skew": 0.0}
},
"Main-Bold": {
  "33": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "35": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "36": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "37": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "40": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "43": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "44": {"depth": 0.19444, "height": 0.15556, "italic": 0.0, "skew": 0.0},
  "45": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.15556, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "59": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "60": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "61": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "62": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "64": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.19444, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.68611, "italic": 0.01597, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68611, "italic": 0.01597, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.68611, "italic": 0.02875, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "95": {"depth": 0.31, "height": 0.13444, "italic": 0.03194, "skew": 0.0},
  "96": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.0, "height": 0.69444, "italic": 0.10903, "skew": 0.0},
  "103": {"depth": 0.19444, "height": 0.44444, "italic": 0.01597, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.63492, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.44444, "italic": 0.01597, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.44444, "italic": 0.01597, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.19444, "height": 0.44444, "italic": 0.01597, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "124": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "126": {"depth": 0.35, "height": 0.34444, "italic": 0.0, "skew": 0.0},
  "168": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "172": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "175": {"depth": 0.0, "height": 0.59611, "italic": 0.0, "skew": 0.0},
  "176": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "177": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "180": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "215": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "247": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "305": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "567": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "711": {"depth": 0.0, "height": 0.63194, "italic": 0.0, "skew": 0.0},
  "713": {"depth": 0.0, "height": 0.59611, "italic": 0.0, "skew": 0.0},
  "714": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "715": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "728": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "729": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "730": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "768": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "769": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "772": {"depth": 0.0, "height": 0.59611, "italic": 0.0, "skew": 0.0},
  "774": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "775": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "776": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "778": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "779": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "780": {"depth": 0.0, "height": 0.63194, "italic": 0.0, "skew": 0.0},
  "824": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "8211": {"depth": 0.0, "height": 0.44444, "italic": 0.03194, "skew": 0.0},
  "8212": {"depth": 0.0, "height": 0.44444, "italic": 0.03194, "skew": 0.0},
  "8216": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8217": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8220": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8221": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8224": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8225": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8242": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8407": {"depth": 0.0, "height": 0.72444, "italic": 0.15486, "skew": 0.0},
  "8463": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8465": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8467": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8472": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "8476": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8501": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8592": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8593": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8594": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8595": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8596": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8597": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8598": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8599": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8600": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8601": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8636": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8637": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8640": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8641": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8656": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8657": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8658": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8659": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8660": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8661": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8704": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8706": {"depth": 0.0, "height": 0.69444, "italic": 0.06389, "skew": 0.0},
  "8707": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8709": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8711": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "8712": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8715": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8722": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8723": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8725": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8726": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8727": {"depth": -0.02778, "height": 0.47222, "italic": 0.0, "skew": 0.0},
  "8728": {"depth": -0.02639, "height": 0.47361, "italic": 0.0, "skew": 0.0},
  "8729": {"depth": -0.02639, "height": 0.47361, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 0.18, "height": 0.82, "italic": 0.0, "skew": 0.0},
  "8733": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "8734": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "8736": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8739": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8741": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8743": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8744": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8745": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8746": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8747": {"depth": 0.19444, "height": 0.69444, "italic": 0.12778, "skew": 0.0},
  "8764": {"depth": -0.10889, "height": 0.39111, "italic": 0.0, "skew": 0.0},
  "8768": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8771": {"depth": 0.00222, "height": 0.50222, "italic": 0.0, "skew": 0.0},
  "8776": {"depth": 0.02444, "height": 0.52444, "italic": 0.0, "skew": 0.0},
  "8781": {"depth": 0.00222, "height": 0.50222, "italic": 0.0, "skew": 0.0},
  "8801": {"depth": 0.00222, "height": 0.50222, "italic": 0.0, "skew": 0.0},
  "8804": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8805": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8810": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8811": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8826": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8827": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8834": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8835": {"depth": 0.08556, "height": 0.58556, "italic": 0.0, "skew": 0.0},
  "8838": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8839": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8846": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8849": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8850": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "8851": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8852": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8853": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8854": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8855": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8856": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8857": {"depth": 0.13333, "height": 0.63333, "italic": 0.0, "skew": 0.0},
  "8866": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8867": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8868": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8869": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8900": {"depth": -0.02639, "height": 0.47361, "italic": 0.0, "skew": 0.0},
  "8901": {"depth": -0.02639, "height": 0.47361, "italic": 0.0, "skew": 0.0},
  "8902": {"depth": -0.02778, "height": 0.47222, "italic": 0.0, "skew": 0.0},
  "8968": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8994": {"depth": -0.13889, "height": 0.36111, "italic": 0.0, "skew": 0.0},
  "8995": {"depth": -0.13889, "height": 0.36111, "italic": 0.0, "skew": 0.0},
  "9651": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9657": {"depth": -0.02778, "height": 0.47222, "italic": 0.0, "skew": 0.0},
  "9661": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9667": {"depth": -0.02778, "height": 0.47222, "italic": 0.0, "skew": 0.0},
  "9711": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9824": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9825": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9826": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9827": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9837": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "9838": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9839": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10815": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "10927": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0},
  "10928": {"depth": 0.19667, "height": 0.69667, "italic": 0.0, "skew": 0.0}
},
"Main-Italic": {
  "33": {"depth": 0.0, "height": 0.69444, "italic": 0.12417, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.69444, "italic": 0.06961, "skew": 0.0},
  "35": {"depth": 0.19444, "height": 0.69444, "italic": 0.06616, "skew": 0.0},
  "37": {"depth": 0.05556, "height": 0.75, "italic": 0.13639, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.69444, "italic": 0.09694, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.69444, "italic": 0.12417, "skew": 0.0},
  "40": {"depth": 0.25, "height": 0.75, "italic": 0.16194, "skew": 0.0},
  "41": {"depth": 0.25, "height": 0.75, "italic": 0.03694, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.75, "italic": 0.14917, "skew": 0.0},
  "43": {"depth": 0.05667, "height": 0.56167, "italic": 0.03694, "skew": 0.0},
  "44": {"depth": 0.19444, "height": 0.10556, "italic": 0.0, "skew": 0.0},
  "45": {"depth": 0.0, "height": 0.43056, "italic": 0.02826, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.10556, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.25, "height": 0.75, "italic": 0.16194, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "51": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "52": {"depth": 0.19444, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "53": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "55": {"depth": 0.19444, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "57": {"depth": 0.0, "height": 0.64444, "italic": 0.13556, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.43056, "italic": 0.0582, "skew": 0.0},
  "59": {"depth": 0.19444, "height": 0.43056, "italic": 0.0582, "skew": 0.0},
  "61": {"depth": -0.13313, "height": 0.36687, "italic": 0.06616, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.69444, "italic": 0.1225, "skew": 0.0},
  "64": {"depth": 0.0, "height": 0.69444, "italic": 0.09597, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.68333, "italic": 0.10257, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.68333, "italic": 0.14528, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.68333, "italic": 0.09403, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.68333, "italic": 0.12028, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.68333, "italic": 0.13305, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.68333, "italic": 0.08722, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.68333, "italic": 0.16389, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.68333, "italic": 0.15806, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.68333, "italic": 0.14028, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.68333, "italic": 0.14528, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.68333, "italic": 0.16389, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.68333, "italic": 0.16389, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.68333, "italic": 0.09403, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.68333, "italic": 0.10257, "skew": 0.0},
  "81": {"depth": 0.19444, "height": 0.68333, "italic": 0.09403, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.68333, "italic": 0.03868, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.68333, "italic": 0.11972, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.68333, "italic": 0.13305, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68333, "italic": 0.16389, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.68333, "italic": 0.18361, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68333, "italic": 0.18361, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68333, "italic": 0.15806, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.68333, "italic": 0.19383, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68333, "italic": 0.14528, "skew": 0.0},
  "91": {"depth": 0.25, "height": 0.75, "italic": 0.1875, "skew": 0.0},
  "93": {"depth": 0.25, "height": 0.75, "italic": 0.10528, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.69444, "italic": 0.06646, "skew": 0.0},
  "95": {"depth": 0.31, "height": 0.12056, "italic": 0.09208, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.43056, "italic": 0.07671, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.06312, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.43056, "italic": 0.05653, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.10333, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.43056, "italic": 0.07514, "skew": 0.0},
  "102": {"depth": 0.19444, "height": 0.69444, "italic": 0.21194, "skew": 0.0},
  "103": {"depth": 0.19444, "height": 0.43056, "italic": 0.08847, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.07671, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.65536, "italic": 0.1019, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.65536, "italic": 0.14467, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.10764, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.10333, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.43056, "italic": 0.07671, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.43056, "italic": 0.07671, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.43056, "italic": 0.06312, "skew": 0.0},
  "112": {"depth": 0.19444, "height": 0.43056, "italic": 0.06312, "skew": 0.0},
  "113": {"depth": 0.19444, "height": 0.43056, "italic": 0.08847, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.43056, "italic": 0.10764, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.43056, "italic": 0.08208, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.61508, "italic": 0.09486, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.43056, "italic": 0.07671, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.43056, "italic": 0.10764, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.43056, "italic": 0.10764, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.43056, "italic": 0.12042, "skew": 0.0},
  "121": {"depth": 0.19444, "height": 0.43056, "italic": 0.08847, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.43056, "italic": 0.12292, "skew": 0.0},
  "126": {"depth": 0.35, "height": 0.31786, "italic": 0.11585, "skew": 0.0},
  "163": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "305": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "567": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "768": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "769": {"depth": 0.0, "height": 0.69444, "italic": 0.09694, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.69444, "italic": 0.06646, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.66786, "italic": 0.11585, "skew": 0.0},
  "772": {"depth": 0.0, "height": 0.56167, "italic": 0.10333, "skew": 0.0},
  "774": {"depth": 0.0, "height": 0.69444, "italic": 0.10806, "skew": 0.0},
  "775": {"depth": 0.0, "height": 0.66786, "italic": 0.11752, "skew": 0.0},
  "776": {"depth": 0.0, "height": 0.66786, "italic": 0.10474, "skew": 0.0},
  "778": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "779": {"depth": 0.0, "height": 0.69444, "italic": 0.1225, "skew": 0.0},
  "780": {"depth": 0.0, "height": 0.62847, "italic": 0.08295, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.68333, "italic": 0.13305, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.68333, "italic": 0.09403, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.68333, "italic": 0.15294, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.68333, "italic": 0.16389, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.68333, "italic": 0.12028, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.68333, "italic": 0.11111, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.68333, "italic": 0.05986, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.68333, "italic": 0.11111, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.68333, "italic": 0.10257, "skew": 0.0},
  "8211": {"depth": 0.0, "height": 0.43056, "italic": 0.09208, "skew": 0.0},
  "8212": {"depth": 0.0, "height": 0.43056, "italic": 0.09208, "skew": 0.0},
  "8216": {"depth": 0.0, "height": 0.69444, "italic": 0.12417, "skew": 0.0},
  "8217": {"depth": 0.0, "height": 0.69444, "italic": 0.12417, "skew": 0.0},
  "8220": {"depth": 0.0, "height": 0.69444, "italic": 0.1685, "skew": 0.0},
  "8221": {"depth": 0.0, "height": 0.69444, "italic": 0.06961, "skew": 0.0},
  "8463": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0}
},
"Main-Regular": {
  "32": {"depth": 0.0, "height": 0.0, "italic": 0, "skew": 0},
  "33": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "35": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "36": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "37": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "40": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "43": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "44": {"depth": 0.19444, "height": 0.10556, "italic": 0.0, "skew": 0.0},
  "45": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.10556, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.0, "height": 0.64444, "italic": 0.0, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "59": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "60": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "61": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "62": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "64": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.19444, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.68333, "italic": 0.01389, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68333, "italic": 0.01389, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.68333, "italic": 0.025, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "95": {"depth": 0.31, "height": 0.12056, "italic": 0.02778, "skew": 0.0},
  "96": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.0, "height": 0.69444, "italic": 0.07778, "skew": 0.0},
  "103": {"depth": 0.19444, "height": 0.43056, "italic": 0.01389, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.61508, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.43056, "italic": 0.01389, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.43056, "italic": 0.01389, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.19444, "height": 0.43056, "italic": 0.01389, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "124": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "126": {"depth": 0.35, "height": 0.31786, "italic": 0.0, "skew": 0.0},
  "160": {"depth": 0.0, "height": 0.0, "italic": 0, "skew": 0},
  "168": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "172": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "175": {"depth": 0.0, "height": 0.56778, "italic": 0.0, "skew": 0.0},
  "176": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "177": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "180": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "215": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "247": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "305": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "567": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "711": {"depth": 0.0, "height": 0.62847, "italic": 0.0, "skew": 0.0},
  "713": {"depth": 0.0, "height": 0.56778, "italic": 0.0, "skew": 0.0},
  "714": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "715": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "728": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "729": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "730": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "768": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "769": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "772": {"depth": 0.0, "height": 0.56778, "italic": 0.0, "skew": 0.0},
  "774": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "775": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "776": {"depth": 0.0, "height": 0.66786, "italic": 0.0, "skew": 0.0},
  "778": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "779": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "780": {"depth": 0.0, "height": 0.62847, "italic": 0.0, "skew": 0.0},
  "824": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "8211": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.0},
  "8212": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.0},
  "8216": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8217": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8220": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8221": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8224": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8225": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8230": {"depth": 0.0, "height": 0.12, "italic": 0, "skew": 0},
  "8242": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8407": {"depth": 0.0, "height": 0.71444, "italic": 0.15382, "skew": 0.0},
  "8463": {"depth": 0.0, "height": 0.68889, "italic": 0.0, "skew": 0.0},
  "8465": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8467": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.11111},
  "8472": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.11111},
  "8476": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8501": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8592": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8593": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8594": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8595": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8596": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8597": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8598": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8599": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8600": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8601": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8614": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "8617": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "8618": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "8636": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8637": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8640": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8641": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8652": {"depth": 0.011, "height": 0.671, "italic": 0, "skew": 0},
  "8656": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8657": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8658": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8659": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8660": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8661": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8704": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8706": {"depth": 0.0, "height": 0.69444, "italic": 0.05556, "skew": 0.08334},
  "8707": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8709": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8711": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "8712": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8715": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8722": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8723": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8725": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8726": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8727": {"depth": -0.03472, "height": 0.46528, "italic": 0.0, "skew": 0.0},
  "8728": {"depth": -0.05555, "height": 0.44445, "italic": 0.0, "skew": 0.0},
  "8729": {"depth": -0.05555, "height": 0.44445, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 0.2, "height": 0.8, "italic": 0.0, "skew": 0.0},
  "8733": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8734": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "8736": {"depth": 0.0, "height": 0.69224, "italic": 0.0, "skew": 0.0},
  "8739": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8741": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8743": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8744": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8745": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8746": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8747": {"depth": 0.19444, "height": 0.69444, "italic": 0.11111, "skew": 0.0},
  "8764": {"depth": -0.13313, "height": 0.36687, "italic": 0.0, "skew": 0.0},
  "8768": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8771": {"depth": -0.03625, "height": 0.46375, "italic": 0.0, "skew": 0.0},
  "8773": {"depth": -0.022, "height": 0.589, "italic": 0, "skew": 0},
  "8776": {"depth": -0.01688, "height": 0.48312, "italic": 0.0, "skew": 0.0},
  "8781": {"depth": -0.03625, "height": 0.46375, "italic": 0.0, "skew": 0.0},
  "8784": {"depth": -0.133, "height": 0.67, "italic": 0, "skew": 0},
  "8800": {"depth": 0.215, "height": 0.716, "italic": 0, "skew": 0},
  "8801": {"depth": -0.03625, "height": 0.46375, "italic": 0.0, "skew": 0.0},
  "8804": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8805": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8810": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8811": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8826": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8827": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8834": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8835": {"depth": 0.0391, "height": 0.5391, "italic": 0.0, "skew": 0.0},
  "8838": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8839": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8846": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8849": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8850": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "8851": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8852": {"depth": 0.0, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "8853": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8854": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8855": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8856": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8857": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "8866": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8867": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8868": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8869": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8872": {"depth": 0.249, "height": 0.75, "italic": 0, "skew": 0},
  "8900": {"depth": -0.05555, "height": 0.44445, "italic": 0.0, "skew": 0.0},
  "8901": {"depth": -0.05555, "height": 0.44445, "italic": 0.0, "skew": 0.0},
  "8902": {"depth": -0.03472, "height": 0.46528, "italic": 0.0, "skew": 0.0},
  "8904": {"depth": 0.005, "height": 0.505, "italic": 0, "skew": 0},
  "8942": {"depth": 0.03, "height": 0.9, "italic": 0, "skew": 0},
  "8943": {"depth": -0.19, "height": 0.31, "italic": 0, "skew": 0},
  "8945": {"depth": -0.1, "height": 0.82, "italic": 0, "skew": 0},
  "8968": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8994": {"depth": -0.14236, "height": 0.35764, "italic": 0.0, "skew": 0.0},
  "8995": {"depth": -0.14236, "height": 0.35764, "italic": 0.0, "skew": 0.0},
  "9136": {"depth": 0.244, "height": 0.744, "italic": 0, "skew": 0},
  "9137": {"depth": 0.244, "height": 0.744, "italic": 0, "skew": 0},
  "9651": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9657": {"depth": -0.03472, "height": 0.46528, "italic": 0.0, "skew": 0.0},
  "9661": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9667": {"depth": -0.03472, "height": 0.46528, "italic": 0.0, "skew": 0.0},
  "9711": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9824": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9825": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9826": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9827": {"depth": 0.12963, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9837": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "9838": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "9839": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10222": {"depth": 0.244, "height": 0.744, "italic": 0, "skew": 0},
  "10223": {"depth": 0.244, "height": 0.744, "italic": 0, "skew": 0},
  "10229": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "10230": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "10231": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "10232": {"depth": 0.024, "height": 0.525, "italic": 0, "skew": 0},
  "10233": {"depth": 0.024, "height": 0.525, "italic": 0, "skew": 0},
  "10234": {"depth": 0.024, "height": 0.525, "italic": 0, "skew": 0},
  "10236": {"depth": 0.011, "height": 0.511, "italic": 0, "skew": 0},
  "10815": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.0},
  "10927": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0},
  "10928": {"depth": 0.13597, "height": 0.63597, "italic": 0.0, "skew": 0.0}
},
"Math-BoldItalic": {
  "47": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.68611, "italic": 0.04835, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.68611, "italic": 0.06979, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.68611, "italic": 0.03194, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.68611, "italic": 0.05451, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.68611, "italic": 0.08229, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.68611, "italic": 0.07778, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.68611, "italic": 0.10069, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.68611, "italic": 0.06979, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.68611, "italic": 0.11424, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.68611, "italic": 0.11424, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.68611, "italic": 0.03194, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "81": {"depth": 0.19444, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.68611, "italic": 0.00421, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.68611, "italic": 0.05382, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.68611, "italic": 0.11424, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.68611, "italic": 0.25555, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68611, "italic": 0.07778, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.68611, "italic": 0.25555, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68611, "italic": 0.06979, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.19444, "height": 0.69444, "italic": 0.11042, "skew": 0.0},
  "103": {"depth": 0.19444, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.69326, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.69326, "italic": 0.0622, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.01852, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.0088, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.19444, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.44444, "italic": 0.03194, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.63492, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.44444, "italic": 0.02778, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.19444, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.44444, "italic": 0.04213, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.68611, "italic": 0.03194, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.68611, "italic": 0.07458, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.68611, "italic": 0.08229, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.68611, "italic": 0.05451, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.68611, "italic": 0.15972, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.68611, "italic": 0.0, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.68611, "italic": 0.11653, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.68611, "italic": 0.04835, "skew": 0.0},
  "945": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "946": {"depth": 0.19444, "height": 0.69444, "italic": 0.03403, "skew": 0.0},
  "947": {"depth": 0.19444, "height": 0.44444, "italic": 0.06389, "skew": 0.0},
  "948": {"depth": 0.0, "height": 0.69444, "italic": 0.03819, "skew": 0.0},
  "949": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "950": {"depth": 0.19444, "height": 0.69444, "italic": 0.06215, "skew": 0.0},
  "951": {"depth": 0.19444, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "952": {"depth": 0.0, "height": 0.69444, "italic": 0.03194, "skew": 0.0},
  "953": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "954": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "955": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "956": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "957": {"depth": 0.0, "height": 0.44444, "italic": 0.06898, "skew": 0.0},
  "958": {"depth": 0.19444, "height": 0.69444, "italic": 0.03021, "skew": 0.0},
  "959": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "960": {"depth": 0.0, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "961": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "962": {"depth": 0.09722, "height": 0.44444, "italic": 0.07917, "skew": 0.0},
  "963": {"depth": 0.0, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "964": {"depth": 0.0, "height": 0.44444, "italic": 0.13472, "skew": 0.0},
  "965": {"depth": 0.0, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "966": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "967": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "968": {"depth": 0.19444, "height": 0.69444, "italic": 0.03704, "skew": 0.0},
  "969": {"depth": 0.0, "height": 0.44444, "italic": 0.03704, "skew": 0.0},
  "977": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "981": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "982": {"depth": 0.0, "height": 0.44444, "italic": 0.03194, "skew": 0.0},
  "1009": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "1013": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0}
},
"Math-Italic": {
  "47": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.13889},
  "66": {"depth": 0.0, "height": 0.68333, "italic": 0.05017, "skew": 0.08334},
  "67": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.08334},
  "68": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.05556},
  "69": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "70": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "71": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "72": {"depth": 0.0, "height": 0.68333, "italic": 0.08125, "skew": 0.05556},
  "73": {"depth": 0.0, "height": 0.68333, "italic": 0.07847, "skew": 0.11111},
  "74": {"depth": 0.0, "height": 0.68333, "italic": 0.09618, "skew": 0.16667},
  "75": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.05556},
  "76": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.02778},
  "77": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.08334},
  "78": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.08334},
  "79": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.08334},
  "80": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "81": {"depth": 0.19444, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "82": {"depth": 0.0, "height": 0.68333, "italic": 0.00773, "skew": 0.08334},
  "83": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "84": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "85": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.02778},
  "86": {"depth": 0.0, "height": 0.68333, "italic": 0.22222, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68333, "italic": 0.07847, "skew": 0.08334},
  "89": {"depth": 0.0, "height": 0.68333, "italic": 0.22222, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.08334},
  "97": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.16667},
  "101": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "102": {"depth": 0.19444, "height": 0.69444, "italic": 0.10764, "skew": 0.16667},
  "103": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.65952, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.65952, "italic": 0.05724, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.03148, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.01968, "skew": 0.08334},
  "109": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "112": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "113": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.08334},
  "114": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.05556},
  "115": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "116": {"depth": 0.0, "height": 0.61508, "italic": 0.0, "skew": 0.08334},
  "117": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "118": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "119": {"depth": 0.0, "height": 0.43056, "italic": 0.02691, "skew": 0.08334},
  "120": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "121": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.05556},
  "122": {"depth": 0.0, "height": 0.43056, "italic": 0.04398, "skew": 0.05556},
  "915": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "916": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.16667},
  "920": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.08334},
  "923": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.16667},
  "926": {"depth": 0.0, "height": 0.68333, "italic": 0.07569, "skew": 0.08334},
  "928": {"depth": 0.0, "height": 0.68333, "italic": 0.08125, "skew": 0.05556},
  "931": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "933": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.05556},
  "934": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "936": {"depth": 0.0, "height": 0.68333, "italic": 0.11, "skew": 0.05556},
  "937": {"depth": 0.0, "height": 0.68333, "italic": 0.05017, "skew": 0.08334},
  "945": {"depth": 0.0, "height": 0.43056, "italic": 0.0037, "skew": 0.02778},
  "946": {"depth": 0.19444, "height": 0.69444, "italic": 0.05278, "skew": 0.08334},
  "947": {"depth": 0.19444, "height": 0.43056, "italic": 0.05556, "skew": 0.0},
  "948": {"depth": 0.0, "height": 0.69444, "italic": 0.03785, "skew": 0.05556},
  "949": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "950": {"depth": 0.19444, "height": 0.69444, "italic": 0.07378, "skew": 0.08334},
  "951": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.05556},
  "952": {"depth": 0.0, "height": 0.69444, "italic": 0.02778, "skew": 0.08334},
  "953": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "954": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "955": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "956": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "957": {"depth": 0.0, "height": 0.43056, "italic": 0.06366, "skew": 0.02778},
  "958": {"depth": 0.19444, "height": 0.69444, "italic": 0.04601, "skew": 0.11111},
  "959": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "960": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "961": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "962": {"depth": 0.09722, "height": 0.43056, "italic": 0.07986, "skew": 0.08334},
  "963": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "964": {"depth": 0.0, "height": 0.43056, "italic": 0.1132, "skew": 0.02778},
  "965": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "966": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "967": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "968": {"depth": 0.19444, "height": 0.69444, "italic": 0.03588, "skew": 0.11111},
  "969": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "977": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.08334},
  "981": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.08334},
  "982": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.0},
  "1009": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "1013": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556}
},
"Math-Regular": {
  "65": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.13889},
  "66": {"depth": 0.0, "height": 0.68333, "italic": 0.05017, "skew": 0.08334},
  "67": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.08334},
  "68": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.05556},
  "69": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "70": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "71": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "72": {"depth": 0.0, "height": 0.68333, "italic": 0.08125, "skew": 0.05556},
  "73": {"depth": 0.0, "height": 0.68333, "italic": 0.07847, "skew": 0.11111},
  "74": {"depth": 0.0, "height": 0.68333, "italic": 0.09618, "skew": 0.16667},
  "75": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.05556},
  "76": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.02778},
  "77": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.08334},
  "78": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.08334},
  "79": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.08334},
  "80": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "81": {"depth": 0.19444, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "82": {"depth": 0.0, "height": 0.68333, "italic": 0.00773, "skew": 0.08334},
  "83": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "84": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "85": {"depth": 0.0, "height": 0.68333, "italic": 0.10903, "skew": 0.02778},
  "86": {"depth": 0.0, "height": 0.68333, "italic": 0.22222, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.68333, "italic": 0.07847, "skew": 0.08334},
  "89": {"depth": 0.0, "height": 0.68333, "italic": 0.22222, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.68333, "italic": 0.07153, "skew": 0.08334},
  "97": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.16667},
  "101": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "102": {"depth": 0.19444, "height": 0.69444, "italic": 0.10764, "skew": 0.16667},
  "103": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.65952, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.65952, "italic": 0.05724, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.03148, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.01968, "skew": 0.08334},
  "109": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "112": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "113": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.08334},
  "114": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.05556},
  "115": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "116": {"depth": 0.0, "height": 0.61508, "italic": 0.0, "skew": 0.08334},
  "117": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "118": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "119": {"depth": 0.0, "height": 0.43056, "italic": 0.02691, "skew": 0.08334},
  "120": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "121": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.05556},
  "122": {"depth": 0.0, "height": 0.43056, "italic": 0.04398, "skew": 0.05556},
  "915": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.08334},
  "916": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.16667},
  "920": {"depth": 0.0, "height": 0.68333, "italic": 0.02778, "skew": 0.08334},
  "923": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.16667},
  "926": {"depth": 0.0, "height": 0.68333, "italic": 0.07569, "skew": 0.08334},
  "928": {"depth": 0.0, "height": 0.68333, "italic": 0.08125, "skew": 0.05556},
  "931": {"depth": 0.0, "height": 0.68333, "italic": 0.05764, "skew": 0.08334},
  "933": {"depth": 0.0, "height": 0.68333, "italic": 0.13889, "skew": 0.05556},
  "934": {"depth": 0.0, "height": 0.68333, "italic": 0.0, "skew": 0.08334},
  "936": {"depth": 0.0, "height": 0.68333, "italic": 0.11, "skew": 0.05556},
  "937": {"depth": 0.0, "height": 0.68333, "italic": 0.05017, "skew": 0.08334},
  "945": {"depth": 0.0, "height": 0.43056, "italic": 0.0037, "skew": 0.02778},
  "946": {"depth": 0.19444, "height": 0.69444, "italic": 0.05278, "skew": 0.08334},
  "947": {"depth": 0.19444, "height": 0.43056, "italic": 0.05556, "skew": 0.0},
  "948": {"depth": 0.0, "height": 0.69444, "italic": 0.03785, "skew": 0.05556},
  "949": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "950": {"depth": 0.19444, "height": 0.69444, "italic": 0.07378, "skew": 0.08334},
  "951": {"depth": 0.19444, "height": 0.43056, "italic": 0.03588, "skew": 0.05556},
  "952": {"depth": 0.0, "height": 0.69444, "italic": 0.02778, "skew": 0.08334},
  "953": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "954": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "955": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "956": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.02778},
  "957": {"depth": 0.0, "height": 0.43056, "italic": 0.06366, "skew": 0.02778},
  "958": {"depth": 0.19444, "height": 0.69444, "italic": 0.04601, "skew": 0.11111},
  "959": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "960": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "961": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "962": {"depth": 0.09722, "height": 0.43056, "italic": 0.07986, "skew": 0.08334},
  "963": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "964": {"depth": 0.0, "height": 0.43056, "italic": 0.1132, "skew": 0.02778},
  "965": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.02778},
  "966": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "967": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.05556},
  "968": {"depth": 0.19444, "height": 0.69444, "italic": 0.03588, "skew": 0.11111},
  "969": {"depth": 0.0, "height": 0.43056, "italic": 0.03588, "skew": 0.0},
  "977": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.08334},
  "981": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.08334},
  "982": {"depth": 0.0, "height": 0.43056, "italic": 0.02778, "skew": 0.0},
  "1009": {"depth": 0.19444, "height": 0.43056, "italic": 0.0, "skew": 0.08334},
  "1013": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.05556}
},
"SansSerif-Regular": {
  "33": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "35": {"depth": 0.19444, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "36": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "37": {"depth": 0.05556, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "40": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "43": {"depth": 0.08333, "height": 0.58333, "italic": 0.0, "skew": 0.0},
  "44": {"depth": 0.125, "height": 0.08333, "italic": 0.0, "skew": 0.0},
  "45": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.08333, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.0, "height": 0.65556, "italic": 0.0, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "59": {"depth": 0.125, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "61": {"depth": -0.13, "height": 0.37, "italic": 0.0, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "64": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.125, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.69444, "italic": 0.01389, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.69444, "italic": 0.01389, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.69444, "italic": 0.025, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.25, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "95": {"depth": 0.35, "height": 0.09444, "italic": 0.02778, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.0, "height": 0.69444, "italic": 0.06944, "skew": 0.0},
  "103": {"depth": 0.19444, "height": 0.44444, "italic": 0.01389, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.67937, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.19444, "height": 0.67937, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.44444, "italic": 0.01389, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.57143, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.44444, "italic": 0.01389, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.44444, "italic": 0.01389, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.19444, "height": 0.44444, "italic": 0.01389, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "126": {"depth": 0.35, "height": 0.32659, "italic": 0.0, "skew": 0.0},
  "305": {"depth": 0.0, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "567": {"depth": 0.19444, "height": 0.44444, "italic": 0.0, "skew": 0.0},
  "768": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "769": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.67659, "italic": 0.0, "skew": 0.0},
  "772": {"depth": 0.0, "height": 0.60889, "italic": 0.0, "skew": 0.0},
  "774": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "775": {"depth": 0.0, "height": 0.67937, "italic": 0.0, "skew": 0.0},
  "776": {"depth": 0.0, "height": 0.67937, "italic": 0.0, "skew": 0.0},
  "778": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "779": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "780": {"depth": 0.0, "height": 0.63194, "italic": 0.0, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8211": {"depth": 0.0, "height": 0.44444, "italic": 0.02778, "skew": 0.0},
  "8212": {"depth": 0.0, "height": 0.44444, "italic": 0.02778, "skew": 0.0},
  "8216": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8217": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8220": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "8221": {"depth": 0.0, "height": 0.69444, "italic": 0.0, "skew": 0.0}
},
"Script-Regular": {
  "65": {"depth": 0.0, "height": 0.7, "italic": 0.22925, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.7, "italic": 0.04087, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.7, "italic": 0.1689, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.7, "italic": 0.09371, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.7, "italic": 0.18583, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.7, "italic": 0.13634, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.7, "italic": 0.17322, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.7, "italic": 0.29694, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.7, "italic": 0.19189, "skew": 0.0},
  "74": {"depth": 0.27778, "height": 0.7, "italic": 0.19189, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.7, "italic": 0.31259, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.7, "italic": 0.19189, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.7, "italic": 0.15981, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.7, "italic": 0.3525, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.7, "italic": 0.08078, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.7, "italic": 0.08078, "skew": 0.0},
  "81": {"depth": 0.0, "height": 0.7, "italic": 0.03305, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.7, "italic": 0.06259, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.7, "italic": 0.19189, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.7, "italic": 0.29087, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.7, "italic": 0.25815, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.7, "italic": 0.27523, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.7, "italic": 0.27523, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.7, "italic": 0.26006, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.7, "italic": 0.2939, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.7, "italic": 0.24037, "skew": 0.0}
},
"Size1-Regular": {
  "40": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.72222, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.72222, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.72222, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.72222, "italic": 0.0, "skew": 0.0},
  "8214": {"depth": -0.00099, "height": 0.601, "italic": 0.0, "skew": 0.0},
  "8593": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "8595": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "8657": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "8659": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "8719": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8720": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8721": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "8739": {"depth": -0.00599, "height": 0.606, "italic": 0.0, "skew": 0.0},
  "8741": {"depth": -0.00599, "height": 0.606, "italic": 0.0, "skew": 0.0},
  "8747": {"depth": 0.30612, "height": 0.805, "italic": 0.19445, "skew": 0.0},
  "8748": {"depth": 0.306, "height": 0.805, "italic": 0.19445, "skew": 0.0},
  "8749": {"depth": 0.306, "height": 0.805, "italic": 0.19445, "skew": 0.0},
  "8750": {"depth": 0.30612, "height": 0.805, "italic": 0.19445, "skew": 0.0},
  "8896": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8897": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8898": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8899": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8968": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "9168": {"depth": -0.00099, "height": 0.601, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 0.35001, "height": 0.85, "italic": 0.0, "skew": 0.0},
  "10752": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10753": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10754": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10756": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "10758": {"depth": 0.25001, "height": 0.75, "italic": 0.0, "skew": 0.0}
},
"Size2-Regular": {
  "40": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8719": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8720": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8721": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "8747": {"depth": 0.86225, "height": 1.36, "italic": 0.44445, "skew": 0.0},
  "8748": {"depth": 0.862, "height": 1.36, "italic": 0.44445, "skew": 0.0},
  "8749": {"depth": 0.862, "height": 1.36, "italic": 0.44445, "skew": 0.0},
  "8750": {"depth": 0.86225, "height": 1.36, "italic": 0.44445, "skew": 0.0},
  "8896": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8897": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8898": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8899": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "8968": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "10752": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "10753": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "10754": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "10756": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0},
  "10758": {"depth": 0.55001, "height": 1.05, "italic": 0.0, "skew": 0.0}
},
"Size3-Regular": {
  "40": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.75, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "8968": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 0.95003, "height": 1.45, "italic": 0.0, "skew": 0.0}
},
"Size4-Regular": {
  "40": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "710": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "732": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.825, "italic": 0.0, "skew": 0.0},
  "8730": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "8968": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "8969": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "8970": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "8971": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "9115": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9116": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "9117": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9118": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9119": {"depth": 1e-05, "height": 0.6, "italic": 0.0, "skew": 0.0},
  "9120": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9121": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9122": {"depth": -0.00099, "height": 0.601, "italic": 0.0, "skew": 0.0},
  "9123": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9124": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9125": {"depth": -0.00099, "height": 0.601, "italic": 0.0, "skew": 0.0},
  "9126": {"depth": 0.64502, "height": 1.155, "italic": 0.0, "skew": 0.0},
  "9127": {"depth": 1e-05, "height": 0.9, "italic": 0.0, "skew": 0.0},
  "9128": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "9129": {"depth": 0.90001, "height": 0.0, "italic": 0.0, "skew": 0.0},
  "9130": {"depth": 0.0, "height": 0.3, "italic": 0.0, "skew": 0.0},
  "9131": {"depth": 1e-05, "height": 0.9, "italic": 0.0, "skew": 0.0},
  "9132": {"depth": 0.65002, "height": 1.15, "italic": 0.0, "skew": 0.0},
  "9133": {"depth": 0.90001, "height": 0.0, "italic": 0.0, "skew": 0.0},
  "9143": {"depth": 0.88502, "height": 0.915, "italic": 0.0, "skew": 0.0},
  "10216": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "10217": {"depth": 1.25003, "height": 1.75, "italic": 0.0, "skew": 0.0},
  "57344": {"depth": -0.00499, "height": 0.605, "italic": 0.0, "skew": 0.0},
  "57345": {"depth": -0.00499, "height": 0.605, "italic": 0.0, "skew": 0.0},
  "57680": {"depth": 0.0, "height": 0.12, "italic": 0.0, "skew": 0.0},
  "57681": {"depth": 0.0, "height": 0.12, "italic": 0.0, "skew": 0.0},
  "57682": {"depth": 0.0, "height": 0.12, "italic": 0.0, "skew": 0.0},
  "57683": {"depth": 0.0, "height": 0.12, "italic": 0.0, "skew": 0.0}
},
"Typewriter-Regular": {
  "33": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "34": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "35": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "36": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "37": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "38": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "39": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "40": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "41": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "42": {"depth": 0.0, "height": 0.52083, "italic": 0.0, "skew": 0.0},
  "43": {"depth": -0.08056, "height": 0.53055, "italic": 0.0, "skew": 0.0},
  "44": {"depth": 0.13889, "height": 0.125, "italic": 0.0, "skew": 0.0},
  "45": {"depth": -0.08056, "height": 0.53055, "italic": 0.0, "skew": 0.0},
  "46": {"depth": 0.0, "height": 0.125, "italic": 0.0, "skew": 0.0},
  "47": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "48": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "49": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "50": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "51": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "52": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "53": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "54": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "55": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "56": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "57": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "58": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "59": {"depth": 0.13889, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "60": {"depth": -0.05556, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "61": {"depth": -0.19549, "height": 0.41562, "italic": 0.0, "skew": 0.0},
  "62": {"depth": -0.05556, "height": 0.55556, "italic": 0.0, "skew": 0.0},
  "63": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "64": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "65": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "66": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "67": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "68": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "69": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "70": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "71": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "72": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "73": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "74": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "75": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "76": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "77": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "78": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "79": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "80": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "81": {"depth": 0.13889, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "82": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "83": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "84": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "85": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "86": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "87": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "88": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "89": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "90": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "91": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "92": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "93": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "94": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "95": {"depth": 0.09514, "height": 0.0, "italic": 0.0, "skew": 0.0},
  "96": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "97": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "98": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "99": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "100": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "101": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "102": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "103": {"depth": 0.22222, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "104": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "105": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "106": {"depth": 0.22222, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "107": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "108": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "109": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "110": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "111": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "112": {"depth": 0.22222, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "113": {"depth": 0.22222, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "114": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "115": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "116": {"depth": 0.0, "height": 0.55358, "italic": 0.0, "skew": 0.0},
  "117": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "118": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "119": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "120": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "121": {"depth": 0.22222, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "122": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "123": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "124": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "125": {"depth": 0.08333, "height": 0.69444, "italic": 0.0, "skew": 0.0},
  "126": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "127": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "305": {"depth": 0.0, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "567": {"depth": 0.22222, "height": 0.43056, "italic": 0.0, "skew": 0.0},
  "768": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "769": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "770": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "771": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "772": {"depth": 0.0, "height": 0.56555, "italic": 0.0, "skew": 0.0},
  "774": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "776": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "778": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "780": {"depth": 0.0, "height": 0.56597, "italic": 0.0, "skew": 0.0},
  "915": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "916": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "920": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "923": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "926": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "928": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "931": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "933": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "934": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "936": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "937": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "2018": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "2019": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0},
  "8242": {"depth": 0.0, "height": 0.61111, "italic": 0.0, "skew": 0.0}
}};

},{}],43:[function(require,module,exports){
var utils = require("./utils");
var ParseError = require("./ParseError");

// This file contains a list of functions that we parse. The functions map
// contains the following data:

/*
 * Keys are the name of the functions to parse
 * The data contains the following keys:
 *  - numArgs: The number of arguments the function takes.
 *  - argTypes: (optional) An array corresponding to each argument of the
 *              function, giving the type of argument that should be parsed. Its
 *              length should be equal to `numArgs + numOptionalArgs`. Valid
 *              types:
 *               - "size": A size-like thing, such as "1em" or "5ex"
 *               - "color": An html color, like "#abc" or "blue"
 *               - "original": The same type as the environment that the
 *                             function being parsed is in (e.g. used for the
 *                             bodies of functions like \color where the first
 *                             argument is special and the second argument is
 *                             parsed normally)
 *              Other possible types (probably shouldn't be used)
 *               - "text": Text-like (e.g. \text)
 *               - "math": Normal math
 *              If undefined, this will be treated as an appropriate length
 *              array of "original" strings
 *  - greediness: (optional) The greediness of the function to use ungrouped
 *                arguments.
 *
 *                E.g. if you have an expression
 *                  \sqrt \frac 1 2
 *                since \frac has greediness=2 vs \sqrt's greediness=1, \frac
 *                will use the two arguments '1' and '2' as its two arguments,
 *                then that whole function will be used as the argument to
 *                \sqrt. On the other hand, the expressions
 *                  \frac \frac 1 2 3
 *                and
 *                  \frac \sqrt 1 2
 *                will fail because \frac and \frac have equal greediness
 *                and \sqrt has a lower greediness than \frac respectively. To
 *                make these parse, we would have to change them to:
 *                  \frac {\frac 1 2} 3
 *                and
 *                  \frac {\sqrt 1} 2
 *
 *                The default value is `1`
 *  - allowedInText: (optional) Whether or not the function is allowed inside
 *                   text mode (default false)
 *  - numOptionalArgs: (optional) The number of optional arguments the function
 *                     should parse. If the optional arguments aren't found,
 *                     `null` will be passed to the handler in their place.
 *                     (default 0)
 *  - handler: The function that is called to handle this function and its
 *             arguments. The arguments are:
 *              - func: the text of the function
 *              - [args]: the next arguments are the arguments to the function,
 *                        of which there are numArgs of them
 *              - positions: the positions in the overall string of the function
 *                           and the arguments. Should only be used to produce
 *                           error messages
 *             The function should return an object with the following keys:
 *              - type: The type of element that this is. This is then used in
 *                      buildHTML/buildMathML to determine which function
 *                      should be called to build this node into a DOM node
 *             Any other data can be added to the object, which will be passed
 *             in to the function in buildHTML/buildMathML as `group.value`.
 */

var functions = {
    // A normal square root
    "\\sqrt": {
        numArgs: 1,
        numOptionalArgs: 1,
        handler: function(func, index, body, positions) {
            return {
                type: "sqrt",
                body: body,
                index: index
            };
        }
    },

    // Some non-mathy text
    "\\text": {
        numArgs: 1,
        argTypes: ["text"],
        greediness: 2,
        handler: function(func, body) {
            // Since the corresponding buildHTML/buildMathML function expects a
            // list of elements, we normalize for different kinds of arguments
            // TODO(emily): maybe this should be done somewhere else
            var inner;
            if (body.type === "ordgroup") {
                inner = body.value;
            } else {
                inner = [body];
            }

            return {
                type: "text",
                body: inner
            };
        }
    },

    // A two-argument custom color
    "\\color": {
        numArgs: 2,
        allowedInText: true,
        greediness: 3,
        argTypes: ["color", "original"],
        handler: function(func, color, body) {
            // Normalize the different kinds of bodies (see \text above)
            var inner;
            if (body.type === "ordgroup") {
                inner = body.value;
            } else {
                inner = [body];
            }

            return {
                type: "color",
                color: color.value,
                value: inner
            };
        }
    },

    // An overline
    "\\overline": {
        numArgs: 1,
        handler: function(func, body) {
            return {
                type: "overline",
                body: body
            };
        }
    },

    // A box of the width and height
    "\\rule": {
        numArgs: 2,
        numOptionalArgs: 1,
        argTypes: ["size", "size", "size"],
        handler: function(func, shift, width, height) {
            return {
                type: "rule",
                shift: shift && shift.value,
                width: width.value,
                height: height.value
            };
        }
    },

    // A KaTeX logo
    "\\KaTeX": {
        numArgs: 0,
        handler: function(func) {
            return {
                type: "katex"
            };
        }
    },

    "\\phantom": {
        numArgs: 1,
        handler: function(func, body) {
            var inner;
            if (body.type === "ordgroup") {
                inner = body.value;
            } else {
                inner = [body];
            }

            return {
                type: "phantom",
                value: inner
            };
        }
    }
};

// Extra data needed for the delimiter handler down below
var delimiterSizes = {
    "\\bigl" : {type: "open",    size: 1},
    "\\Bigl" : {type: "open",    size: 2},
    "\\biggl": {type: "open",    size: 3},
    "\\Biggl": {type: "open",    size: 4},
    "\\bigr" : {type: "close",   size: 1},
    "\\Bigr" : {type: "close",   size: 2},
    "\\biggr": {type: "close",   size: 3},
    "\\Biggr": {type: "close",   size: 4},
    "\\bigm" : {type: "rel",     size: 1},
    "\\Bigm" : {type: "rel",     size: 2},
    "\\biggm": {type: "rel",     size: 3},
    "\\Biggm": {type: "rel",     size: 4},
    "\\big"  : {type: "textord", size: 1},
    "\\Big"  : {type: "textord", size: 2},
    "\\bigg" : {type: "textord", size: 3},
    "\\Bigg" : {type: "textord", size: 4}
};

var delimiters = [
    "(", ")", "[", "\\lbrack", "]", "\\rbrack",
    "\\{", "\\lbrace", "\\}", "\\rbrace",
    "\\lfloor", "\\rfloor", "\\lceil", "\\rceil",
    "<", ">", "\\langle", "\\rangle",
    "\\lvert", "\\rvert", "\\lVert", "\\rVert",
    "\\lgroup", "\\rgroup", "\\lmoustache", "\\rmoustache",
    "/", "\\backslash",
    "|", "\\vert", "\\|", "\\Vert",
    "\\uparrow", "\\Uparrow",
    "\\downarrow", "\\Downarrow",
    "\\updownarrow", "\\Updownarrow",
    "."
];

var fontAliases = {
    "\\Bbb": "\\mathbb",
    "\\bold": "\\mathbf",
    "\\frak": "\\mathfrak"
};

/*
 * This is a list of functions which each have the same function but have
 * different names so that we don't have to duplicate the data a bunch of times.
 * Each element in the list is an object with the following keys:
 *  - funcs: A list of function names to be associated with the data
 *  - data: An objecty with the same data as in each value of the `function`
 *          table above
 */
var duplicatedFunctions = [
    // Single-argument color functions
    {
        funcs: [
            "\\blue", "\\orange", "\\pink", "\\red",
            "\\green", "\\gray", "\\purple",
            "\\blueA", "\\blueB", "\\blueC", "\\blueD", "\\blueE",
            "\\tealA", "\\tealB", "\\tealC", "\\tealD", "\\tealE",
            "\\greenA", "\\greenB", "\\greenC", "\\greenD", "\\greenE",
            "\\goldA", "\\goldB", "\\goldC", "\\goldD", "\\goldE",
            "\\redA", "\\redB", "\\redC", "\\redD", "\\redE",
            "\\maroonA", "\\maroonB", "\\maroonC", "\\maroonD", "\\maroonE",
            "\\purpleA", "\\purpleB", "\\purpleC", "\\purpleD", "\\purpleE",
            "\\mintA", "\\mintB", "\\mintC",
            "\\grayA", "\\grayB", "\\grayC", "\\grayD", "\\grayE",
            "\\grayF", "\\grayG", "\\grayH", "\\grayI",
            "\\kaBlue", "\\kaGreen"
        ],
        data: {
            numArgs: 1,
            allowedInText: true,
            greediness: 3,
            handler: function(func, body) {
                var atoms;
                if (body.type === "ordgroup") {
                    atoms = body.value;
                } else {
                    atoms = [body];
                }

                return {
                    type: "color",
                    color: "katex-" + func.slice(1),
                    value: atoms
                };
            }
        }
    },

    // There are 2 flags for operators; whether they produce limits in
    // displaystyle, and whether they are symbols and should grow in
    // displaystyle. These four groups cover the four possible choices.

    // No limits, not symbols
    {
        funcs: [
            "\\arcsin", "\\arccos", "\\arctan", "\\arg", "\\cos", "\\cosh",
            "\\cot", "\\coth", "\\csc", "\\deg", "\\dim", "\\exp", "\\hom",
            "\\ker", "\\lg", "\\ln", "\\log", "\\sec", "\\sin", "\\sinh",
            "\\tan","\\tanh"
        ],
        data: {
            numArgs: 0,
            handler: function(func) {
                return {
                    type: "op",
                    limits: false,
                    symbol: false,
                    body: func
                };
            }
        }
    },

    // Limits, not symbols
    {
        funcs: [
            "\\det", "\\gcd", "\\inf", "\\lim", "\\liminf", "\\limsup", "\\max",
            "\\min", "\\Pr", "\\sup"
        ],
        data: {
            numArgs: 0,
            handler: function(func) {
                return {
                    type: "op",
                    limits: true,
                    symbol: false,
                    body: func
                };
            }
        }
    },

    // No limits, symbols
    {
        funcs: [
            "\\int", "\\iint", "\\iiint", "\\oint"
        ],
        data: {
            numArgs: 0,
            handler: function(func) {
                return {
                    type: "op",
                    limits: false,
                    symbol: true,
                    body: func
                };
            }
        }
    },

    // Limits, symbols
    {
        funcs: [
            "\\coprod", "\\bigvee", "\\bigwedge", "\\biguplus", "\\bigcap",
            "\\bigcup", "\\intop", "\\prod", "\\sum", "\\bigotimes",
            "\\bigoplus", "\\bigodot", "\\bigsqcup", "\\smallint"
        ],
        data: {
            numArgs: 0,
            handler: function(func) {
                return {
                    type: "op",
                    limits: true,
                    symbol: true,
                    body: func
                };
            }
        }
    },

    // Fractions
    {
        funcs: [
            "\\dfrac", "\\frac", "\\tfrac",
            "\\dbinom", "\\binom", "\\tbinom"
        ],
        data: {
            numArgs: 2,
            greediness: 2,
            handler: function(func, numer, denom) {
                var hasBarLine;
                var leftDelim = null;
                var rightDelim = null;
                var size = "auto";

                switch (func) {
                    case "\\dfrac":
                    case "\\frac":
                    case "\\tfrac":
                        hasBarLine = true;
                        break;
                    case "\\dbinom":
                    case "\\binom":
                    case "\\tbinom":
                        hasBarLine = false;
                        leftDelim = "(";
                        rightDelim = ")";
                        break;
                    default:
                        throw new Error("Unrecognized genfrac command");
                }

                switch (func) {
                    case "\\dfrac":
                    case "\\dbinom":
                        size = "display";
                        break;
                    case "\\tfrac":
                    case "\\tbinom":
                        size = "text";
                        break;
                }

                return {
                    type: "genfrac",
                    numer: numer,
                    denom: denom,
                    hasBarLine: hasBarLine,
                    leftDelim: leftDelim,
                    rightDelim: rightDelim,
                    size: size
                };
            }
        }
    },

    // Left and right overlap functions
    {
        funcs: ["\\llap", "\\rlap"],
        data: {
            numArgs: 1,
            allowedInText: true,
            handler: function(func, body) {
                return {
                    type: func.slice(1),
                    body: body
                };
            }
        }
    },

    // Delimiter functions
    {
        funcs: [
            "\\bigl", "\\Bigl", "\\biggl", "\\Biggl",
            "\\bigr", "\\Bigr", "\\biggr", "\\Biggr",
            "\\bigm", "\\Bigm", "\\biggm", "\\Biggm",
            "\\big",  "\\Big",  "\\bigg",  "\\Bigg",
            "\\left", "\\right"
        ],
        data: {
            numArgs: 1,
            handler: function(func, delim, positions) {
                if (!utils.contains(delimiters, delim.value)) {
                    throw new ParseError(
                        "Invalid delimiter: '" + delim.value + "' after '" +
                            func + "'",
                        this.lexer, positions[1]);
                }

                // \left and \right are caught somewhere in Parser.js, which is
                // why this data doesn't match what is in buildHTML.
                if (func === "\\left" || func === "\\right") {
                    return {
                        type: "leftright",
                        value: delim.value
                    };
                } else {
                    return {
                        type: "delimsizing",
                        size: delimiterSizes[func].size,
                        delimType: delimiterSizes[func].type,
                        value: delim.value
                    };
                }
            }
        }
    },

    // Sizing functions (handled in Parser.js explicitly, hence no handler)
    {
        funcs: [
            "\\tiny", "\\scriptsize", "\\footnotesize", "\\small",
            "\\normalsize", "\\large", "\\Large", "\\LARGE", "\\huge", "\\Huge"
        ],
        data: {
            numArgs: 0
        }
    },

    // Style changing functions (handled in Parser.js explicitly, hence no
    // handler)
    {
        funcs: [
            "\\displaystyle", "\\textstyle", "\\scriptstyle",
            "\\scriptscriptstyle"
        ],
        data: {
            numArgs: 0
        }
    },

    {
        funcs: [
            // styles
            "\\mathrm", "\\mathit", "\\mathbf",

            // families
            "\\mathbb", "\\mathcal", "\\mathfrak", "\\mathscr", "\\mathsf",
            "\\mathtt",

            // aliases
            "\\Bbb", "\\bold", "\\frak"
        ],
        data: {
            numArgs: 1,
            handler: function (func, body) {
                if (func in fontAliases) {
                    func = fontAliases[func];
                }
                return {
                    type: "font",
                    font: func.slice(1),
                    body: body
                };
            }
        }
    },

    // Accents
    {
        funcs: [
            "\\acute", "\\grave", "\\ddot", "\\tilde", "\\bar", "\\breve",
            "\\check", "\\hat", "\\vec", "\\dot"
            // We don't support expanding accents yet
            // "\\widetilde", "\\widehat"
        ],
        data: {
            numArgs: 1,
            handler: function(func, base) {
                return {
                    type: "accent",
                    accent: func,
                    base: base
                };
            }
        }
    },

    // Infix generalized fractions
    {
        funcs: ["\\over", "\\choose"],
        data: {
            numArgs: 0,
            handler: function (func) {
                var replaceWith;
                switch (func) {
                    case "\\over":
                        replaceWith = "\\frac";
                        break;
                    case "\\choose":
                        replaceWith = "\\binom";
                        break;
                    default:
                        throw new Error("Unrecognized infix genfrac command");
                }
                return {
                    type: "infix",
                    replaceWith: replaceWith
                };
            }
        }
    },

    // Row breaks for aligned data
    {
        funcs: ["\\\\", "\\cr"],
        data: {
            numArgs: 0,
            numOptionalArgs: 1,
            argTypes: ["size"],
            handler: function(func, size) {
                return {
                    type: "cr",
                    size: size
                };
            }
        }
    },

    // Environment delimiters
    {
        funcs: ["\\begin", "\\end"],
        data: {
            numArgs: 1,
            argTypes: ["text"],
            handler: function(func, nameGroup, positions) {
                if (nameGroup.type !== "ordgroup") {
                    throw new ParseError(
                        "Invalid environment name",
                        this.lexer, positions[1]);
                }
                var name = "";
                for (var i = 0; i < nameGroup.value.length; ++i) {
                    name += nameGroup.value[i].value;
                }
                return {
                    type: "environment",
                    name: name,
                    namepos: positions[1]
                };
            }
        }
    }
];

var addFuncsWithData = function(funcs, data) {
    for (var i = 0; i < funcs.length; i++) {
        functions[funcs[i]] = data;
    }
};

// Add all of the functions in duplicatedFunctions to the functions map
for (var i = 0; i < duplicatedFunctions.length; i++) {
    addFuncsWithData(duplicatedFunctions[i].funcs, duplicatedFunctions[i].data);
}

// Set default values of functions
for (var f in functions) {
    if (functions.hasOwnProperty(f)) {
        var func = functions[f];

        functions[f] = {
            numArgs: func.numArgs,
            argTypes: func.argTypes,
            greediness: (func.greediness === undefined) ? 1 : func.greediness,
            allowedInText: func.allowedInText ? func.allowedInText : false,
            numOptionalArgs: (func.numOptionalArgs === undefined) ? 0 :
                func.numOptionalArgs,
            handler: func.handler
        };
    }
}

module.exports = {
    funcs: functions
};

},{"./ParseError":30,"./utils":48}],44:[function(require,module,exports){
/**
 * These objects store data about MathML nodes. This is the MathML equivalent
 * of the types in domTree.js. Since MathML handles its own rendering, and
 * since we're mainly using MathML to improve accessibility, we don't manage
 * any of the styling state that the plain DOM nodes do.
 *
 * The `toNode` and `toMarkup` functions work simlarly to how they do in
 * domTree.js, creating namespaced DOM nodes and HTML text markup respectively.
 */

var utils = require("./utils");

/**
 * This node represents a general purpose MathML node of any type. The
 * constructor requires the type of node to create (for example, `"mo"` or
 * `"mspace"`, corresponding to `<mo>` and `<mspace>` tags).
 */
function MathNode(type, children) {
    this.type = type;
    this.attributes = {};
    this.children = children || [];
}

/**
 * Sets an attribute on a MathML node. MathML depends on attributes to convey a
 * semantic content, so this is used heavily.
 */
MathNode.prototype.setAttribute = function(name, value) {
    this.attributes[name] = value;
};

/**
 * Converts the math node into a MathML-namespaced DOM element.
 */
MathNode.prototype.toNode = function() {
    var node = document.createElementNS(
        "http://www.w3.org/1998/Math/MathML", this.type);

    for (var attr in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            node.setAttribute(attr, this.attributes[attr]);
        }
    }

    for (var i = 0; i < this.children.length; i++) {
        node.appendChild(this.children[i].toNode());
    }

    return node;
};

/**
 * Converts the math node into an HTML markup string.
 */
MathNode.prototype.toMarkup = function() {
    var markup = "<" + this.type;

    // Add the attributes
    for (var attr in this.attributes) {
        if (Object.prototype.hasOwnProperty.call(this.attributes, attr)) {
            markup += " " + attr + "=\"";
            markup += utils.escape(this.attributes[attr]);
            markup += "\"";
        }
    }

    markup += ">";

    for (var i = 0; i < this.children.length; i++) {
        markup += this.children[i].toMarkup();
    }

    markup += "</" + this.type + ">";

    return markup;
};

/**
 * This node represents a piece of text.
 */
function TextNode(text) {
    this.text = text;
}

/**
 * Converts the text node into a DOM text node.
 */
TextNode.prototype.toNode = function() {
    return document.createTextNode(this.text);
};

/**
 * Converts the text node into HTML markup (which is just the text itself).
 */
TextNode.prototype.toMarkup = function() {
    return utils.escape(this.text);
};

module.exports = {
    MathNode: MathNode,
    TextNode: TextNode
};

},{"./utils":48}],45:[function(require,module,exports){
/**
 * The resulting parse tree nodes of the parse tree.
 */
function ParseNode(type, value, mode) {
    this.type = type;
    this.value = value;
    this.mode = mode;
}

/**
 * A result and final position returned by the `.parse...` functions.
 * 
 */
function ParseResult(result, newPosition, peek) {
    this.result = result;
    this.position = newPosition;
}

module.exports = {
    ParseNode: ParseNode,
    ParseResult: ParseResult
};


},{}],46:[function(require,module,exports){
/**
 * Provides a single function for parsing an expression using a Parser
 * TODO(emily): Remove this
 */

var Parser = require("./Parser");

/**
 * Parses an expression using a Parser, then returns the parsed result.
 */
var parseTree = function(toParse, settings) {
    var parser = new Parser(toParse, settings);

    return parser.parse();
};

module.exports = parseTree;

},{"./Parser":31}],47:[function(require,module,exports){
/**
 * This file holds a list of all no-argument functions and single-character
 * symbols (like 'a' or ';').
 *
 * For each of the symbols, there are three properties they can have:
 * - font (required): the font to be used for this symbol. Either "main" (the
     normal font), or "ams" (the ams fonts).
 * - group (required): the ParseNode group type the symbol should have (i.e.
     "textord", "mathord", etc).
     See https://github.com/Khan/KaTeX/wiki/Examining-TeX#group-types
 * - replace (optional): the character that this symbol or function should be
 *   replaced with (i.e. "\phi" has a replace value of "\u03d5", the phi
 *   character in the main font).
 *
 * The outermost map in the table indicates what mode the symbols should be
 * accepted in (e.g. "math" or "text").
 */

var symbols = {
    "math": {
        // Relation Symbols
        "\\equiv": {
            font: "main",
            group: "rel",
            replace: "\u2261"
        },
        "\\prec": {
            font: "main",
            group: "rel",
            replace: "\u227a"
        },
        "\\succ": {
            font: "main",
            group: "rel",
            replace: "\u227b"
        },
        "\\sim": {
            font: "main",
            group: "rel",
            replace: "\u223c"
        },
        "\\perp": {
            font: "main",
            group: "rel",
            replace: "\u22a5"
        },
        "\\preceq": {
            font: "main",
            group: "rel",
            replace: "\u2aaf"
        },
        "\\succeq": {
            font: "main",
            group: "rel",
            replace: "\u2ab0"
        },
        "\\simeq": {
            font: "main",
            group: "rel",
            replace: "\u2243"
        },
        "\\mid": {
            font: "main",
            group: "rel",
            replace: "\u2223"
        },
        "\\ll": {
            font: "main",
            group: "rel",
            replace: "\u226a"
        },
        "\\gg": {
            font: "main",
            group: "rel",
            replace: "\u226b"
        },
        "\\asymp": {
            font: "main",
            group: "rel",
            replace: "\u224d"
        },
        "\\parallel": {
            font: "main",
            group: "rel",
            replace: "\u2225"
        },
        "\\bowtie": {
            font: "main",
            group: "rel",
            replace: "\u22c8"
        },
        "\\smile": {
            font: "main",
            group: "rel",
            replace: "\u2323"
        },
        "\\sqsubseteq": {
            font: "main",
            group: "rel",
            replace: "\u2291"
        },
        "\\sqsupseteq": {
            font: "main",
            group: "rel",
            replace: "\u2292"
        },
        "\\doteq": {
            font: "main",
            group: "rel",
            replace: "\u2250"
        },
        "\\frown": {
            font: "main",
            group: "rel",
            replace: "\u2322"
        },
        "\\ni": {
            font: "main",
            group: "rel",
            replace: "\u220b"
        },
        "\\propto": {
            font: "main",
            group: "rel",
            replace: "\u221d"
        },
        "\\vdash": {
            font: "main",
            group: "rel",
            replace: "\u22a2"
        },
        "\\dashv": {
            font: "main",
            group: "rel",
            replace: "\u22a3"
        },
        "\\owns": {
            font: "main",
            group: "rel",
            replace: "\u220b"
        },

        // Punctuation
        "\\ldotp": {
            font: "main",
            group: "punct",
            replace: "\u002e"
        },
        "\\cdotp": {
            font: "main",
            group: "punct",
            replace: "\u22c5"
        },

        // Misc Symbols
        "\\#": {
          font: "main",
          group: "textord",
          replace: "\u0023"
        },
        "\\&": {
          font: "main",
          group: "textord",
          replace: "\u0026"
        },
        "\\aleph": {
            font: "main",
            group: "textord",
            replace: "\u2135"
        },
        "\\forall": {
            font: "main",
            group: "textord",
            replace: "\u2200"
        },
        "\\hbar": {
            font: "main",
            group: "textord",
            replace: "\u210f"
        },
        "\\exists": {
            font: "main",
            group: "textord",
            replace: "\u2203"
        },
        "\\nabla": {
            font: "main",
            group: "textord",
            replace: "\u2207"
        },
        "\\flat": {
            font: "main",
            group: "textord",
            replace: "\u266d"
        },
        "\\ell": {
            font: "main",
            group: "textord",
            replace: "\u2113"
        },
        "\\natural": {
            font: "main",
            group: "textord",
            replace: "\u266e"
        },
        "\\clubsuit": {
            font: "main",
            group: "textord",
            replace: "\u2663"
        },
        "\\wp": {
            font: "main",
            group: "textord",
            replace: "\u2118"
        },
        "\\sharp": {
            font: "main",
            group: "textord",
            replace: "\u266f"
        },
        "\\diamondsuit": {
            font: "main",
            group: "textord",
            replace: "\u2662"
        },
        "\\Re": {
            font: "main",
            group: "textord",
            replace: "\u211c"
        },
        "\\heartsuit": {
            font: "main",
            group: "textord",
            replace: "\u2661"
        },
        "\\Im": {
            font: "main",
            group: "textord",
            replace: "\u2111"
        },
        "\\spadesuit": {
            font: "main",
            group: "textord",
            replace: "\u2660"
        },

        // Math and Text
        "\\dag": {
            font: "main",
            group: "textord",
            replace: "\u2020"
        },
        "\\ddag": {
            font: "main",
            group: "textord",
            replace: "\u2021"
        },

        // Large Delimiters
        "\\rmoustache": {
            font: "main",
            group: "close",
            replace: "\u23b1"
        },
        "\\lmoustache": {
            font: "main",
            group: "open",
            replace: "\u23b0"
        },
        "\\rgroup": {
            font: "main",
            group: "close",
            replace: "\u27ef"
        },
        "\\lgroup": {
            font: "main",
            group: "open",
            replace: "\u27ee"
        },

        // Binary Operators
        "\\mp": {
            font: "main",
            group: "bin",
            replace: "\u2213"
        },
        "\\ominus": {
            font: "main",
            group: "bin",
            replace: "\u2296"
        },
        "\\uplus": {
            font: "main",
            group: "bin",
            replace: "\u228e"
        },
        "\\sqcap": {
            font: "main",
            group: "bin",
            replace: "\u2293"
        },
        "\\ast": {
            font: "main",
            group: "bin",
            replace: "\u2217"
        },
        "\\sqcup": {
            font: "main",
            group: "bin",
            replace: "\u2294"
        },
        "\\bigcirc": {
            font: "main",
            group: "bin",
            replace: "\u25ef"
        },
        "\\bullet": {
            font: "main",
            group: "bin",
            replace: "\u2219"
        },
        "\\ddagger": {
            font: "main",
            group: "bin",
            replace: "\u2021"
        },
        "\\wr": {
            font: "main",
            group: "bin",
            replace: "\u2240"
        },
        "\\amalg": {
            font: "main",
            group: "bin",
            replace: "\u2a3f"
        },

        // Arrow Symbols
        "\\longleftarrow": {
            font: "main",
            group: "rel",
            replace: "\u27f5"
        },
        "\\Leftarrow": {
            font: "main",
            group: "rel",
            replace: "\u21d0"
        },
        "\\Longleftarrow": {
            font: "main",
            group: "rel",
            replace: "\u27f8"
        },
        "\\longrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u27f6"
        },
        "\\Rightarrow": {
            font: "main",
            group: "rel",
            replace: "\u21d2"
        },
        "\\Longrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u27f9"
        },
        "\\leftrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u2194"
        },
        "\\longleftrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u27f7"
        },
        "\\Leftrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u21d4"
        },
        "\\Longleftrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u27fa"
        },
        "\\mapsto": {
            font: "main",
            group: "rel",
            replace: "\u21a6"
        },
        "\\longmapsto": {
            font: "main",
            group: "rel",
            replace: "\u27fc"
        },
        "\\nearrow": {
            font: "main",
            group: "rel",
            replace: "\u2197"
        },
        "\\hookleftarrow": {
            font: "main",
            group: "rel",
            replace: "\u21a9"
        },
        "\\hookrightarrow": {
            font: "main",
            group: "rel",
            replace: "\u21aa"
        },
        "\\searrow": {
            font: "main",
            group: "rel",
            replace: "\u2198"
        },
        "\\leftharpoonup": {
            font: "main",
            group: "rel",
            replace: "\u21bc"
        },
        "\\rightharpoonup": {
            font: "main",
            group: "rel",
            replace: "\u21c0"
        },
        "\\swarrow": {
            font: "main",
            group: "rel",
            replace: "\u2199"
        },
        "\\leftharpoondown": {
            font: "main",
            group: "rel",
            replace: "\u21bd"
        },
        "\\rightharpoondown": {
            font: "main",
            group: "rel",
            replace: "\u21c1"
        },
        "\\nwarrow": {
            font: "main",
            group: "rel",
            replace: "\u2196"
        },
        "\\rightleftharpoons": {
            font: "main",
            group: "rel",
            replace: "\u21cc"
        },

        // AMS Negated Binary Relations
        "\\nless": {
            font: "ams",
            group: "rel",
            replace: "\u226e"
        },
        "\\nleqslant": {
            font: "ams",
            group: "rel",
            replace: "\ue010"
        },
        "\\nleqq": {
            font: "ams",
            group: "rel",
            replace: "\ue011"
        },
        "\\lneq": {
            font: "ams",
            group: "rel",
            replace: "\u2a87"
        },
        "\\lneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2268"
        },
        "\\lvertneqq": {
            font: "ams",
            group: "rel",
            replace: "\ue00c"
        },
        "\\lnsim": {
            font: "ams",
            group: "rel",
            replace: "\u22e6"
        },
        "\\lnapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2a89"
        },
        "\\nprec": {
            font: "ams",
            group: "rel",
            replace: "\u2280"
        },
        "\\npreceq": {
            font: "ams",
            group: "rel",
            replace: "\u22e0"
        },
        "\\precnsim": {
            font: "ams",
            group: "rel",
            replace: "\u22e8"
        },
        "\\precnapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2ab9"
        },
        "\\nsim": {
            font: "ams",
            group: "rel",
            replace: "\u2241"
        },
        "\\nshortmid": {
            font: "ams",
            group: "rel",
            replace: "\ue006"
        },
        "\\nmid": {
            font: "ams",
            group: "rel",
            replace: "\u2224"
        },
        "\\nvdash": {
            font: "ams",
            group: "rel",
            replace: "\u22ac"
        },
        "\\nvDash": {
            font: "ams",
            group: "rel",
            replace: "\u22ad"
        },
        "\\ntriangleleft": {
            font: "ams",
            group: "rel",
            replace: "\u22ea"
        },
        "\\ntrianglelefteq": {
            font: "ams",
            group: "rel",
            replace: "\u22ec"
        },
        "\\subsetneq": {
            font: "ams",
            group: "rel",
            replace: "\u228a"
        },
        "\\varsubsetneq": {
            font: "ams",
            group: "rel",
            replace: "\ue01a"
        },
        "\\subsetneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2acb"
        },
        "\\varsubsetneqq": {
            font: "ams",
            group: "rel",
            replace: "\ue017"
        },
        "\\ngtr": {
            font: "ams",
            group: "rel",
            replace: "\u226f"
        },
        "\\ngeqslant": {
            font: "ams",
            group: "rel",
            replace: "\ue00f"
        },
        "\\ngeqq": {
            font: "ams",
            group: "rel",
            replace: "\ue00e"
        },
        "\\gneq": {
            font: "ams",
            group: "rel",
            replace: "\u2a88"
        },
        "\\gneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2269"
        },
        "\\gvertneqq": {
            font: "ams",
            group: "rel",
            replace: "\ue00d"
        },
        "\\gnsim": {
            font: "ams",
            group: "rel",
            replace: "\u22e7"
        },
        "\\gnapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2a8a"
        },
        "\\nsucc": {
            font: "ams",
            group: "rel",
            replace: "\u2281"
        },
        "\\nsucceq": {
            font: "ams",
            group: "rel",
            replace: "\u22e1"
        },
        "\\succnsim": {
            font: "ams",
            group: "rel",
            replace: "\u22e9"
        },
        "\\succnapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2aba"
        },
        "\\ncong": {
            font: "ams",
            group: "rel",
            replace: "\u2246"
        },
        "\\nshortparallel": {
            font: "ams",
            group: "rel",
            replace: "\ue007"
        },
        "\\nparallel": {
            font: "ams",
            group: "rel",
            replace: "\u2226"
        },
        "\\nVDash": {
            font: "ams",
            group: "rel",
            replace: "\u22af"
        },
        "\\ntriangleright": {
            font: "ams",
            group: "rel",
            replace: "\u22eb"
        },
        "\\ntrianglerighteq": {
            font: "ams",
            group: "rel",
            replace: "\u22ed"
        },
        "\\nsupseteqq": {
            font: "ams",
            group: "rel",
            replace: "\ue018"
        },
        "\\supsetneq": {
            font: "ams",
            group: "rel",
            replace: "\u228b"
        },
        "\\varsupsetneq": {
            font: "ams",
            group: "rel",
            replace: "\ue01b"
        },
        "\\supsetneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2acc"
        },
        "\\varsupsetneqq": {
            font: "ams",
            group: "rel",
            replace: "\ue019"
        },
        "\\nVdash": {
            font: "ams",
            group: "rel",
            replace: "\u22ae"
        },
        "\\precneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2ab5"
        },
        "\\succneqq": {
            font: "ams",
            group: "rel",
            replace: "\u2ab6"
        },
        "\\nsubseteqq": {
            font: "ams",
            group: "rel",
            replace: "\ue016"
        },
        "\\unlhd": {
            font: "ams",
            group: "bin",
            replace: "\u22b4"
        },
        "\\unrhd": {
            font: "ams",
            group: "bin",
            replace: "\u22b5"
        },

        // AMS Negated Arrows
         "\\nleftarrow": {
            font: "ams",
            group: "rel",
            replace: "\u219a"
        },
        "\\nrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u219b"
        },
        "\\nLeftarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21cd"
        },
        "\\nRightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21cf"
        },
        "\\nleftrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21ae"
        },
        "\\nLeftrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21ce"
        },

        // AMS Misc
        "\\vartriangle": {
            font: "ams",
            group: "rel",
            replace: "\u25b3"
        },
        "\\hslash": {
            font: "ams",
            group: "textord",
            replace: "\u210f"
        },
        "\\triangledown": {
            font: "ams",
            group: "textord",
            replace: "\u25bd"
        },
        "\\lozenge": {
            font: "ams",
            group: "textord",
            replace: "\u25ca"
        },
        "\\circledS": {
            font: "ams",
            group: "textord",
            replace: "\u24c8"
        },
        "\\circledR": {
            font: "ams",
            group: "textord",
            replace: "\u00ae"
        },
        "\\measuredangle": {
            font: "ams",
            group: "textord",
            replace: "\u2221"
        },
        "\\nexists": {
            font: "ams",
            group: "textord",
            replace: "\u2204"
        },
        "\\mho": {
            font: "ams",
            group: "textord",
            replace: "\u2127"
        },
        "\\Finv": {
            font: "ams",
            group: "textord",
            replace: "\u2132"
        },
        "\\Game": {
            font: "ams",
            group: "textord",
            replace: "\u2141"
        },
        "\\Bbbk": {
            font: "ams",
            group: "textord",
            replace: "\u006b"
        },
        "\\backprime": {
            font: "ams",
            group: "textord",
            replace: "\u2035"
        },
        "\\blacktriangle": {
            font: "ams",
            group: "textord",
            replace: "\u25b2"
        },
        "\\blacktriangledown": {
            font: "ams",
            group: "textord",
            replace: "\u25bc"
        },
        "\\blacksquare": {
            font: "ams",
            group: "textord",
            replace: "\u25a0"
        },
        "\\blacklozenge": {
            font: "ams",
            group: "textord",
            replace: "\u29eb"
        },
        "\\bigstar": {
            font: "ams",
            group: "textord",
            replace: "\u2605"
        },
        "\\sphericalangle": {
            font: "ams",
            group: "textord",
            replace: "\u2222"
        },
        "\\complement": {
            font: "ams",
            group: "textord",
            replace: "\u2201"
        },
        "\\eth": {
            font: "ams",
            group: "textord",
            replace: "\u00f0"
        },
        "\\diagup": {
            font: "ams",
            group: "textord",
            replace: "\u2571"
        },
        "\\diagdown": {
            font: "ams",
            group: "textord",
            replace: "\u2572"
        },
        "\\square": {
            font: "ams",
            group: "textord",
            replace: "\u25a1"
        },
        "\\Box": {
            font: "ams",
            group: "textord",
            replace: "\u25a1"
        },
        "\\Diamond": {
            font: "ams",
            group: "textord",
            replace: "\u25ca"
        },
        "\\yen": {
            font: "ams",
            group: "textord",
            replace: "\u00a5"
        },
        "\\checkmark": {
            font: "ams",
            group: "textord",
            replace: "\u2713"
        },

        // AMS Hebrew
        "\\beth": {
            font: "ams",
            group: "textord",
            replace: "\u2136"
        },
        "\\daleth": {
            font: "ams",
            group: "textord",
            replace: "\u2138"
        },
        "\\gimel": {
            font: "ams",
            group: "textord",
            replace: "\u2137"
        },

        // AMS Greek
        "\\digamma": {
            font: "ams",
            group: "textord",
            replace: "\u03dd"
        },
        "\\varkappa": {
            font: "ams",
            group: "textord",
            replace: "\u03f0"
        },

        // AMS Delimiters
        "\\ulcorner": {
            font: "ams",
            group: "open",
            replace: "\u250c"
        },
        "\\urcorner": {
            font: "ams",
            group: "close",
            replace: "\u2510"
        },
        "\\llcorner": {
            font: "ams",
            group: "open",
            replace: "\u2514"
        },
        "\\lrcorner": {
            font: "ams",
            group: "close",
            replace: "\u2518"
        },

        // AMS Binary Relations
        "\\leqq": {
            font: "ams",
            group: "rel",
            replace: "\u2266"
        },
        "\\leqslant": {
            font: "ams",
            group: "rel",
            replace: "\u2a7d"
        },
        "\\eqslantless": {
            font: "ams",
            group: "rel",
            replace: "\u2a95"
        },
        "\\lesssim": {
            font: "ams",
            group: "rel",
            replace: "\u2272"
        },
        "\\lessapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2a85"
        },
        "\\approxeq": {
            font: "ams",
            group: "rel",
            replace: "\u224a"
        },
        "\\lessdot": {
            font: "ams",
            group: "bin",
            replace: "\u22d6"
        },
        "\\lll": {
            font: "ams",
            group: "rel",
            replace: "\u22d8"
        },
        "\\lessgtr": {
            font: "ams",
            group: "rel",
            replace: "\u2276"
        },
        "\\lesseqgtr": {
            font: "ams",
            group: "rel",
            replace: "\u22da"
        },
        "\\lesseqqgtr": {
            font: "ams",
            group: "rel",
            replace: "\u2a8b"
        },
        "\\doteqdot": {
            font: "ams",
            group: "rel",
            replace: "\u2251"
        },
        "\\risingdotseq": {
            font: "ams",
            group: "rel",
            replace: "\u2253"
        },
        "\\fallingdotseq": {
            font: "ams",
            group: "rel",
            replace: "\u2252"
        },
        "\\backsim": {
            font: "ams",
            group: "rel",
            replace: "\u223d"
        },
        "\\backsimeq": {
            font: "ams",
            group: "rel",
            replace: "\u22cd"
        },
        "\\subseteqq": {
            font: "ams",
            group: "rel",
            replace: "\u2ac5"
        },
        "\\Subset": {
            font: "ams",
            group: "rel",
            replace: "\u22d0"
        },
        "\\sqsubset": {
            font: "ams",
            group: "rel",
            replace: "\u228f"
        },
        "\\preccurlyeq": {
            font: "ams",
            group: "rel",
            replace: "\u227c"
        },
        "\\curlyeqprec": {
            font: "ams",
            group: "rel",
            replace: "\u22de"
        },
        "\\precsim": {
            font: "ams",
            group: "rel",
            replace: "\u227e"
        },
        "\\precapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2ab7"
        },
        "\\vartriangleleft": {
            font: "ams",
            group: "rel",
            replace: "\u22b2"
        },
        "\\trianglelefteq": {
            font: "ams",
            group: "rel",
            replace: "\u22b4"
        },
        "\\vDash": {
            font: "ams",
            group: "rel",
            replace: "\u22a8"
        },
        "\\Vvdash": {
            font: "ams",
            group: "rel",
            replace: "\u22aa"
        },
        "\\smallsmile": {
            font: "ams",
            group: "rel",
            replace: "\u2323"
        },
        "\\smallfrown": {
            font: "ams",
            group: "rel",
            replace: "\u2322"
        },
        "\\bumpeq": {
            font: "ams",
            group: "rel",
            replace: "\u224f"
        },
        "\\Bumpeq": {
            font: "ams",
            group: "rel",
            replace: "\u224e"
        },
        "\\geqq": {
            font: "ams",
            group: "rel",
            replace: "\u2267"
        },
        "\\geqslant": {
            font: "ams",
            group: "rel",
            replace: "\u2a7e"
        },
        "\\eqslantgtr": {
            font: "ams",
            group: "rel",
            replace: "\u2a96"
        },
        "\\gtrsim": {
            font: "ams",
            group: "rel",
            replace: "\u2273"
        },
        "\\gtrapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2a86"
        },
        "\\gtrdot": {
            font: "ams",
            group: "bin",
            replace: "\u22d7"
        },
        "\\ggg": {
            font: "ams",
            group: "rel",
            replace: "\u22d9"
        },
        "\\gtrless": {
            font: "ams",
            group: "rel",
            replace: "\u2277"
        },
        "\\gtreqless": {
            font: "ams",
            group: "rel",
            replace: "\u22db"
        },
        "\\gtreqqless": {
            font: "ams",
            group: "rel",
            replace: "\u2a8c"
        },
        "\\eqcirc": {
            font: "ams",
            group: "rel",
            replace: "\u2256"
        },
        "\\circeq": {
            font: "ams",
            group: "rel",
            replace: "\u2257"
        },
        "\\triangleq": {
            font: "ams",
            group: "rel",
            replace: "\u225c"
        },
        "\\thicksim": {
            font: "ams",
            group: "rel",
            replace: "\u223c"
        },
        "\\thickapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2248"
        },
        "\\supseteqq": {
            font: "ams",
            group: "rel",
            replace: "\u2ac6"
        },
        "\\Supset": {
            font: "ams",
            group: "rel",
            replace: "\u22d1"
        },
        "\\sqsupset": {
            font: "ams",
            group: "rel",
            replace: "\u2290"
        },
        "\\succcurlyeq": {
            font: "ams",
            group: "rel",
            replace: "\u227d"
        },
        "\\curlyeqsucc": {
            font: "ams",
            group: "rel",
            replace: "\u22df"
        },
        "\\succsim": {
            font: "ams",
            group: "rel",
            replace: "\u227f"
        },
        "\\succapprox": {
            font: "ams",
            group: "rel",
            replace: "\u2ab8"
        },
        "\\vartriangleright": {
            font: "ams",
            group: "rel",
            replace: "\u22b3"
        },
        "\\trianglerighteq": {
            font: "ams",
            group: "rel",
            replace: "\u22b5"
        },
        "\\Vdash": {
            font: "ams",
            group: "rel",
            replace: "\u22a9"
        },
        "\\shortmid": {
            font: "ams",
            group: "rel",
            replace: "\u2223"
        },
        "\\shortparallel": {
            font: "ams",
            group: "rel",
            replace: "\u2225"
        },
        "\\between": {
            font: "ams",
            group: "rel",
            replace: "\u226c"
        },
        "\\pitchfork": {
            font: "ams",
            group: "rel",
            replace: "\u22d4"
        },
        "\\varpropto": {
            font: "ams",
            group: "rel",
            replace: "\u221d"
        },
        "\\blacktriangleleft": {
            font: "ams",
            group: "rel",
            replace: "\u25c0"
        },
        "\\therefore": {
            font: "ams",
            group: "rel",
            replace: "\u2234"
        },
        "\\backepsilon": {
            font: "ams",
            group: "rel",
            replace: "\u220d"
        },
        "\\blacktriangleright": {
            font: "ams",
            group: "rel",
            replace: "\u25b6"
        },
        "\\because": {
            font: "ams",
            group: "rel",
            replace: "\u2235"
        },
        "\\llless": {
            font: "ams",
            group: "rel",
            replace: "\u22d8"
        },
        "\\gggtr": {
            font: "ams",
            group: "rel",
            replace: "\u22d9"
        },
        "\\lhd": {
            font: "ams",
            group: "bin",
            replace: "\u22b2"
        },
        "\\rhd": {
            font: "ams",
            group: "bin",
            replace: "\u22b3"
        },
        "\\eqsim": {
            font: "ams",
            group: "rel",
            replace: "\u2242"
        },
        "\\Join": {
            font: "main",
            group: "rel",
            replace: "\u22c8"
        },
        "\\Doteq": {
            font: "ams",
            group: "rel",
            replace: "\u2251"
        },

        // AMS Binary Operators
        "\\dotplus": {
            font: "ams",
            group: "bin",
            replace: "\u2214"
        },
        "\\smallsetminus": {
            font: "ams",
            group: "bin",
            replace: "\u2216"
        },
        "\\Cap": {
            font: "ams",
            group: "bin",
            replace: "\u22d2"
        },
        "\\Cup": {
            font: "ams",
            group: "bin",
            replace: "\u22d3"
        },
        "\\doublebarwedge": {
            font: "ams",
            group: "bin",
            replace: "\u2a5e"
        },
        "\\boxminus": {
            font: "ams",
            group: "bin",
            replace: "\u229f"
        },
        "\\boxplus": {
            font: "ams",
            group: "bin",
            replace: "\u229e"
        },
        "\\divideontimes": {
            font: "ams",
            group: "bin",
            replace: "\u22c7"
        },
        "\\ltimes": {
            font: "ams",
            group: "bin",
            replace: "\u22c9"
        },
        "\\rtimes": {
            font: "ams",
            group: "bin",
            replace: "\u22ca"
        },
        "\\leftthreetimes": {
            font: "ams",
            group: "bin",
            replace: "\u22cb"
        },
        "\\rightthreetimes": {
            font: "ams",
            group: "bin",
            replace: "\u22cc"
        },
        "\\curlywedge": {
            font: "ams",
            group: "bin",
            replace: "\u22cf"
        },
        "\\curlyvee": {
            font: "ams",
            group: "bin",
            replace: "\u22ce"
        },
        "\\circleddash": {
            font: "ams",
            group: "bin",
            replace: "\u229d"
        },
        "\\circledast": {
            font: "ams",
            group: "bin",
            replace: "\u229b"
        },
        "\\centerdot": {
            font: "ams",
            group: "bin",
            replace: "\u22c5"
        },
        "\\intercal": {
            font: "ams",
            group: "bin",
            replace: "\u22ba"
        },
        "\\doublecap": {
            font: "ams",
            group: "bin",
            replace: "\u22d2"
        },
        "\\doublecup": {
            font: "ams",
            group: "bin",
            replace: "\u22d3"
        },
        "\\boxtimes": {
            font: "ams",
            group: "bin",
            replace: "\u22a0"
        },

        // AMS Arrows
        "\\dashrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21e2"
        },
        "\\dashleftarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21e0"
        },
        "\\leftleftarrows": {
            font: "ams",
            group: "rel",
            replace: "\u21c7"
        },
        "\\leftrightarrows": {
            font: "ams",
            group: "rel",
            replace: "\u21c6"
        },
        "\\Lleftarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21da"
        },
        "\\twoheadleftarrow": {
            font: "ams",
            group: "rel",
            replace: "\u219e"
        },
        "\\leftarrowtail": {
            font: "ams",
            group: "rel",
            replace: "\u21a2"
        },
        "\\looparrowleft": {
            font: "ams",
            group: "rel",
            replace: "\u21ab"
        },
        "\\leftrightharpoons": {
            font: "ams",
            group: "rel",
            replace: "\u21cb"
        },
        "\\curvearrowleft": {
            font: "ams",
            group: "rel",
            replace: "\u21b6"
        },
        "\\circlearrowleft": {
            font: "ams",
            group: "rel",
            replace: "\u21ba"
        },
        "\\Lsh": {
            font: "ams",
            group: "rel",
            replace: "\u21b0"
        },
        "\\upuparrows": {
            font: "ams",
            group: "rel",
            replace: "\u21c8"
        },
        "\\upharpoonleft": {
            font: "ams",
            group: "rel",
            replace: "\u21bf"
        },
        "\\downharpoonleft": {
            font: "ams",
            group: "rel",
            replace: "\u21c3"
        },
        "\\multimap": {
            font: "ams",
            group: "rel",
            replace: "\u22b8"
        },
        "\\leftrightsquigarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21ad"
        },
        "\\rightrightarrows": {
            font: "ams",
            group: "rel",
            replace: "\u21c9"
        },
        "\\rightleftarrows": {
            font: "ams",
            group: "rel",
            replace: "\u21c4"
        },
        "\\twoheadrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21a0"
        },
        "\\rightarrowtail": {
            font: "ams",
            group: "rel",
            replace: "\u21a3"
        },
        "\\looparrowright": {
            font: "ams",
            group: "rel",
            replace: "\u21ac"
        },
        "\\curvearrowright": {
            font: "ams",
            group: "rel",
            replace: "\u21b7"
        },
        "\\circlearrowright": {
            font: "ams",
            group: "rel",
            replace: "\u21bb"
        },
        "\\Rsh": {
            font: "ams",
            group: "rel",
            replace: "\u21b1"
        },
        "\\downdownarrows": {
            font: "ams",
            group: "rel",
            replace: "\u21ca"
        },
        "\\upharpoonright": {
            font: "ams",
            group: "rel",
            replace: "\u21be"
        },
        "\\downharpoonright": {
            font: "ams",
            group: "rel",
            replace: "\u21c2"
        },
        "\\rightsquigarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21dd"
        },
        "\\leadsto": {
            font: "ams",
            group: "rel",
            replace: "\u21dd"
        },
        "\\Rrightarrow": {
            font: "ams",
            group: "rel",
            replace: "\u21db"
        },
        "\\restriction": {
            font: "ams",
            group: "rel",
            replace: "\u21be"
        },

        "`": {
            font: "main",
            group: "textord",
            replace: "\u2018"
        },
        "\\$": {
            font: "main",
            group: "textord",
            replace: "$"
        },
        "\\%": {
            font: "main",
            group: "textord",
            replace: "%"
        },
        "\\_": {
            font: "main",
            group: "textord",
            replace: "_"
        },
        "\\angle": {
            font: "main",
            group: "textord",
            replace: "\u2220"
        },
        "\\infty": {
            font: "main",
            group: "textord",
            replace: "\u221e"
        },
        "\\prime": {
            font: "main",
            group: "textord",
            replace: "\u2032"
        },
        "\\triangle": {
            font: "main",
            group: "textord",
            replace: "\u25b3"
        },
        "\\Gamma": {
            font: "main",
            group: "textord",
            replace: "\u0393"
        },
        "\\Delta": {
            font: "main",
            group: "textord",
            replace: "\u0394"
        },
        "\\Theta": {
            font: "main",
            group: "textord",
            replace: "\u0398"
        },
        "\\Lambda": {
            font: "main",
            group: "textord",
            replace: "\u039b"
        },
        "\\Xi": {
            font: "main",
            group: "textord",
            replace: "\u039e"
        },
        "\\Pi": {
            font: "main",
            group: "textord",
            replace: "\u03a0"
        },
        "\\Sigma": {
            font: "main",
            group: "textord",
            replace: "\u03a3"
        },
        "\\Upsilon": {
            font: "main",
            group: "textord",
            replace: "\u03a5"
        },
        "\\Phi": {
            font: "main",
            group: "textord",
            replace: "\u03a6"
        },
        "\\Psi": {
            font: "main",
            group: "textord",
            replace: "\u03a8"
        },
        "\\Omega": {
            font: "main",
            group: "textord",
            replace: "\u03a9"
        },
        "\\neg": {
            font: "main",
            group: "textord",
            replace: "\u00ac"
        },
        "\\lnot": {
            font: "main",
            group: "textord",
            replace: "\u00ac"
        },
        "\\top": {
            font: "main",
            group: "textord",
            replace: "\u22a4"
        },
        "\\bot": {
            font: "main",
            group: "textord",
            replace: "\u22a5"
        },
        "\\emptyset": {
            font: "main",
            group: "textord",
            replace: "\u2205"
        },
        "\\varnothing": {
            font: "ams",
            group: "textord",
            replace: "\u2205"
        },
        "\\alpha": {
            font: "main",
            group: "mathord",
            replace: "\u03b1"
        },
        "\\beta": {
            font: "main",
            group: "mathord",
            replace: "\u03b2"
        },
        "\\gamma": {
            font: "main",
            group: "mathord",
            replace: "\u03b3"
        },
        "\\delta": {
            font: "main",
            group: "mathord",
            replace: "\u03b4"
        },
        "\\epsilon": {
            font: "main",
            group: "mathord",
            replace: "\u03f5"
        },
        "\\zeta": {
            font: "main",
            group: "mathord",
            replace: "\u03b6"
        },
        "\\eta": {
            font: "main",
            group: "mathord",
            replace: "\u03b7"
        },
        "\\theta": {
            font: "main",
            group: "mathord",
            replace: "\u03b8"
        },
        "\\iota": {
            font: "main",
            group: "mathord",
            replace: "\u03b9"
        },
        "\\kappa": {
            font: "main",
            group: "mathord",
            replace: "\u03ba"
        },
        "\\lambda": {
            font: "main",
            group: "mathord",
            replace: "\u03bb"
        },
        "\\mu": {
            font: "main",
            group: "mathord",
            replace: "\u03bc"
        },
        "\\nu": {
            font: "main",
            group: "mathord",
            replace: "\u03bd"
        },
        "\\xi": {
            font: "main",
            group: "mathord",
            replace: "\u03be"
        },
        "\\omicron": {
            font: "main",
            group: "mathord",
            replace: "o"
        },
        "\\pi": {
            font: "main",
            group: "mathord",
            replace: "\u03c0"
        },
        "\\rho": {
            font: "main",
            group: "mathord",
            replace: "\u03c1"
        },
        "\\sigma": {
            font: "main",
            group: "mathord",
            replace: "\u03c3"
        },
        "\\tau": {
            font: "main",
            group: "mathord",
            replace: "\u03c4"
        },
        "\\upsilon": {
            font: "main",
            group: "mathord",
            replace: "\u03c5"
        },
        "\\phi": {
            font: "main",
            group: "mathord",
            replace: "\u03d5"
        },
        "\\chi": {
            font: "main",
            group: "mathord",
            replace: "\u03c7"
        },
        "\\psi": {
            font: "main",
            group: "mathord",
            replace: "\u03c8"
        },
        "\\omega": {
            font: "main",
            group: "mathord",
            replace: "\u03c9"
        },
        "\\varepsilon": {
            font: "main",
            group: "mathord",
            replace: "\u03b5"
        },
        "\\vartheta": {
            font: "main",
            group: "mathord",
            replace: "\u03d1"
        },
        "\\varpi": {
            font: "main",
            group: "mathord",
            replace: "\u03d6"
        },
        "\\varrho": {
            font: "main",
            group: "mathord",
            replace: "\u03f1"
        },
        "\\varsigma": {
            font: "main",
            group: "mathord",
            replace: "\u03c2"
        },
        "\\varphi": {
            font: "main",
            group: "mathord",
            replace: "\u03c6"
        },
        "*": {
            font: "main",
            group: "bin",
            replace: "\u2217"
        },
        "+": {
            font: "main",
            group: "bin"
        },
        "-": {
            font: "main",
            group: "bin",
            replace: "\u2212"
        },
        "\\cdot": {
            font: "main",
            group: "bin",
            replace: "\u22c5"
        },
        "\\circ": {
            font: "main",
            group: "bin",
            replace: "\u2218"
        },
        "\\div": {
            font: "main",
            group: "bin",
            replace: "\u00f7"
        },
        "\\pm": {
            font: "main",
            group: "bin",
            replace: "\u00b1"
        },
        "\\times": {
            font: "main",
            group: "bin",
            replace: "\u00d7"
        },
        "\\cap": {
            font: "main",
            group: "bin",
            replace: "\u2229"
        },
        "\\cup": {
            font: "main",
            group: "bin",
            replace: "\u222a"
        },
        "\\setminus": {
            font: "main",
            group: "bin",
            replace: "\u2216"
        },
        "\\land": {
            font: "main",
            group: "bin",
            replace: "\u2227"
        },
        "\\lor": {
            font: "main",
            group: "bin",
            replace: "\u2228"
        },
        "\\wedge": {
            font: "main",
            group: "bin",
            replace: "\u2227"
        },
        "\\vee": {
            font: "main",
            group: "bin",
            replace: "\u2228"
        },
        "\\surd": {
            font: "main",
            group: "textord",
            replace: "\u221a"
        },
        "(": {
            font: "main",
            group: "open"
        },
        "[": {
            font: "main",
            group: "open"
        },
        "\\langle": {
            font: "main",
            group: "open",
            replace: "\u27e8"
        },
        "\\lvert": {
            font: "main",
            group: "open",
            replace: "\u2223"
        },
        "\\lVert": {
            font: "main",
            group: "open",
            replace: "\u2225"
        },
        ")": {
            font: "main",
            group: "close"
        },
        "]": {
            font: "main",
            group: "close"
        },
        "?": {
            font: "main",
            group: "close"
        },
        "!": {
            font: "main",
            group: "close"
        },
        "\\rangle": {
            font: "main",
            group: "close",
            replace: "\u27e9"
        },
        "\\rvert": {
            font: "main",
            group: "close",
            replace: "\u2223"
        },
        "\\rVert": {
            font: "main",
            group: "close",
            replace: "\u2225"
        },
        "=": {
            font: "main",
            group: "rel"
        },
        "<": {
            font: "main",
            group: "rel"
        },
        ">": {
            font: "main",
            group: "rel"
        },
        ":": {
            font: "main",
            group: "rel"
        },
        "\\approx": {
            font: "main",
            group: "rel",
            replace: "\u2248"
        },
        "\\cong": {
            font: "main",
            group: "rel",
            replace: "\u2245"
        },
        "\\ge": {
            font: "main",
            group: "rel",
            replace: "\u2265"
        },
        "\\geq": {
            font: "main",
            group: "rel",
            replace: "\u2265"
        },
        "\\gets": {
            font: "main",
            group: "rel",
            replace: "\u2190"
        },
        "\\in": {
            font: "main",
            group: "rel",
            replace: "\u2208"
        },
        "\\notin": {
            font: "main",
            group: "rel",
            replace: "\u2209"
        },
        "\\subset": {
            font: "main",
            group: "rel",
            replace: "\u2282"
        },
        "\\supset": {
            font: "main",
            group: "rel",
            replace: "\u2283"
        },
        "\\subseteq": {
            font: "main",
            group: "rel",
            replace: "\u2286"
        },
        "\\supseteq": {
            font: "main",
            group: "rel",
            replace: "\u2287"
        },
        "\\nsubseteq": {
            font: "ams",
            group: "rel",
            replace: "\u2288"
        },
        "\\nsupseteq": {
            font: "ams",
            group: "rel",
            replace: "\u2289"
        },
        "\\models": {
            font: "main",
            group: "rel",
            replace: "\u22a8"
        },
        "\\leftarrow": {
            font: "main",
            group: "rel",
            replace: "\u2190"
        },
        "\\le": {
            font: "main",
            group: "rel",
            replace: "\u2264"
        },
        "\\leq": {
            font: "main",
            group: "rel",
            replace: "\u2264"
        },
        "\\ne": {
            font: "main",
            group: "rel",
            replace: "\u2260"
        },
        "\\neq": {
            font: "main",
            group: "rel",
            replace: "\u2260"
        },
        "\\rightarrow": {
            font: "main",
            group: "rel",
            replace: "\u2192"
        },
        "\\to": {
            font: "main",
            group: "rel",
            replace: "\u2192"
        },
        "\\ngeq": {
            font: "ams",
            group: "rel",
            replace: "\u2271"
        },
        "\\nleq": {
            font: "ams",
            group: "rel",
            replace: "\u2270"
        },
        "\\!": {
            font: "main",
            group: "spacing"
        },
        "\\ ": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        },
        "~": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        },
        "\\,": {
            font: "main",
            group: "spacing"
        },
        "\\:": {
            font: "main",
            group: "spacing"
        },
        "\\;": {
            font: "main",
            group: "spacing"
        },
        "\\enspace": {
            font: "main",
            group: "spacing"
        },
        "\\qquad": {
            font: "main",
            group: "spacing"
        },
        "\\quad": {
            font: "main",
            group: "spacing"
        },
        "\\space": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        },
        ",": {
            font: "main",
            group: "punct"
        },
        ";": {
            font: "main",
            group: "punct"
        },
        "\\colon": {
            font: "main",
            group: "punct",
            replace: ":"
        },
        "\\barwedge": {
            font: "ams",
            group: "bin",
            replace: "\u22bc"
        },
        "\\veebar": {
            font: "ams",
            group: "bin",
            replace: "\u22bb"
        },
        "\\odot": {
            font: "main",
            group: "bin",
            replace: "\u2299"
        },
        "\\oplus": {
            font: "main",
            group: "bin",
            replace: "\u2295"
        },
        "\\otimes": {
            font: "main",
            group: "bin",
            replace: "\u2297"
        },
        "\\partial":{
            font: "main",
            group: "textord",
            replace: "\u2202"
        },
        "\\oslash": {
            font: "main",
            group: "bin",
            replace: "\u2298"
        },
        "\\circledcirc": {
            font: "ams",
            group: "bin",
            replace: "\u229a"
        },
        "\\boxdot": {
            font: "ams",
            group: "bin",
            replace: "\u22a1"
        },
        "\\bigtriangleup": {
            font: "main",
            group: "bin",
            replace: "\u25b3"
        },
        "\\bigtriangledown": {
            font: "main",
            group: "bin",
            replace: "\u25bd"
        },
        "\\dagger": {
            font: "main",
            group: "bin",
            replace: "\u2020"
        },
        "\\diamond": {
            font: "main",
            group: "bin",
            replace: "\u22c4"
        },
        "\\star": {
            font: "main",
            group: "bin",
            replace: "\u22c6"
        },
        "\\triangleleft": {
            font: "main",
            group: "bin",
            replace: "\u25c3"
        },
        "\\triangleright": {
            font: "main",
            group: "bin",
            replace: "\u25b9"
        },
        "\\{": {
            font: "main",
            group: "open",
            replace: "{"
        },
        "\\}": {
            font: "main",
            group: "close",
            replace: "}"
        },
        "\\lbrace": {
            font: "main",
            group: "open",
            replace: "{"
        },
        "\\rbrace": {
            font: "main",
            group: "close",
            replace: "}"
        },
        "\\lbrack": {
            font: "main",
            group: "open",
            replace: "["
        },
        "\\rbrack": {
            font: "main",
            group: "close",
            replace: "]"
        },
        "\\lfloor": {
            font: "main",
            group: "open",
            replace: "\u230a"
        },
        "\\rfloor": {
            font: "main",
            group: "close",
            replace: "\u230b"
        },
        "\\lceil": {
            font: "main",
            group: "open",
            replace: "\u2308"
        },
        "\\rceil": {
            font: "main",
            group: "close",
            replace: "\u2309"
        },
        "\\backslash": {
            font: "main",
            group: "textord",
            replace: "\\"
        },
        "|": {
            font: "main",
            group: "textord",
            replace: "\u2223"
        },
        "\\vert": {
            font: "main",
            group: "textord",
            replace: "\u2223"
        },
        "\\|": {
            font: "main",
            group: "textord",
            replace: "\u2225"
        },
        "\\Vert": {
            font: "main",
            group: "textord",
            replace: "\u2225"
        },
        "\\uparrow": {
            font: "main",
            group: "rel",
            replace: "\u2191"
        },
        "\\Uparrow": {
            font: "main",
            group: "rel",
            replace: "\u21d1"
        },
        "\\downarrow": {
            font: "main",
            group: "rel",
            replace: "\u2193"
        },
        "\\Downarrow": {
            font: "main",
            group: "rel",
            replace: "\u21d3"
        },
        "\\updownarrow": {
            font: "main",
            group: "rel",
            replace: "\u2195"
        },
        "\\Updownarrow": {
            font: "main",
            group: "rel",
            replace: "\u21d5"
        },
        "\\coprod": {
            font: "math",
            group: "op",
            replace: "\u2210"
        },
        "\\bigvee": {
            font: "math",
            group: "op",
            replace: "\u22c1"
        },
        "\\bigwedge": {
            font: "math",
            group: "op",
            replace: "\u22c0"
        },
        "\\biguplus": {
            font: "math",
            group: "op",
            replace: "\u2a04"
        },
        "\\bigcap": {
            font: "math",
            group: "op",
            replace: "\u22c2"
        },
        "\\bigcup": {
            font: "math",
            group: "op",
            replace: "\u22c3"
        },
        "\\int": {
            font: "math",
            group: "op",
            replace: "\u222b"
        },
        "\\intop": {
            font: "math",
            group: "op",
            replace: "\u222b"
        },
        "\\iint": {
            font: "math",
            group: "op",
            replace: "\u222c"
        },
        "\\iiint": {
            font: "math",
            group: "op",
            replace: "\u222d"
        },
        "\\prod": {
            font: "math",
            group: "op",
            replace: "\u220f"
        },
        "\\sum": {
            font: "math",
            group: "op",
            replace: "\u2211"
        },
        "\\bigotimes": {
            font: "math",
            group: "op",
            replace: "\u2a02"
        },
        "\\bigoplus": {
            font: "math",
            group: "op",
            replace: "\u2a01"
        },
        "\\bigodot": {
            font: "math",
            group: "op",
            replace: "\u2a00"
        },
        "\\oint": {
            font: "math",
            group: "op",
            replace: "\u222e"
        },
        "\\bigsqcup": {
            font: "math",
            group: "op",
            replace: "\u2a06"
        },
        "\\smallint": {
            font: "math",
            group: "op",
            replace: "\u222b"
        },
        "\\ldots": {
            font: "main",
            group: "inner",
            replace: "\u2026"
        },
        "\\cdots": {
            font: "main",
            group: "inner",
            replace: "\u22ef"
        },
        "\\ddots": {
            font: "main",
            group: "inner",
            replace: "\u22f1"
        },
        "\\vdots": {
            font: "main",
            group: "textord",
            replace: "\u22ee"
        },
        "\\acute": {
            font: "main",
            group: "accent",
            replace: "\u00b4"
        },
        "\\grave": {
            font: "main",
            group: "accent",
            replace: "\u0060"
        },
        "\\ddot": {
            font: "main",
            group: "accent",
            replace: "\u00a8"
        },
        "\\tilde": {
            font: "main",
            group: "accent",
            replace: "\u007e"
        },
        "\\bar": {
            font: "main",
            group: "accent",
            replace: "\u00af"
        },
        "\\breve": {
            font: "main",
            group: "accent",
            replace: "\u02d8"
        },
        "\\check": {
            font: "main",
            group: "accent",
            replace: "\u02c7"
        },
        "\\hat": {
            font: "main",
            group: "accent",
            replace: "\u005e"
        },
        "\\vec": {
            font: "main",
            group: "accent",
            replace: "\u20d7"
        },
        "\\dot": {
            font: "main",
            group: "accent",
            replace: "\u02d9"
        },

        "\\imath": {
            font: "main",
            group: "mathord",
            replace: "\u0131"
        },
        "\\jmath": {
            font: "main",
            group: "mathord",
            replace: "\u0237"
        }
    },
    "text": {
        "\\ ": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        },
        " ": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        },
        "~": {
            font: "main",
            group: "spacing",
            replace: "\u00a0"
        }
    }
};

// There are lots of symbols which are the same, so we add them in afterwards.

// All of these are textords in math mode
var mathTextSymbols = "0123456789/@.\"";
for (var i = 0; i < mathTextSymbols.length; i++) {
    var ch = mathTextSymbols.charAt(i);
    symbols.math[ch] = {
        font: "main",
        group: "textord"
    };
}

// All of these are textords in text mode
var textSymbols = "0123456789`!@*()-=+[]'\";:?/.,";
for (var i = 0; i < textSymbols.length; i++) {
    var ch = textSymbols.charAt(i);
    symbols.text[ch] = {
        font: "main",
        group: "textord"
    };
}

// All of these are textords in text mode, and mathords in math mode
var letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
for (var i = 0; i < letters.length; i++) {
    var ch = letters.charAt(i);
    symbols.math[ch] = {
        font: "main",
        group: "mathord"
    };
    symbols.text[ch] = {
        font: "main",
        group: "textord"
    };
}

module.exports = symbols;

},{}],48:[function(require,module,exports){
/**
 * This file contains a list of utility functions which are useful in other
 * files.
 */

/**
 * Provide an `indexOf` function which works in IE8, but defers to native if
 * possible.
 */
var nativeIndexOf = Array.prototype.indexOf;
var indexOf = function(list, elem) {
    if (list == null) {
        return -1;
    }
    if (nativeIndexOf && list.indexOf === nativeIndexOf) {
        return list.indexOf(elem);
    }
    var i = 0, l = list.length;
    for (; i < l; i++) {
        if (list[i] === elem) {
            return i;
        }
    }
    return -1;
};

/**
 * Return whether an element is contained in a list
 */
var contains = function(list, elem) {
    return indexOf(list, elem) !== -1;
};

/**
 * Provide a default value if a setting is undefined
 */
var deflt = function(setting, defaultIfUndefined) {
    return setting === undefined ? defaultIfUndefined : setting;
};

// hyphenate and escape adapted from Facebook's React under Apache 2 license

var uppercase = /([A-Z])/g;
var hyphenate = function(str) {
    return str.replace(uppercase, "-$1").toLowerCase();
};

var ESCAPE_LOOKUP = {
  "&": "&amp;",
  ">": "&gt;",
  "<": "&lt;",
  "\"": "&quot;",
  "'": "&#x27;"
};

var ESCAPE_REGEX = /[&><"']/g;

function escaper(match) {
  return ESCAPE_LOOKUP[match];
}

/**
 * Escapes text to prevent scripting attacks.
 *
 * @param {*} text Text value to escape.
 * @return {string} An escaped string.
 */
function escape(text) {
  return ("" + text).replace(ESCAPE_REGEX, escaper);
}

/**
 * A function to set the text content of a DOM element in all supported
 * browsers. Note that we don't define this if there is no document.
 */
var setTextContent;
if (typeof document !== "undefined") {
    var testNode = document.createElement("span");
    if ("textContent" in testNode) {
        setTextContent = function(node, text) {
            node.textContent = text;
        };
    } else {
        setTextContent = function(node, text) {
            node.innerText = text;
        };
    }
}

/**
 * A function to clear a node.
 */
function clearNode(node) {
    setTextContent(node, "");
}

module.exports = {
    contains: contains,
    deflt: deflt,
    escape: escape,
    hyphenate: hyphenate,
    indexOf: indexOf,
    setTextContent: setTextContent,
    clearNode: clearNode
};

},{}],49:[function(require,module,exports){
/** @flow */

"use strict";

function getRelocatable(re) {
  // In the future, this could use a WeakMap instead of an expando.
  if (!re.__matchAtRelocatable) {
    // Disjunctions are the lowest-precedence operator, so we can make any
    // pattern match the empty string by appending `|()` to it:
    // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-patterns
    var source = re.source + "|()";

    // We always make the new regex global.
    var flags = "g" + (re.ignoreCase ? "i" : "") + (re.multiline ? "m" : "") + (re.unicode ? "u" : "")
    // sticky (/.../y) doesn't make sense in conjunction with our relocation
    // logic, so we ignore it here.
    ;

    re.__matchAtRelocatable = new RegExp(source, flags);
  }
  return re.__matchAtRelocatable;
}

function matchAt(re, str, pos) {
  if (re.global || re.sticky) {
    throw new Error("matchAt(...): Only non-global regexes are supported");
  }
  var reloc = getRelocatable(re);
  reloc.lastIndex = pos;
  var match = reloc.exec(str);
  // Last capturing group is our sentinel that indicates whether the regex
  // matched at the given location.
  if (match[match.length - 1] == null) {
    // Original regex matched.
    match.length = match.length - 1;
    return match;
  } else {
    return null;
  }
}

module.exports = matchAt;
},{}]},{},[1]);

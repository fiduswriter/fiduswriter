import {bookListTemplate, bookBasicInfoTemplate, bookPrintDataTemplate,
    bookDialogChaptersTemplate, bookDialogTemplate,
    bookChapterListTemplate, bookDocumentListTemplate, bookChapterDialogTemplate,
    bookBibliographyDataTemplate, bookEpubDataTemplate, bookEpubDataCoverTemplate
  } from "./templates"
import {ImageDB} from "../images/database"
import {ImageSelectionDialog} from "../images/selection-dialog"
import {defaultDocumentStyle, documentStyleList} from "../style/documentstyle-list"
import {defaultCitationStyle, citationDefinitions} from "../style/citation-definitions"
import {deactivateWait, addAlert, csrfToken} from "../common"


export class BookActions {

    constructor(bookList) {
        bookList.mod.actions = this
        this.bookList = bookList
    }

    deleteBook(id) {
        let postData = {}
        postData['id'] = id
        jQuery.ajax({
            url: '/book/delete/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (data, textStatus, jqXHR) => {
                this.stopBookTable()
                jQuery('#Book_' + id).detach()
                this.bookList.bookList = _.reject(
                    this.bookList.bookList,
                    book => book.id === id
                )
                this.startBookTable()
            },
        })
    }

    stopBookTable() {
        jQuery('#book-table').dataTable().fnDestroy()
    }

    startBookTable() {
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
        })

        jQuery('#book-table_filter input').attr('placeholder', gettext('Search for Book Title'))
        jQuery('#book-table_filter input').unbind('focus, blur')
        jQuery('#book-table_filter input').bind('focus', function() {
            jQuery(this).parent().addClass('focus')
        })
        jQuery('#book-table_filter input').bind('blur', function() {
            jQuery(this).parent().removeClass('focus')
        })

        let autocompleteTags = []
        jQuery('#book-table .fw-searchable').each(function() {
            autocompleteTags.push(this.textContent.replace(/^\s+/g, '').replace(/\s+$/g, ''))
        })
        autocompleteTags = _.uniq(autocompleteTags)
        jQuery("#book-table_filter input").autocomplete({
            source: autocompleteTags
        })
    }

    deleteBookDialog(ids) {
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') +
            '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
            gettext('Delete the book(s)?') + '</p></div>')
        let diaButtons = {}
        let that = this
        diaButtons[gettext('Delete')] = function () {
            for (let i = 0; i < ids.length; i++) {
                that.deleteBook(ids[i])
            }
            jQuery(this).dialog("close")
            addAlert('success', gettext('The book(s) have been deleted'))
        }

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
        }

        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: () => jQuery("#confirmdeletion").detach(),
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
        })
    }

    unpackBooks(booksFromServer) {
        // metadata and settings are stored as a json stirng in a text field on the server, so they need to be unpacked before being available.
        for (let i = 0; i < booksFromServer.length; i++) {
            booksFromServer[i].metadata = JSON.parse(booksFromServer[
                i].metadata)
            booksFromServer[i].settings = JSON.parse(booksFromServer[
                i].settings)
        }
        return booksFromServer
    }


    getBookListData(id) {
        jQuery.ajax({
            url: '/book/booklist/',
            data: {},
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) => {
                this.bookList.bookList = this.unpackBooks(response.books)
                this.bookList.documentList = response.documents
                this.bookList.teamMembers = response.team_members
                this.bookList.accessRights = response.access_rights
                this.bookList.user = response.user
                jQuery.event.trigger({
                    type: "bookDataLoaded",
                })
            },
            error: (jqXHR, textStatus, errorThrown) =>
                addAlert('error', jqXHR.responseText),
            complete: () => deactivateWait()
        })
    }

    editChapterDialog(aChapter, theBook) {

        let aDocument = _.findWhere(this.bookList.documentList, {
            id: aChapter.text
        }),
            documentTitle = aDocument.title,
            dialogHeader, dialogBody
        if (documentTitle.length < 0) {
            documentTitle = gettext('Untitled')
        }
        dialogHeader = gettext('Edit Chapter') + ': ' + aChapter.number +
            '. ' + documentTitle
        dialogBody = bookChapterDialogTemplate({
            'dialogHeader': dialogHeader,
            'aChapter': aChapter
        })

        jQuery('body').append(dialogBody)
        let diaButtons = {}
        let that = this
        diaButtons[gettext('Submit')] = function () {
            aChapter.part = jQuery('#book-chapter-part').val()
            jQuery('#book-chapter-list').html(bookChapterListTemplate({
                theBook, documentList: that.bookList.documentList
            }))
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
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
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: () =>
                jQuery('#book-chapter-dialog').dialog('destroy').remove()
        })

    }


    saveBook(theBook, theOldBook, currentDialog) {
        jQuery.ajax({
            url: '/book/save/',
            data: {
                the_book: JSON.stringify(theBook)
            },
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) => {
                if (jqXHR.status == 201) {
                    theBook.id = response.id
                    theBook.added = response.added
                }
                theBook.updated = response.updated
                if (typeof (theOldBook) !== 'undefined') {
                    this.bookList.bookList = _.reject(
                        this.bookList.bookList,
                        book => book = theOldBook
                    )
                }
                this.bookList.bookList.push(theBook)
                this.stopBookTable()
                jQuery('#book-table tbody').html(bookListTemplate({
                    bookList: this.bookList.bookList,
                    user: this.bookList.user
                }))
                this.startBookTable()
                if ((typeof (currentDialog) != 'undefined')) {
                    jQuery(currentDialog).dialog('close')
                }
            },
            error: (jqXHR, textStatus, errorThrown) =>
                addAlert('error', jqXHR.responseText),
            complete: () => {}
        })
    }

    copyBook(theOldBook) {
        let theBook = jQuery.extend(true, {}, theOldBook)
        theBook.id = 0
        theBook.is_owner = true
        theBook.owner_avatar = this.bookList.user.avatar
        theBook.owner_name = this.bookList.user.name
        theBook.owner = this.bookList.user.id
        theBook.rights = 'write'
        if (theOldBook.owner != theBook.owner) {
            this.prepareCopyCoverImage(
                theBook.cover_image,
                theOldBook.owner
            ).then(
                id => {
                    theBook.cover_image = id
                    this.saveBook(theBook)
                }
            )
        } else {
            this.saveBook(theBook)
        }
    }

    prepareCopyCoverImage(coverImage, userId) {
        return new Promise (resolve => {
            this.bookList.getImageDB().then(() =>
                this.getImageDB(userId).then(
                    imageDB => {
                        let coverImageImage = imageDB[coverImage]
                        this.copyCoverImage(coverImageImage).then(resolve)
                    }
                )
            )
        })
    }

    copyCoverImage(oldImageObject) {
        let newImageEntry = false,
            imageTranslation = false

        let matchEntries = _.where(this.bookList.imageDB.db, {
            checksum: oldImageObject.checksum
        })
        if (0 === matchEntries.length) {
            //create new
            newImageEntry = {
                oldUrl: oldImageObject.image,
                title: oldImageObject.title,
                file_type: oldImageObject.file_type,
                checksum: oldImageObject.checksum
            }
        } else if (1 === matchEntries.length && oldImageObject.pk !==
            matchEntries[0].pk) {
            imageTranslation = matchEntries[0].pk
        } else if (1 < matchEntries.length) {
            if (!(_.findWhere(matchEntries, {
                pk: oldImageObject.pk
            }))) {
                // There are several matches, and none of the matches have the same id as the key in shrunkImageDB.
                // We now pick the first match.
                // TODO: Figure out if this behavior is correct.
                imageTranslation = matchEntries[0].pk
            }
        }

        if (imageTranslation) {
            return Promise.resolve(imageTranslation)
        } else if (newImageEntry) {
            return this.createNewImage(newImageEntry)
        } else {
            return Promise.resolve(oldImageObject.pk)
        }

    }
    createNewImage(imageEntry) {
        let xhr = new window.XMLHttpRequest()
        xhr.open('GET', imageEntry.oldUrl, true)
        xhr.responseType = 'blob'
        let that = this
        return new Promise((resolve, reject) => {
            xhr.onload = function (e) {
                if (this.status == 200) {
                    // Note: .response instead of .responseText
                    let imageFile = new window.Blob([this.response], {
                        type: imageEntry.file_type
                    })
                    let formValues = new window.FormData()
                    formValues.append('id', 0)
                    formValues.append('title', imageEntry.title)
                    formValues.append('imageCats', '')
                    formValues.append('image', imageFile,
                        imageEntry.oldUrl.split('/').pop())
                    formValues.append('checksum', imageEntry.checksum)
                    // Remove old warning messages
                    jQuery('#uploadimage .warning').detach()
                    that.bookList.imageDB.saveImage(formValues).then(
                        response => {
                            addAlert('success', gettext('The image has been uploaded.'))
                            return resolve(response)
                        },
                        errors => {
                            that.displayCreateImageError(errors)
                            addAlert('error', gettext('Some errors were found. Please examine the form.'))
                        }
                    )
                }
            }
            xhr.send()
        })

    }

    displayCreateImageError(errors) {
        Object.keys(errors).forEach(
            eKey => {
                let eMsg = `<div class="warning">${errors[eKey]}</div>`
                if ('error' == eKey) {
                    jQuery('#uploadimage').prepend(eMsg)
                } else {
                    jQuery(`#id_${eKey}`).after(eMsg)
                }
            }
        )
    }


    createBookDialog(bookId, anImageDB) {
        let dialogHeader, theBook, theOldBook

        if (bookId === 0) {
            dialogHeader = gettext('Create Book')
            theBook = {
                title: '',
                id: 0,
                chapters: [],
                is_owner: true,
                owner_avatar: this.bookList.user.avatar,
                owner_name: this.bookList.user.name,
                owner: this.bookList.user.id,
                rights: 'write',
                metadata: {},
                settings: {
                    citationstyle: defaultCitationStyle,
                    documentstyle: defaultDocumentStyle,
                    papersize: 'octavo'
                }
            }
        } else {
            theOldBook = _.findWhere(this.bookList.bookList, {
                id: bookId
            })
            theBook = jQuery.extend(true, {}, theOldBook)
            dialogHeader = gettext('Edit Book')
        }


        let dialogBody = bookDialogTemplate({
            dialogHeader: dialogHeader,
            basicInfo: bookBasicInfoTemplate({
                theBook: theBook
            }),
            chapters: bookDialogChaptersTemplate({
                theBook: theBook,
                chapters: bookChapterListTemplate({
                    theBook, documentList: this.bookList.documentList
                }),
                documents: bookDocumentListTemplate({
                    theBook,
                    documentList: this.bookList.documentList
                })
            }),
            bibliographyData: bookBibliographyDataTemplate({
                theBook,
                citationDefinitions
            }),
            printData: bookPrintDataTemplate({
                theBook,
                documentStyleList
            }),
            epubData: bookEpubDataTemplate({
                theBook: theBook,

                coverImage: bookEpubDataCoverTemplate({
                    theBook,
                    anImageDB
                })
            })

        })
        let that = this
        jQuery(document).on('click', '.book-sort-up', function () {
            let chapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            })
            let higherChapter = _.findWhere(theBook.chapters, {
                number: (chapter.number - 1)
            })
            chapter.number--
            higherChapter.number++
            jQuery('#book-chapter-list').html(bookChapterListTemplate({
                theBook, documentList: that.bookList.documentList
            }))
        })
        jQuery(document).on('click', '.book-sort-down', function () {
            let chapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            })
            let lowerChapter = _.findWhere(theBook.chapters, {
                number: (chapter.number + 1)
            })
            chapter.number++
            lowerChapter.number--
            jQuery('#book-chapter-list').html(bookChapterListTemplate({
                theBook, documentList: that.bookList.documentList
            }))
        })

        jQuery(document).on('click', '.delete-chapter', function () {
            let thisChapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            })
            _.each(theBook.chapters, chapter => {
                if (chapter.number > thisChapter.number) {
                    chapter.number--
                }
            })
            theBook.chapters = _.filter(
                theBook.chapters,
                chapter => chapter !== thisChapter
            )
            jQuery('#book-chapter-list').html(bookChapterListTemplate({
                theBook, documentList: that.bookList.documentList
            }))
            jQuery('#book-document-list').html(bookDocumentListTemplate({
                documentList: that.bookList.documentList,
                theBook
            }))
        })

        jQuery(document).on('click', '#book-document-list td', function () {
            jQuery(this).toggleClass('checked')
        })

        jQuery(document).on('click', '#add-chapter', () => {
            jQuery('#book-document-list td.checked').each(function () {
                let documentId = parseInt(jQuery(this).attr(
                    'data-id')),
                    lastChapterNumber = _.max(
                        theBook.chapters,
                        chapter => chapter.number
                    ).number
                if (isNaN(lastChapterNumber)) {
                    lastChapterNumber = 0
                }
                theBook.chapters.push({
                    text: documentId,
                    title: jQuery.trim(this.textContent),
                    number: lastChapterNumber + 1,
                    part: ''
                })
            })
            jQuery('#book-chapter-list').html(bookChapterListTemplate({
                theBook,
                documentList: this.bookList.documentList
            }))
            jQuery('#book-document-list').html(bookDocumentListTemplate({
                documentList: this.bookList.documentList,
                theBook
            }))
        })

        jQuery(document).on('click', '.edit-chapter', function () {
            let thisChapter = _.findWhere(theBook.chapters, {
                text: parseInt(jQuery(this).attr('data-id'))
            })
            that.editChapterDialog(thisChapter, theBook)
        })


        jQuery(document).on('click', '#select-cover-image-button', () => {
            let imageSelection = new ImageSelectionDialog(
                anImageDB,
                theBook.cover_image,
                theBook.owner)

            imageSelection.init().then(
                imageId => {
                    if (!imageId) {
                        delete theBook.cover_image
                    } else {
                        theBook.cover_image = imageId
                    }
                    jQuery('#figure-preview-row').html(bookEpubDataCoverTemplate({
                        anImageDB,
                        theBook
                    }))
                }
            )
        })

        jQuery(document).on('click', '#remove-cover-image-button', () => {
            delete theBook.cover_image
            jQuery('#figure-preview-row').html(bookEpubDataCoverTemplate({
                theBook
            }))
        })

        function getFormData() {
            theBook.title = jQuery('#book-title').val()
            theBook.metadata.author = jQuery('#book-metadata-author').val()
            theBook.metadata.subtitle = jQuery('#book-metadata-subtitle').val()
            theBook.metadata.copyright = jQuery('#book-metadata-copyright')
                .val()
            theBook.metadata.publisher = jQuery('#book-metadata-publisher')
                .val()
            theBook.metadata.keywords = jQuery('#book-metadata-keywords').val()
        }

        jQuery('body').append(dialogBody)

        jQuery('#book-settings-citationstyle').dropkick({
            change: (value, label) => {
                theBook.settings.citationstyle = value
            }
        })

        jQuery('#book-settings-documentstyle').dropkick({
            change: (value, label) => {
                theBook.settings.documentstyle = value
            }
        })

        jQuery('#book-settings-papersize').dropkick({
            change: (value, label) => {
                theBook.settings.papersize = value
            }
        })
        let diaButtons = {}
        if (theBook.rights === 'write') {
            diaButtons[gettext('Submit')] = function () {
                getFormData()
                that.saveBook(theBook, theOldBook, this)

            }
            diaButtons[gettext('Cancel')] = function () {
                jQuery(this).dialog("close")
            }
        } else {
            diaButtons[gettext('Close')] = function () {
                jQuery(this).dialog("close")
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
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            },
            close: () => {
                jQuery(document).off('click', '#add-chapter')
                jQuery(document).off('click', '.book-sort-up')
                jQuery(document).off('click', '.book-sort-down')
                jQuery(document).off('click', '#add-chapter')
                jQuery(document).off('click', '#book-document-list td')
                jQuery(document).off('click', '.delete-chapter')
                jQuery(document).off('click', '.edit-chapter')
                jQuery(document).off('click',
                    '#select-cover-image-button')
                jQuery(document).off('click',
                    '#remove-cover-image-button')
                jQuery('#book-dialog').dialog('destroy').remove()
            }
        })

        jQuery('#bookoptionsTab').tabs()
    }
}

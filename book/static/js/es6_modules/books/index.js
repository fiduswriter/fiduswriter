import {HTMLBookExporter} from "./exporter/html"
import {LatexBookExporter} from "./exporter/latex"
import {EpubBookExporter} from "./exporter/epub"
import {BookActions} from "./actions"
import {BookAccessRightsDialog} from "./accessrights"
import {bookListTemplate} from "./templates"
import {ImageDB} from "../images/database"
import {addDropdownBox, addAlert} from "../common"
import {Menu} from "../menu"

export class BookList {
    // A class that contains everything that happens on the books page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor() {
        this.mod = {}
        this.bookList = []
        this.documentList = []
        this.teamMembers = []
        this.accessRights = []
        this.user = {}
        new BookActions(this)
        new Menu("books")
        this.bindEvents()
    }

    getImageDB() {
        if (!this.imageDB) {
            let imageGetter = new ImageDB(this.user.id)
            return new Promise((resolve, reject) => {
                imageGetter.getDB().then(
                    () => {
                        this.imageDB = imageGetter
                        resolve()
                    }
                )
            })
        } else {
            return Promise.resolve()
        }
    }

    getAnImageDB(userId){
        let imageGetter = new ImageDB(userId)
        return new Promise(resolve => {
            imageGetter.getDB().then(() => {
                resolve(imageGetter)
            })
        })
    }

    bindEvents() {
        jQuery(document).ready(() => {
            this.mod.actions.getBookListData()
        })

        jQuery(document).bind('bookDataLoaded', () => {
            jQuery('#book-table tbody').html(
                bookListTemplate({bookList: this.bookList, user: this.user})
            )
            this.mod.actions.startBookTable()
        })

        let that = this
        jQuery(document).ready(function () {
            jQuery(document).on('click', '.delete-book', function () {
                let BookId = jQuery(this).attr('data-id')
                that.mod.actions.deleteBookDialog([BookId])
            })

            jQuery(document).on('click', '.owned-by-user .rights', function () {
                let BookId = parseInt(jQuery(this).attr('data-id'))
                let accessDialog = new BookAccessRightsDialog(
                    [BookId],
                    that.teamMembers,
                    that.accessRights
                )
                accessDialog.init().then(
                    accessRights => {
                        that.accessRights = accessRights
                    }
                )
            })

            //select all entries
            jQuery('#select-all-entry').bind('change', function () {
                let newBool = false
                if (jQuery(this).prop("checked"))
                    newBool = true
                jQuery('.entry-select').not(':disabled').each(function () {
                    this.checked = newBool
                })
            })

            //open dropdown for selecting action
            addDropdownBox(jQuery('#select-action-dropdown-books'), jQuery(
                '#action-selection-pulldown-books'))

            //submit action for selected document
            jQuery('#action-selection-pulldown-books li > span').bind('mousedown',
                function () {
                    let actionName = jQuery(this).attr('data-action'),
                        ids = []
                    if ('' === actionName || 'undefined' == typeof (actionName))
                        return
                    jQuery('.entry-select:checked').not(':disabled').each(function () {
                        if (that.user.id != jQuery(this).attr('data-owner') && (
                            actionName === 'delete' || actionName ===
                            'share')) {
                            let theTitle = jQuery(this).parent().parent().parent()
                                .find(
                                    '.book-title').text()
                            theTitle = jQuery.trim(theTitle).replace(/[\t\n]/g, '')
                            addAlert('error', gettext(
                                'You cannot delete or share: ') + theTitle)
                            //return true
                        } else {
                            ids[ids.length] = parseInt(jQuery(this).attr(
                                'data-id'))
                        }
                    })
                    if (0 === ids.length)
                        return
                    switch (actionName) {
                    case 'delete':
                        that.mod.actions.deleteBookDialog(ids)
                        break
                    case 'share':
                        let accessDialog = new BookAccessRightsDialog(
                            ids,
                            that.teamMembers,
                            that.accessRights
                        )
                        accessDialog.init().then((accessRights) => {
                            that.accessRights = accessRights
                        })
                        break
                    case 'epub':
                        for (let i = 0; i < ids.length; i++) {
                            let aBook = _.findWhere(
                                that.bookList, {
                                    id: ids[i]
                                })
                            addAlert('info', aBook.title + ': ' + gettext(
                                'Epub export has been initiated.'))
                            new EpubBookExporter(aBook, that.user, that.documentList)
                        }
                        break
                    case 'latex':
                        for (let i = 0; i < ids.length; i++) {
                            let aBook = _.findWhere(
                                that.bookList, {
                                    id: ids[i]
                                })
                            addAlert('info', aBook.title + ': ' + gettext(
                                'Latex export has been initiated.'))
                            new LatexBookExporter(aBook, that.user, that.documentList)
                        }
                        break
                    case 'html':
                        for (let i = 0; i < ids.length; i++) {
                            let aBook = _.findWhere(
                                that.bookList, {
                                    id: ids[i]
                                })
                            addAlert('info', aBook.title + ': ' + gettext(
                                'HTML export has been initiated.'))
                            new HTMLBookExporter(aBook, that.user, that.documentList)
                        }
                        break
                    case 'copy':
                        for (let i = 0; i < ids.length; i++) {
                            that.mod.actions.copyBook(_.findWhere(
                                that.bookList, {
                                    id: ids[i]
                                }))
                        }
                        break
                    case 'print':
                        for (let i = 0; i < ids.length; i++) {
                            window.open('/book/print/'+_.findWhere(
                                that.bookList, {
                                    id: ids[i]
                                }).id+'/')
                        }
                        break
                    }

                })

            jQuery('.create-new-book').bind('click', () => {
                that.getImageDB().then(() => {
                    that.mod.actions.createBookDialog(0, that.imageDB)
                })
            })

            jQuery(document).on('click', '.book-title', function () {
                let bookId = parseInt(jQuery(this).attr('data-id'))
                let book = _.findWhere(that.bookList,{id: bookId})
                if (book.is_owner) {
                    that.getImageDB().then(() => {
                        that.mod.actions.createBookDialog(bookId, that.imageDB)
                    })
                } else {
                    that.getAnImageDB(book.owner).then(anImageDB => {
                        that.mod.actions.createBookDialog(bookId, anImageDB)
                    })

                }

            })
        })
    }
}

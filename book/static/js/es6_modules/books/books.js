import {downloadHtml} from "./exporter/html"
import {downloadLatex} from "./exporter/latex"
import {downloadEpub} from "./exporter/epub"
import {deleteBookDialog, createBookDialog, copyBook, getBookListData, startBookTable} from "./actions"
import {createAccessRightsDialog} from "./accessrights/dialog"
import {bookListTemplate, bookBibliographyDataTemplate} from "./templates"


export class Books {
    // A class that contains everything that happens on the books page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor() {
        this.bindEvents()
    }

    bindEvents() {
        window.theBookList = undefined
        window.theDocumentList = undefined
        window.theTeamMembers = undefined
        window.theAccessRights = undefined
        window.theUser = undefined
        jQuery(document).ready(function () {
            getBookListData()
        })

        jQuery(document).bind('bookDataLoaded', function () {
            jQuery('#book-table tbody').html(bookListTemplate())
            startBookTable()
        })


        jQuery(document).ready(function () {
            jQuery(document).on('click', '.delete-book', function () {
                let BookId = jQuery(this).attr('data-id')
                deleteBookDialog([BookId])
            })

            jQuery(document).on('click', '.owned-by-user .rights', function () {
                let BookId = parseInt(jQuery(this).attr('data-id'))
                createAccessRightsDialog([BookId])
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
            $.addDropdownBox(jQuery('#select-action-dropdown-books'), jQuery(
                '#action-selection-pulldown-books'))

            //submit action for selected document
            jQuery('#action-selection-pulldown-books li > span').bind('mousedown',
                function () {
                    let actionName = jQuery(this).attr('data-action'),
                        ids = [],
                        aBook
                    if ('' == actionName || 'undefined' == typeof (actionName))
                        return
                    jQuery('.entry-select:checked').not(':disabled').each(function () {
                        if (theUser.id != jQuery(this).attr('data-owner') && (
                            actionName === 'delete' || actionName ===
                            'share')) {
                            let theTitle = jQuery(this).parent().parent().parent()
                                .find(
                                    '.book-title').text()
                            theTitle = $.trim(the_title).replace(/[\t\n]/g, '')
                            $.addAlert('error', gettext(
                                'You cannot delete or share: ') + theTitle)
                            //return true
                        } else {
                            ids[ids.length] = parseInt(jQuery(this).attr(
                                'data-id'))
                        }
                    })
                    if (0 == ids.length)
                        return
                    switch (actionName) {
                    case 'delete':
                        deleteBookDialog(ids)
                        break
                    case 'share':
                        bookaccessrightsHelpers.createAccessRightsDialog(ids)
                        break
                    case 'epub':
                        for (let i = 0; i < ids.length; i++) {
                            aBook = _.findWhere(
                                theBookList, {
                                    id: ids[i]
                                })
                            $.addAlert('info', aBook.title + ': ' + gettext(
                                'Epub export has been initiated.'))
                            downloadEpub(aBook)
                        }
                        break
                    case 'latex':
                        for (let i = 0; i < ids.length; i++) {
                            aBook = _.findWhere(
                                theBookList, {
                                    id: ids[i]
                                })
                            $.addAlert('info', aBook.title + ': ' + gettext(
                                'Latex export has been initiated.'))
                            downloadLatex(aBook)
                        }
                        break
                    case 'html':
                        for (let i = 0; i < ids.length; i++) {
                            aBook = _.findWhere(
                                theBookList, {
                                    id: ids[i]
                                })
                            $.addAlert('info', aBook.title + ': ' + gettext(
                                'HTML export has been initiated.'))
                            downloadHtml(aBook)
                        }
                        break
                    case 'copy':
                        for (let i = 0; i < ids.length; i++) {
                            copyBook(_.findWhere(
                                theBookList, {
                                    id: ids[i]
                                }))
                        }
                        break
                    case 'print':
                        for (let i = 0; i < ids.length; i++) {
                            window.open('/book/print/'+_.findWhere(
                                theBookList, {
                                    id: ids[i]
                                }).id+'/')
                        }
                        break
                    }

                })

            jQuery('.create-new-book').bind('click', function () {
                createBookDialog(0)
            })

            jQuery(document).on('click', '.book-title', function () {
                let bookId = parseInt(jQuery(this).attr('data-id'))
                createBookDialog(bookId)
            })
        })
    }
}

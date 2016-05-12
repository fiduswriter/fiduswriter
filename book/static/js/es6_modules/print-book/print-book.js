import {bookPrintStartTemplate, bookPrintTemplate} from "./templates"
import {obj2Node} from "../exporter/json"
import {FormatCitations} from "../citations/format"
import {BibliographyDB} from "../bibliography/database"
/**
* Helper functions for the book print page.
*/

export class PrintBook {
    // A class that contains everything that happens on the book print page.
    // It is currently not possible to initialize more thna one editor class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor() {
        this.pageSizes = {
            folio: {
                width:12,
                height:15
            },
            quarto: {
                width:9.5,
                height:12
            },
            octavo: {
                width:6,
                height:9
            },
            a5: {
                width:5.83,
                height:8.27
            },
            a4: {
                width:8.27,
                height:11.69
            }
        }
        this.documentOwners = []
        this.bindEvents()
    }

    setTheBook(aBook) {
        let that = this

        aBook.settings = JSON.parse(aBook.settings)
        aBook.metadata = JSON.parse(aBook.metadata)
        for (let i = 0; i < aBook.chapters.length; i++) {
            aBook.chapters[i].metadata = JSON.parse(aBook.chapters[
                i].metadata)
            aBook.chapters[i].settings = JSON.parse(aBook.chapters[
                i].settings)
            if (this.documentOwners.indexOf(aBook.chapters[i].owner)===-1) {
                this.documentOwners.push(aBook.chapters[i].owner)
            }
        }
        this.theBook = aBook
        this.setDocumentStyle(this.theBook.settings.documentstyle)

        paginationConfig['pageHeight'] = this.pageSizes[this.theBook.settings.papersize].height
        paginationConfig['pageWidth'] = this.pageSizes[this.theBook.settings.papersize].width

        let bibGetter = new BibliographyDB(this.documentOwners.join(','), false, false, false)

        bibGetter.getBibDB(function (bibPks, bibCats) {
                that.bibDB = bibGetter.bibDB
                that.fillPrintPage()
            })


    }

    modelToViewNode(node) {
        // TODO: add needed changes
        return node
    }

        /* TODO: IS this still useful? Should it be part of the modeltoViewNode?
        createFootnoteView = function (htmlFragment, number) {
            let fn = document.createElement('span'), id
            fn.classList.add('pagination-footnote')

            fn.appendChild(document.createElement('span'))
            fn.firstChild.appendChild(document.createElement('span'))
            fn.firstChild.firstChild.appendChild(htmlFragment)

            if (typeof number === 'undefined') {
                number = document.getElementById('flow').querySelectorAll('.pagination-footnote').length

                while (document.getElementById('pagination-footnote-'+number)) {
                    number++
                }
            }

            fn.id = 'pagination-footnote-'+ number
            return fn
        }*/

    getBookData(id) {
        let that = this
        $.ajax({
            url: '/book/book/',
            data: {
                'id': id
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                that.setTheBook(response.book)
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    fillPrintPage() {
        let bibliography = jQuery('#bibliography')
        jQuery(document.body).addClass(this.theBook.settings.documentstyle)
        jQuery('#book')[0].outerHTML = bookPrintTemplate({
            theBook: this.theBook,
            modelToViewNode: this.modelToViewNode,
            obj2Node
        })
        
        let citationFormatter = new FormatCitations(document.body, this.theBook.settings.citationstyle, this.bibDB)
        jQuery(bibliography).html(citationFormatter.bibliographyHTML)

        if (jQuery(bibliography).text().trim().length===0) {
            jQuery(bibliography).parent().remove()
        }

        paginationConfig['frontmatterContents'] = bookPrintStartTemplate({theBook: this.theBook})


        // TODO: render equations
        pagination.initiate()
        pagination.applyBookLayout()
        jQuery("#pagination-contents").addClass('user-contents')
        jQuery('head title').html(jQuery('#document-title').text())


    }

    setDocumentStyle() {
        let theValue = this.theBook.settings.documentstyle
        let documentStyleLink = document.getElementById('document-style-link'),
            newDocumentStyleLink = document.createElement('link')
        newDocumentStyleLink.setAttribute("rel", "stylesheet")
        newDocumentStyleLink.setAttribute("type", "text/css")
        newDocumentStyleLink.setAttribute("id", "document-style-link")
        newDocumentStyleLink.setAttribute("href", staticUrl+'css/document/'+theValue+'.css')

        documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink)
    }


    bindEvents() {
        let that = this
        jQuery(document).ready(function () {
            let pathnameParts = window.location.pathname.split('/'),
                bookId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10)

            that.getBookData(bookId)
        })
    }
}

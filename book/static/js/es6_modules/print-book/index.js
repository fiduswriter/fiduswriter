import {bookPrintStartTemplate, bookPrintTemplate} from "./templates"
import {docSchema} from "../schema/document"
import {RenderCitations} from "../citations/render"
import {BibliographyDB} from "../bibliography/database"
import {deactivateWait, addAlert, csrfToken} from "../common"
import {PaginateForPrint} from "paginate-for-print/dist/paginate-for-print"
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
        this.printConfig = {
            flowFromElement : document.getElementById('flow'),
            enableFrontmatter : true,
            sectionStartSelector: 'div.part',
            sectionTitleSelector: 'h1',
            chapterStartSelector: 'div.chapter',
            chapterTitleSelector: 'h1',
            alwaysEven: true,
            autoStart: false,
            topfloatSelector: 'figure',
            contentsBottomMargin: 1
        }

        this.bindEvents()
    }

    setTheBook(aBook) {
        aBook.settings = JSON.parse(aBook.settings)
        aBook.metadata = JSON.parse(aBook.metadata)
        for (let i = 0; i < aBook.chapters.length; i++) {
            aBook.chapters[i].metadata = JSON.parse(aBook.chapters[
                i].metadata)
            aBook.chapters[i].settings = JSON.parse(aBook.chapters[
                i].settings)
            aBook.chapters[i].contents = JSON.parse(aBook.chapters[
                i].contents)
            if (this.documentOwners.indexOf(aBook.chapters[i].owner)===-1) {
                this.documentOwners.push(aBook.chapters[i].owner)
            }
        }
        this.theBook = aBook
        this.setDocumentStyle(this.theBook.settings.documentstyle)

        this.printConfig['pageHeight'] = this.pageSizes[this.theBook.settings.papersize].height
        this.printConfig['pageWidth'] = this.pageSizes[this.theBook.settings.papersize].width

        this.bibDB = new BibliographyDB(this.documentOwners.join(','))

        this.bibDB.getDB().then(() => this.fillPrintPage())

    }

    getBookData(id) {
        jQuery.ajax({
            url: '/book/book/',
            data: {id},
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: (response, textStatus, jqXHR) =>
                this.setTheBook(response.book),
            error: (jqXHR, textStatus, errorThrown) =>
                addAlert('error', jqXHR.responseText),
            complete: () => deactivateWait()
        })
    }

    fillPrintPage() {
        jQuery(document.body).addClass(this.theBook.settings.documentstyle)
        jQuery('#book')[0].outerHTML = bookPrintTemplate({
            theBook: this.theBook,
            docSchema
        })

        this.citRenderer = new RenderCitations(
            document.body,
            this.theBook.settings.citationstyle,
            this.bibDB,
            true
        )
        this.citRenderer.init().then(
            () => this.fillPrintPageTwo()
        )
    }

    fillPrintPageTwo() {
        let bibliography = jQuery('#bibliography')
        jQuery(bibliography).html(this.citRenderer.fm.bibHTML)

        if (jQuery(bibliography).text().trim().length===0) {
            jQuery(bibliography).parent().remove()
        }

        // Move the bibliography header text into the HTML, to prevent it getting mangled by the pagination process.
        let bibliographyHeader = document.querySelector('.article-bibliography-header')
        if (bibliographyHeader) {
            let bibliographyHeaderText = window.getComputedStyle(bibliographyHeader, ':before').getPropertyValue('content').replace(/"/g, '')
            bibliographyHeader.innerHTML = bibliographyHeaderText
            bibliographyHeader.classList.remove('article-bibliography-header')
        }


        this.printConfig['frontmatterContents'] = bookPrintStartTemplate({theBook: this.theBook})


        let paginator = new PaginateForPrint(this.printConfig)
        paginator.initiate()
        jQuery("#pagination-contents").addClass('user-contents')
        jQuery('head title').html(jQuery('.article-title').text())


    }

    setDocumentStyle() {
        let theValue = this.theBook.settings.documentstyle
        let documentStyleLink = document.getElementById('document-style-link'),
            newDocumentStyleLink = document.createElement('link')
        newDocumentStyleLink.setAttribute("rel", "stylesheet")
        newDocumentStyleLink.setAttribute("type", "text/css")
        newDocumentStyleLink.setAttribute("id", "document-style-link")
        newDocumentStyleLink.setAttribute("href", window.staticUrl+'css/document/'+theValue+'.css')

        documentStyleLink.parentElement.replaceChild(newDocumentStyleLink, documentStyleLink)
    }


    bindEvents() {
        jQuery(document).ready(() => {
            let pathnameParts = window.location.pathname.split('/'),
                bookId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10)

            this.getBookData(bookId)
        })
    }
}

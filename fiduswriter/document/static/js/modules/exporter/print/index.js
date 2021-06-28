import {PAPER_SIZES} from "../../schema/const"
import {HTMLExporter} from "../html"
import {addAlert, shortFileTitle} from "../../common"
import {removeHidden} from "../tools/doc_content"
import {printHTML} from "@vivliostyle/print"

export class PrintExporter extends HTMLExporter {

    constructor(schema, csl, documentStyles, doc, bibDB, imageDB) {
        super(schema, csl, documentStyles, doc, bibDB, imageDB)
        this.styleSheets.push({contents:
            `a.fn {
                -adapt-template: url(data:application/xml,${
    encodeURI(
        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:s="http://www.pyroxy.com/ns/shadow"><head><style>.footnote-content{float:footnote}</style></head><body><s:template id="footnote"><s:content/><s:include class="footnote-content"/></s:template></body></html>#footnote'
    )
});
                text-decoration: none;
                color: inherit;
                vertical-align: baseline;
                font-size: 70%;
                position: relative;
                top: -0.3em;

            }
            body, section[role=doc-footnotes] {
                counter-reset: cat-figure cat-equation cat-photo cat-table footnote-counter footnote-marker-counter;
            }
            section[role=doc-footnote] > *:first-child:before {
                counter-increment: footnote-counter;
                content: counter(footnote-counter) ". ";
            }
            section[role=doc-footnote] figure[data-category='figure'] caption label::after {
                content: ' ' counter(cat-figure) 'A';
            }
            section[role=doc-footnote] figure[data-category='equation']::after {
                content: ' ' counter(cat-equation) 'A';
            }
            section[role=doc-footnote] figure[data-category='photo']::after {
                content: ' ' counter(cat-photo) 'A';
            }
            section[role=doc-footnote] figure[data-category='table']::after {
                content: ' ' counter(cat-table) 'A';
            }
            section.fnlist {
                display: none;
            }
            section:footnote-content {
                display: block;
                font-style:normal;
                font-weight:normal;
                text-decoration:none;
            }
            .table-of-contents a {
            	display: inline-flex;
            	width: 100%;
            	text-decoration: none;
            	color: currentColor;
            	break-inside: avoid;
            	align-items: baseline;
            }
            .table-of-contents a::before {
            	margin-left: 1px;
            	margin-right: 1px;
            	border-bottom: solid 1px lightgray;
            	content: "";
            	order: 1;
            	flex: auto;
            }
            .table-of-contents a::after {
            	text-align: right;
            	content: target-counter(attr(href, url), page);
            	align-self: flex-end;
            	flex: none;
            	order: 2;
            }
            body {
                background-color: white;
            }
            @page {
                size: ${PAPER_SIZES.find(size => size[0] === this.doc.settings.papersize)[1]};
                @top-center {
                    content: env(doc-title);
                }
                @bottom-center {
                    content: counter(page);
                }
            }`
        })
    }

    init() {
        addAlert('info', `${shortFileTitle(this.doc.title, this.doc.path)}: ${gettext('Printing has been initiated.')}`)
        this.docContent = removeHidden(this.doc.content, false)
        this.addDocStyle(this.doc)

        return this.loadStyles().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.fillToc()
        ).then(
            () => this.postProcess()
        ).then(
            ({html, title}) => {
                const config = {title}

                if (navigator.userAgent.includes('Gecko/')) {
                    // Firefox has issues printing images when in iframe. This workaround can be
                    // removed once that has been fixed. TODO: Add gecko bug number if there is one.
                    config.printCallback = iframeWin => {
                        const oldBody = document.body
                        document.body.parentElement.dataset.vivliostylePaginated = true
                        document.body = iframeWin.document.body
                        document.body.querySelectorAll('figure, table').forEach(el => delete el.dataset.category)
                        iframeWin.document.querySelectorAll('style').forEach(el => document.body.appendChild(el))
                        const backgroundStyle = document.createElement('style')
                        backgroundStyle.innerHTML = 'body {background-color: white;}'
                        document.body.appendChild(backgroundStyle)
                        window.print()
                        document.body = oldBody
                        delete document.body.parentElement.dataset.vivliostylePaginated
                    }
                }
                return printHTML(
                    html,
                    config
                )
            }
        )
    }

    addDocStyle(doc) {
        // Override the default as we need to use the original URLs in print.
        const docStyle = this.documentStyles.find(docStyle => docStyle.slug === doc.settings.documentstyle)

        if (!docStyle) {
            return
        }
        let contents = docStyle.contents
        docStyle.documentstylefile_set.forEach(
            ([url, filename]) => contents = contents.replace(
                new RegExp(filename, 'g'),
                url
            )
        )
        this.styleSheets.push({contents})
    }

    loadStyles() {
        this.styleSheets.forEach(sheet => {
            if (sheet.url) {
                sheet.filename = sheet.url
                delete sheet.url
            }
        })

        return Promise.resolve()
    }

    addMathliveStylesheet() {
        this.styleSheets.push({url: `${settings_STATIC_URL}css/libs/mathlive/mathlive.css?v=${transpile_VERSION}`})
    }

    getFootnoteAnchor(counter) {
        const footnoteAnchor = super.getFootnoteAnchor(counter)
        // Add the counter directly into the footnote.
        footnoteAnchor.innerHTML = counter
        return footnoteAnchor
    }

    prepareBinaryFiles() {
        // Not needed for print
    }
}

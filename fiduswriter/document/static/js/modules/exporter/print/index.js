import {PAPER_SIZES} from "../../schema/const"
import {HTMLExporter} from "../html"
import {addAlert} from "../../common"
import {removeHidden} from "../tools/doc_contents"
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
                counter-reset: figure-cat-0 figure-cat-1 figure-cat-2 footnote-counter footnote-marker-counter;
            }
            section[role=doc-footnote] > *:first-child:before {
                counter-increment: footnote-counter;
                content: counter(footnote-counter) ". ";
            }
            section[role=doc-footnote] .figure-cat-figure::after {
                content: ' ' counter(figure-cat-0) 'A';
            }
            section[role=doc-footnote] .figure-cat-photo::after {
                content: ' ' counter(figure-cat-1) 'A';
            }
            section[role=doc-footnote] .figure-cat-table::after {
                content: ' ' counter(figure-cat-2) 'A';
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
        addAlert('info', `${this.doc.title}: ${gettext('Printing has been initiated.')}`)
        this.docContents = removeHidden(this.doc.contents, false)
        this.addDocStyle(this.doc)

        return this.loadStyles().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.fillToc()
        ).then(
            () => this.postProcess()
        ).then(
            ({html, title}) => {
                return printHTML(
                    html,
                    {title}
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

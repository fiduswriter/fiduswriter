import {vivliostylePrint} from "vivliostyle-print"

import {PAPER_SIZES} from "../../schema/const"
import {HTMLExporter} from "../html"
import {addAlert} from "../../common"
import {removeHidden} from "../tools/doc_contents"

export class PrintExporter extends HTMLExporter {

    constructor(schema, doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles, staticUrl) {
        super(schema, doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles, staticUrl)
        this.staticUrl = staticUrl
        this.removeUrlPrefix = false
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
            section[role=doc-footnote] > *:first-child:before {
                counter-increment: footnote-counter;
                content: counter(footnote-counter) ". ";
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
        return this.addStyle().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.fillToc()
        ).then(
            () => this.postProcess()
        ).then(
            ({html, title}) => vivliostylePrint(
                html,
                {
                    title,
                    resourcesUrl: `${this.staticUrl}vivliostyle-resources/`
                }
            )
        )
    }

    getFootnoteAnchor(counter) {
        const footnoteAnchor = super.getFootnoteAnchor(counter)
        // Add the counter directly into the footnote.
        footnoteAnchor.innerHTML = counter
        return footnoteAnchor
    }
}

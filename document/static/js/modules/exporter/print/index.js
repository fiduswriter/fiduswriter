import {vivliostylePrint} from "vivliostyle-print"

import {PAPER_SIZES} from "../../schema/const"
import {HTMLExporter} from "../html"
import {addAlert} from "../../common"

export class PrintExporter extends HTMLExporter {

    constructor(doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles, staticUrl) {
        super(doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles, staticUrl)
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
                vertical-align: super;
                font-size: 70%;
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
            }
            @page {
                size: ${PAPER_SIZES.find(size => size[0] === this.doc.settings.papersize)[1]};
                @bottom-center {
                    content: counter(page);
                }
            }`
        })
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('Printing has been initiated.')}`)
        return this.addStyle().then(
            () => this.joinDocumentParts()
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

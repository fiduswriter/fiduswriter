import {viewer} from "vivliostyle"

import {HTMLExporter} from "../html"
import {addAlert} from "../../common"

const CSS_PAPER_SIZES = {
    'A4': 'A4',
    'US Letter': 'letter'
}

export class PrintExporter extends HTMLExporter {

    constructor(doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles) {
        super(doc, bibDB, imageDB, citationStyles, citationLocales, documentStyles)
        this.removeUrlPrefix = false
        this.styleSheets.push({contents:
            `:root {
                counter-reset: footnote footnote-content;
            }
            a.fn {
                -adapt-template: url(data:application/xml,${
                    encodeURI(
                        '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:s="http://www.pyroxy.com/ns/shadow"><head><style>.footnote-content{float:footnote}</style></head><body><s:template id="footnote"><s:content/><s:include class="footnote-content"/></s:template></body></html>#footnote'
                    )
                });
                text-decoration: none;
                color: inherit;
                content: counter(footnote);
            }
            a.fn::footnote-marker {
                vertical-align: super;
                font-size: 70%;
                counter-increment: footnote;
                content: counter(footnote);
            }
            section[role=doc-ffootnote]:footnote-content::before {
                counter-increment: footnote-content;
                content: counter(footnote-content) ". ";
            }
            sectdion[role=doc-footnote] {
                display: none;
            }
            section:footnote-content {
                display: block;
            }
            @page {
                size: ${CSS_PAPER_SIZES[this.doc.settings.papersize]};
                @bottom-center {
                    content: counter(page);
                }
            }`
        })
        this.disabledStyles = []
        this.hiddenElements = []
    }

    init() {
        addAlert('info', `${this.doc.title}: ${gettext('Printing has been initiated.')}`)

        return this.addStyle().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.postProcess()
        ).then(
            ({html}) => this.preparePrint(html)
        ).then(
            () => this.fixPreparePrint()
        ).then(
            () => this.browserPrint()
        ).then(
            () => this.cleanUp()
        )
    }

    preparePrint(html) {
        this.addFlowTo()
        const docBlob = new Blob([html], {type : 'text/html'}),
            docURL = URL.createObjectURL(docBlob),
            Viewer = new viewer.Viewer(
                {
                    viewportElement: this.flowTo,
                    userAgentRootURL: `${$StaticUrls.base$}vivliostyle-resources/`
                }
            )
        return new Promise(resolve => {
            Viewer.addListener('readystatechange', () => {
                if (Viewer.readyState === 'complete') {
                    resolve()
                }
            })
            Viewer.loadDocument({url: docURL})
        })
    }

    fixPreparePrint() {
        this.flowTo.querySelectorAll('[data-vivliostyle-page-container]').forEach(node => node.style.display = 'block')
    }

    browserPrint() {
        window.print()
    }

    addFlowTo() {
        this.flowTo = document.createElement('div')
        this.flowTo.id = 'print'
        document.body.appendChild(this.flowTo)
        Array.from(document.body.children).forEach(node => {
            if (node !== this.flowTo) {
                node.style.display='none'
                if (node.nodeName==='STYLE') {
                    node.disabled = true
                    this.disabledStyles.push(node)
                } else {
                    this.hiddenElements.push(node)
                }
            }
        })
        Array.from(document.head.children).forEach(node => {
            if (node.nodeName==='STYLE') {
                node.disabled = true
                this.disabledStyles.push(node)
            }
        })
    }

    cleanUp() {
        this.flowTo.parentElement.removeChild(this.flowTo)
        delete this.flowTo
        this.hiddenElements.forEach(node => node.style.display = '')
        this.hiddenElements = []
        this.disabledStyles.forEach(node => node.disabled = false)
        this.disabledStyles = []
    }
}

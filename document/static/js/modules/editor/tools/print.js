import {viewer} from "vivliostyle"

const CSS_PAPER_SIZES = {
    'A4': 'A4',
    'US Letter': 'letter'
}

const printTemplate = ({HTML, styleSheets}) =>
`<!DOCTYPE html>
<html>
    <head>
        ${styleSheets.map(styleSheet => `
            <style>
                ${styleSheet}
            </style>`
        ).join('')}
    </head>
    <body>
        ${HTML}
    </body>
</html>`

export class ModToolsPrint {
    constructor(mod) {
        mod.print = this
        this.mod = mod
        this.paginator = false
        this.hiddenElements = []
        this.disabledStyles = []
        this.initFlowTo()
    }

    initFlowTo() {
        this.flowTo = document.createElement('div')
        this.flowTo.id = 'print'
        document.body.appendChild(this.flowTo)
        this.hideFlowTo()
    }

    showFlowTo() {
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
        this.flowTo.style.display = ''
    }

    hideFlowTo() {
        this.flowTo.style.display = 'none'
        this.flowTo.innerHTML = ''
        this.hiddenElements.forEach(node => node.style.display = '')
        this.hiddenElements = []
        this.disabledStyles.forEach(node => node.disabled = false)
        this.disabledStyles = []
    }

    browserPrint() {
        window.print()
    }

    postPrint() {
        this.hideFlowTo()
    }

    cleanNode(node) {
        if (node.classList.contains('ProseMirror-widget') || node.dataset.hidden==='true') {
            node.parentElement.removeChild(node)
            return
        }
        if (node.id) {
            node.id = node.id + '-print'
        }
        if (node.contentEditable === 'true') {
            node.removeAttribute('contentEditable')
        }
        if (node.children) {
            Array.from(node.children).forEach(childNode => this.cleanNode(childNode))
        }
    }

    print() {

        // This is a quick and dirty way of creating a cloned version of the node.
        // We only do this because it is faster and mathjax would be slow in rendering a second time.

        const flowCopy = document.getElementById('flow').cloneNode(true)

        this.cleanNode(flowCopy)

        const footnoteBox = flowCopy.querySelector('#footnote-box-container-print')
        footnoteBox.parentElement.removeChild(footnoteBox)

        const footnoteMarkers = flowCopy.querySelectorAll('.footnote-marker')
        footnoteMarkers.forEach((fnMarker, index) => {
            const fnLink = document.createElement('a')
            fnLink.classList.add('footnote')
            fnLink.href = `#fn-${index}`
            fnLink.innerHTML = '<span class="fn-counter"></span>'
            fnMarker.parentElement.replaceChild(fnLink, fnMarker)
        })

        const footnotes = footnoteBox.querySelectorAll('.footnote-container')
        footnotes.forEach((footnote, index) => {
            footnote.id = `fn-${index}`
            footnote.classList.add('footnote-block')
            footnote.classList.remove('footnote-container')
            if (footnote.firstElementChild.nodeName === 'P') {
                footnote.firstElementChild.insertAdjacentHTML('afterbegin', '<span class="fn-content-counter"></span>')
            } else {
                footnote.insertAdjacentHTML('afterbegin', '<span class="fn-content-counter"></span>')
            }
            flowCopy.appendChild(footnote)
        })

        const footnoteCitationMarkers = flowCopy.querySelectorAll('.citation-footnote-marker')
        footnoteCitationMarkers.forEach((fnMarker, index) => {
            const fnLink = document.createElement('a')
            fnLink.classList.add('footnote')
            fnLink.href = `#fn-cit-${index}`
            fnLink.innerHTML = '<span class="fn-counter"></span>'
            fnMarker.parentElement.replaceChild(fnLink, fnMarker)
        })

        const footnoteCitations = footnoteBox.querySelectorAll('.footnote-citation')
        footnoteCitations.forEach((footnote, index) => {
            footnote.id = `fn-cit-${index}`
            footnote.classList.add('footnote-block')
            footnote.classList.remove('footnote-citation')
            if (footnote.firstElementChild.nodeName === 'P') {
                footnote.firstElementChild.insertAdjacentHTML('afterbegin', '<span class="fn-content-counter"></span>')
            } else {
                footnote.insertAdjacentHTML('afterbegin', '<span class="fn-content-counter"></span>')
            }
            flowCopy.appendChild(footnote)
        })

        const styleSheets = [
            `:root {
                counter-reset: footnote footnote-content;
            }
            .footnote {
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
            .fn-counter::before {
                counter-increment: footnote;
                content: counter(footnote);
            }
            .fn-content-counter::before {
                counter-increment: footnote-content;
                content: counter(footnote-content) ". ";
            }
            .footnote-block {
                display: none;
            }
            .footnote-block:footnote-content {
                display: block;
            }
            @page {
                size: ${CSS_PAPER_SIZES[this.mod.editor.view.state.doc.firstChild.attrs.papersize]};
                @bottom-center {
                    content: counter(page);
                }
            }`,
            document.getElementById('document-style') ? document.getElementById('document-style').innerHTML : ''
        ]

        this.showFlowTo()

        const docHTML = printTemplate({styleSheets, HTML: flowCopy.outerHTML}),
            docBlob = new Blob([docHTML], {type : 'text/html'}),
            docURL = URL.createObjectURL(docBlob),
            Viewer = new viewer.Viewer(
                {
                    viewportElement: this.flowTo,
                    userAgentRootURL: `${$StaticUrls.base$}vivliostyle-resources/`
                }
            )

        Viewer.addListener('readystatechange', () => {
            if (Viewer.readyState === 'complete') {
                this.postProcess()
                this.browserPrint()
                this.postPrint()
            }
        })

        Viewer.loadDocument({url: docURL})

    }

    postProcess() {
        this.flowTo.querySelectorAll('[data-vivliostyle-page-container]').forEach(node => node.style.display = 'block')
    }

}

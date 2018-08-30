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
        this.initFlowTo()
        window.viewer = viewer
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
                this.hiddenElements.push(node)
            }
        })
        this.flowTo.style.display = ''
    }

    hideFlowTo() {
        this.flowTo.style.display = 'none'
        this.flowTo.innerHTML = ''
        this.hiddenElements.forEach(node => node.style.display = '')
        this.hiddenElements = []
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

        const footnotes = footnoteBox.querySelectorAll('.footnote-container')
        const footnoteMarkers = flowCopy.querySelectorAll('.footnote-marker')

        footnoteMarkers.forEach((fnMarker, index) => {
            while (fnMarker.firstChild) {
                fnMarker.removeChild(fnMarker.firstChild)
            }

            while (footnotes[index].firstChild) {
                fnMarker.appendChild(footnotes[index].firstChild)
            }
            fnMarker.innerHTML = 'footnote'
        })
        const footnoteCitations = footnoteBox.querySelectorAll('.footnote-citation')
        const footnoteCitationMarkers = flowCopy.querySelectorAll('.citation-footnote-marker')

        footnoteCitationMarkers.forEach((fnCitationMarker, index) => {
            const fnCitation = footnoteCitations[index]
            fnCitation.classList.remove('footnote-citation')
            fnCitationMarker.appendChild(fnCitation)
            fnCitationMarker.classList.remove('citation-footnote-marker')
            fnCitationMarker.classList.add('footnote-marker')
        })

        const styleSheets = [
            '.footnote-marker {float: footnote;}',
            document.getElementById('document-style') ? document.getElementById('document-style').innerHTML : '',
            `@page {size: ${CSS_PAPER_SIZES[this.mod.editor.view.state.doc.firstChild.attrs.papersize]};}`
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

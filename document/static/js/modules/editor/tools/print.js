import {PaginateForPrint} from "paginate-for-print/dist/paginate-for-print"

const PAPER_HEIGHTS = {
    'A4': 1117,
    'US Letter': 1020
}

export class ModToolsPrint {
    constructor(mod) {
        mod.print = this
        this.mod = mod
        this.paginator = false
        this.initFlowTo()
    }

    initFlowTo() {
        this.flowTo = document.createElement('div')
        this.flowTo.classList.add('print')
        this.hideFlowTo()
        document.body.appendChild(this.flowTo)
    }

    showFlowTo() {
        this.flowTo.style.display = ''
    }

    hideFlowTo() {
        this.flowTo.style.display = 'none'
    }

    printReady() {
        window.print()
        this.paginator.tearDown()
        this.paginator = false
        this.hideFlowTo()
    }

    changeAllIds(node) {
        if (node.id) {
            node.id = node.id + '-print'
        }
        if (node.children) {
            for (let i=0;i<node.children.length;i++) {
                this.changeAllIds(node.children[i])
            }
        }
    }

    print() {

        // This is a quick and dirty way of creating a cloned version of the node.
        // We only do this because it is faster and mathjax would be slow in rendering a second time.

        let flowCopy = document.getElementById('flow').cloneNode(true)

        this.changeAllIds(flowCopy)

        let footnoteBox = flowCopy.querySelector('#footnote-box-container-print')
        footnoteBox.parentElement.removeChild(footnoteBox)

        let footnotes = footnoteBox.querySelectorAll('.footnote-container')
        let footnoteMarkers = flowCopy.querySelectorAll('.footnote-marker')

        footnoteMarkers.forEach((fnMarker, index) => {
            while (fnMarker.firstChild) {
                fnMarker.removeChild(fnMarker.firstChild)
            }
            while (footnotes[index].firstChild) {
                fnMarker.appendChild(footnotes[index].firstChild)
            }
        })
        let footnoteCitations = footnoteBox.querySelectorAll('.footnote-citation')
        let footnoteCitationMarkers = flowCopy.querySelectorAll('.citation-footnote-marker')

        footnoteCitationMarkers.forEach((fnCitationMarker, index) => {
            let fnCitation = footnoteCitations[index]
            fnCitation.classList.remove('footnote-citation')
            fnCitationMarker.appendChild(fnCitation)
            fnCitationMarker.classList.remove('citation-footnote-marker')
            fnCitationMarker.classList.add('footnote-marker')
        })

        this.showFlowTo()

        this.paginator = new PaginateForPrint({
            'sectionStartSelector': 'none',
            'chapterStartSelector': 'none',
            'flowFromElement' : flowCopy,
            'enableFrontmatter' : false,
            'alwaysEven' : false,
            'autoStart': false,
            'pageWidth': 790,
            'pageHeight': PAPER_HEIGHTS[this.mod.editor.view.state.doc.firstChild.attrs.papersize],
            'outerMargin': 90,
            'innerMargin': 90,
            'contentsTopMargin': 80,
            'headerTopMargin': 80,
            'contentsBottomMargin': 80,
            'pagenumberBottomMargin': 50,
            'footnoteSelector': '.footnote-marker',
            'lengthUnit': 'px',
            'topfloatSelector': 'table,figure',
            'flowToElement': this.flowTo,
            'callback': () => {
                this.printReady()
            }
        })
        this.paginator.initiate()
    }

}

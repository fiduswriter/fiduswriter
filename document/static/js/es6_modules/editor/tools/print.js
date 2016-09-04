import {PaginateForPrint} from "paginate-for-print/dist/paginate-for-print"


export class ModToolsPrint {
    constructor(mod) {
        mod.print = this
        this.mod = mod
        this.paginator = false
    }

    printReady() {
        let flowTo = document.getElementById('print')
        window.print()
        this.paginator.tearDown()
        this.paginator = false
        jQuery(flowTo).hide()
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
        let that = this
        let flowTo = document.getElementById('print')

        // This is a quick and dirty way of creating a cloned version of the node.
        // We only do this because it is faster and mathjax would be slow in rendering a second time.

        let flowCopy = document.getElementById('flow').cloneNode(true)

        this.changeAllIds(flowCopy)

        let footnoteBox = flowCopy.querySelector('#footnote-box-container-print')
        footnoteBox.parentElement.removeChild(footnoteBox)

        let footnotes = footnoteBox.querySelectorAll('.footnote-container')
        let footnoteMarkers = [].slice.call(flowCopy.querySelectorAll('.footnote-marker'))

        footnoteMarkers.forEach(function(fnMarker, index) {
            while (fnMarker.firstChild) {
                fnMarker.removeChild(fnMarker.firstChild)
            }
            while (footnotes[index].firstChild) {
                fnMarker.appendChild(footnotes[index].firstChild)
            }
        })
        let footnoteCitations = footnoteBox.querySelectorAll('.footnote-citation')
        let footnoteCitationMarkers = [].slice.call(flowCopy.querySelectorAll('.citation-footnote-marker'))

        footnoteCitationMarkers.forEach(function(fnCitationMarker, index) {
            let fnCitation = footnoteCitations[index]
            fnCitation.classList.remove('footnote-citation')
            fnCitationMarker.appendChild(fnCitation)
            fnCitationMarker.classList.remove('citation-footnote-marker')
            fnCitationMarker.classList.add('footnote-marker')
        })

        jQuery(flowTo).show()
        this.paginator = new PaginateForPrint({
            'flowFromElement' : flowCopy,
            'enableFrontmatter' : false,
            'alwaysEven' : false,
            'autoStart': false,
            'pageWidth': 790,
            'pageHeight': this.mod.editor.doc.settings.papersize,
            'outerMargin': 90,
            'innerMargin': 90,
            'contentsTopMargin': 80,
            'headerTopMargin': 80,
            'contentsBottomMargin': 80,
            'pagenumberBottomMargin': 50,
            'footnoteSelector': '.footnote-marker',
            'lengthUnit': 'px',
            'flowToElement': document.getElementById("print"),
            'callback': function() {
                that.printReady()
            }
        })
        this.paginator.initiate()
    }

}

export class ModToolsPrint {
    constructor(mod) {
        mod.print = this
        this.mod = mod
    }

    printReady() {
        let flowTo = document.getElementById('print')
        window.print()
        jQuery(flowTo).hide()
        jQuery(flowTo).html('')
        delete window.flowCopy
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

    preparePrint() {
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
            while (footnotes[index].firstChild) {
                fnMarker.appendChild(footnotes[index].firstChild)
            }
        })

        window.flowCopy = flowCopy
        jQuery(flowTo).show()
        pagination.applyBookLayoutWithoutDivision()
    }

    print() {
        let that = this
        let listener = function(event) {
            that.printReady()
            document.removeEventListener('layoutFlowFinished', listener, false)
        }
        document.addEventListener('layoutFlowFinished', listener, false)
        this.preparePrint()
    }

}

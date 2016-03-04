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

    print() {
        let flowTo = document.getElementById('print'), that = this

        let flowCopy = document.getElementById('flow').cloneNode(true)
        let footnoteBox = flowCopy.querySelector('#footnote-box-container')
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
        document.addEventListener('layoutFlowFinished', function () {that.printReady()}, false)
        pagination.applyBookLayoutWithoutDivision()
    }

}

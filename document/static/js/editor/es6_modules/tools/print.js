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

        window.flowCopy = document.getElementById('flow').cloneNode(true)
        jQuery(flowTo).show()
        document.addEventListener('layoutFlowFinished', function () {that.printReady()}, false)
        pagination.applyBookLayoutWithoutDivision()
    }

}

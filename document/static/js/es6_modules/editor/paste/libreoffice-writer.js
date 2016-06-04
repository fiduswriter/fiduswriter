import {GeneralPasteHandler} from "./general"

// LibreOffice Writer paste handler
export class LibreOfficeWriterPasteHandler extends GeneralPasteHandler {

    outputHandlerType() {
        console.log('LibreOffice Writer paste handler')
    }

    // Convert an existing node to a different node, if needed.
    convertNode(node) {
        // Footnote markers (only in main pm instance):
        if (node.tagName === 'A' &&
            node.classList.contains("sdfootnoteanc") &&
            this.pmType === "main") {
            let fnSelector = node.getAttribute("href")
            // Remove "sym" at the end of the selector
            fnSelector = fnSelector.substring(0, fnSelector.length - 3)
            let footnote = this.dom.querySelector(fnSelector)
            if (footnote) {
                let footnoteCounter = footnote.querySelector('a.sdfootnotesym')
                if (footnoteCounter) {
                    footnoteCounter.parentNode.removeChild(footnoteCounter)
                }
                this.footnoteMarkers.push(node)
                this.footnotes.push(footnote)
            }
        }

        return node
    }

}

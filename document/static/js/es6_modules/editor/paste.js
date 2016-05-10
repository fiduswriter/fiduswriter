// Some pasted HTML will need slight conversions to work correctly.
// We are looking at the paste output of MsWord, LibreOffice and Google Docs
// and try to convert it to make sense.

export class PasteHandler {
    constructor(inHTML, pmInstance) {
        this.inHTML = inHTML
        this.pmInstance = pmInstance
        this.footnoteMarkers = []
        this.footnotes = []
        this.convert()
    }

    // Create a temporary dom structure for the pasted content and iterate
    // over each node in the pasted content.
    convert() {
        this.dom = document.createElement('div')
        this.dom.innerHTML = this.inHTML
        this.iterateNode(this.dom)
        this.convertFootnotes()
        this.outHTML = this.dom.innerHTML
        //console.log(this.inHTML)
        //console.log(this.outHTML)
    }

    // Iterate over pasted nodes and their children
    iterateNode(node) {
        if (node.nodeType === 1) {
            for (let i = 0; i < node.childNodes.length; i++) {
                this.iterateNode(node.childNodes[i])
            }
            this.convertNode(node)
        }
    }

    // Convert an existing node to a different node, if needed.
    convertNode(node) {
        // Replace  nodes with other nodes to not change the number of child nodes
        // Google Docs:
        // <b style="font-weight:normal;">...</b> => <span>...</span>
        if (node.tagName === 'B' && node.style.fontWeight === 'normal') {
            this.neutralizeInlineNode(node)
        }
        // LibreOffice footnote markers (only in main pm instance):
        if (node.tagName === 'A'
            && node.classList.contains("sdfootnoteanc")
            && this.pmInstance === "main") {
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

    }

    // Replace any type of inline node with a span node.
    neutralizeInlineNode(node) {
        let newNode = document.createElement('span')
        while (node.firstChild) {
            newNode.appendChild(node.firstChild)
        }
        node.parentNode.replaceChild(newNode, node)
    }

    // Move footnotes into their markers and turn footnote markers into the
    // required format.
    convertFootnotes() {
        let that = this
        this.footnoteMarkers.forEach(function(fnM, index) {
            let footnote = that.footnotes[index]
            let newFnM = document.createElement('span')
            newFnM.classList.add('footnote-marker')
            let footnoteContents = footnote.innerHTML
            // Remove linebreaks in string (not <BR>)
            //footnoteContents = footnoteContents.replace(/(\r\n|\n|\r)/gm,"")
            // Turn multiple white spaces into single space
            footnoteContents = footnoteContents.replace(/\s+/g, ' ')
            console.log(footnoteContents)
            newFnM.setAttribute('contents', footnoteContents)
            fnM.parentNode.replaceChild(newFnM, fnM)
        })
        // Remove all footnotes from document. Some footnotes may have several
        // markers, so only remove each footnote once.
        this.footnotes.forEach(function(fn) {
            if (fn.parentNode) {
                fn.parentNode.removeChild(fn)
            }
        })
    }

}

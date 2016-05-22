// Some pasted HTML will need slight conversions to work correctly.
// We are looking at the paste output of MsWord, LibreOffice and Google Docs
// and try to convert it to make sense.

const BLOCK_NODE_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'FIGURE', 'HR', 'CODE', 'BLOCKQUOTE', 'UL', 'META']

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
        this.setDOM()
        this.normInHTML = this.dom.innerHTML
        this.iterateNode(this.dom)
        this.cleanDOM()
        this.convertFootnotes()
        this.outHTML = this.dom.innerHTML
    }

    // set the contents of the dom. Use outerHTMl to avoid normalization
    setDOM() {
        this.dom.innerHTML = "<div></div>"
        this.dom.firstChild.outerHTML = this.inHTML

    }

    // Remove unused content
    cleanDOM() {
        let removableElements = [].slice.call(this.dom.querySelectorAll(
            // Separator lines for footnotes in Microsoft Word 2016
            'div[style*="mso-element:footnote-list"]'
        ))

        removableElements.forEach(function(el){
            el.parentNode.removeChild(el)
        })

    }
    // Iterate over pasted nodes and their children
    iterateNode(node) {
        if (node.tagName==="STYLE" || node.tagName==="XML" || node.tagName==="LINK" ||
                (node.tagName==="P" &! node.firstChild)) {
            node.parentNode.removeChild(node)
            return true
        } else if (node.nodeType===8) {
            node.parentNode.removeChild(node)

            if (node.textContent==="EndFragment") {
                // End of paste content of Microsoft Word 2016. Do not process any further.
                return false
            } else {
                return true
            }
        } else if (node.nodeType === 1) {
            let childNode = node.firstChild
            while (childNode) {
                let nextChildNode = childNode.nextSibling
                if (this.iterateNode(childNode)) {
                    childNode = nextChildNode
                } else {
                    childNode = false
                }
            }
            this.convertNode(node)
        }
        // Temporary paste fix, see issue https://github.com/ProseMirror/prosemirror/issues/342
        if (node.nodeType===3 || BLOCK_NODE_TAGS.indexOf(node.tagName) === -1) { // This is a text or inline node
            // Determine if the node has any block level siblings
            let checkNode = node.parentNode.firstChild
            let foundBlock = false
            while (checkNode) {
                if (BLOCK_NODE_TAGS.indexOf(checkNode.tagName) !== -1) {
                    foundBlock = true
                }
                checkNode = checkNode.nextSibling
            }
            if (foundBlock) {
                if (node.nodeType === 3 && node.nodeValue.trim()==='') {
                    node.parentNode.removeChild(node)
                } else {
                    let par = document.createElement('p')
                    node.parentNode.replaceChild(par, node)
                    par.appendChild(node)
                }
            }
        }
        return true
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
        if (node.tagName === 'A' &&
            node.classList.contains("sdfootnoteanc") &&
            this.pmInstance === "main") {
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
        // Microsoft Word 2016 footnote markers (only in main pm instance):
        if (node.tagName === 'A' &&
            node.firstChild && node.firstChild.tagName === 'SPAN' &&
            node.firstChild.classList.contains("MsoFootnoteReference") &&
            this.pmInstance === "main") {
            // Remove "#_ftn" from the selector (#_ftn1)
            let fnSelector = node.getAttribute("href")
            let fnNumber = node.getAttribute(
                "href"
            ).substring(5, fnSelector.length)
            let footnote = this.dom.querySelector("#ftn" + fnNumber)
            if (footnote) {
                let footnoteCounter = footnote.querySelector('a[href="#_ftnref' + fnNumber + '"]')
                if (footnoteCounter) {
                    let followingNode = footnoteCounter.nextSibling
                    footnoteCounter.parentNode.removeChild(footnoteCounter)
                    if (followingNode && followingNode.nodeType === 3) {
                        // If there is a text string right after the footnote
                        // marker, remove any leading spaces.
                        followingNode.nodeValue = followingNode.nodeValue.replace(/^\s+/,"")
                    }
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

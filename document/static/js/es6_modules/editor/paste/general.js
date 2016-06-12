const BLOCK_NODE_TAGS = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV', 'FIGURE', 'HR', 'CODE', 'BLOCKQUOTE', 'UL', 'META']

// General Fallback handler for paste
export class GeneralPasteHandler {

    constructor(htmlDoc, pmType) {
        this.htmlDoc = htmlDoc
        this.pmType = pmType
        this.footnoteMarkers = []
        this.footnotes = []
    }

    // Iterate over each node in the body of the pasted content.
    getOutput() {
        this.outputHandlerType()
        this.dom = this.htmlDoc.getElementsByTagName('body')[0]
        this.inHTML = this.dom.innerHTML
        this.iterateNode(this.dom)
        this.cleanDOM()
        this.convertFootnotes()
        this.outHTML = this.dom.innerHTML
        //console.log(this.inHTML)
        //console.log(this.outHTML)
        return this.outHTML
    }

    outputHandlerType() {
        console.log('general paste handler')
    }


    // Remove unused content
    cleanDOM() {
    }

    // Iterate over pasted nodes and their children
    iterateNode(node) {
        if (node.tagName==="P" &! node.firstChild) {
            node.parentNode.removeChild(node)
            return
        } else if (node.nodeType===8) {
            node.parentNode.removeChild(node)
            return
        } else if (node.nodeType === 1) {
            let childNode = node.firstChild
            while (childNode) {
                let nextChildNode = childNode.nextSibling
                this.iterateNode(childNode)
                childNode = nextChildNode
            }
            node = this.convertNode(node)
        }
        this.pasteFix(node)
    }

    // Temporary paste fix, see issue https://github.com/ProseMirror/prosemirror/issues/342
    pasteFix(node) {
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
    }


    // Convert an existing node to a different node, if needed.
    convertNode(node) {
        return node
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

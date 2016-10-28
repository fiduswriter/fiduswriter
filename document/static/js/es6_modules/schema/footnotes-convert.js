import {fnSchema} from "./footnotes"
import {elt} from "prosemirror-old/dist/util/dom"
import {Node} from "prosemirror-old/dist/model/node"

// Convert the footnote HTML stored with the marker to a PM node representation of the footnote.
export let htmlToFnNode = function(contents) {
    let footnoteDOM = elt('div', {
        class: 'footnote-container'
    })
    footnoteDOM.innerHTML = contents
    let node = fnSchema.parseDOM(footnoteDOM, {
        preserveWhitespace: true,
        topNode: false
    })
    let json = node.firstChild.toJSON().content

    return json
}

export let fnNodeToPmNode = function(fnContents) {
    let footnote = {
        type: 'footnotecontainer',
        content: fnContents
    }
    return Node.fromJSON(fnSchema, footnote)
}

export let fnNodeToHtml = function(jsonString) {
    let pmNode = fnNodeToPmNode(jsonString)
    return pmNode.toDOM().innerHTML
}

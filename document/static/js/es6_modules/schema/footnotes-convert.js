import {fnSchema} from "./footnotes"
import {Node} from "prosemirror-model"
import {DOMSerializer, DOMParser} from "prosemirror-model"

// Convert the footnote HTML stored with the marker to a PM node representation of the footnote.
export let htmlToFnNode = function(contents) {
    let footnoteDOM = document.createElement('div')
    footnoteDOM.classList.add('footnote-container')
    footnoteDOM.innerHTML = contents
    let node = DOMParser.fromSchema(fnSchema).parse(footnoteDOM, {
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
    let pmNode = fnNodeToPmNode(jsonString),
        serializer = DOMSerializer.fromSchema(fnSchema)
    return serializer.serializeNode(pmNode).innerHTML
}

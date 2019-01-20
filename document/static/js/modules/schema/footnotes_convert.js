import {Node, DOMSerializer, DOMParser} from "prosemirror-model"

import {fnSchema} from "./footnotes"

// Convert the footnote HTML stored with the marker to a PM node representation of the footnote.
export const htmlToFnNode = function(contents) {
    const footnoteDOM = document.createElement('div')
    footnoteDOM.classList.add('footnote-container')
    footnoteDOM.innerHTML = contents
    const node = DOMParser.fromSchema(fnSchema).parse(footnoteDOM, {
        preserveWhitespace: true,
        topNode: false
    })
    const json = node.firstChild.toJSON().content

    return json
}

export const fnNodeToPmNode = function(fnContents) {
    const footnote = {
        type: 'footnotecontainer',
        content: fnContents
    }
    return Node.fromJSON(fnSchema, footnote)
}

export const fnNodeToHtml = function(jsonString) {
    const pmNode = fnNodeToPmNode(jsonString),
        serializer = DOMSerializer.fromSchema(fnSchema)
    return serializer.serializeNode(pmNode).innerHTML
}

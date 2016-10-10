/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {node2Obj, obj2Node} from "../exporter/tools/json"
import {nodeToDOM} from "prosemirror/dist/model/to_dom"
import {parseDOM} from "prosemirror/dist/model/from_dom"
import {docSchema} from "../schema/document"

import {defaultDocumentStyle} from "../style/documentstyle-list"
import {defaultCitationStyle} from "../style/citation-definitions"

export let updateDoc = function(doc) {
    /* This is to clean documents taking all the accepted formatting from older
       versions and outputting the current version of the doc format.
       We achieve this by parsing doc -> pmDoc -> doc and copying the contents
       and metadata of the output.
    */

    // We version the parts of the document. Notice that this isn't the same as
    // the versions of FW files. While the FW file version refers to what files
    // there could be, the doc_version refers to how the data is stored in those
    // files


    let docVersion = doc.settings['doc_version']

    switch(docVersion) {
        case undefined:
            // Fidus Writer 1.1-3.0
            let newDoc = editorToModel(modelToEditor(doc))
            doc = JSON.parse(JSON.stringify(doc))
            doc.contents = newDoc.contents
            doc.metadata = newDoc.metadata
            let defaultSettings = [
                ['papersize', 1117],
                ['citationstyle', defaultCitationStyle],
                ['documentstyle', defaultDocumentStyle]
            ]

            defaultSettings.forEach(function(variable) {
                if (doc.settings[variable[0]] === undefined) {
                    doc.settings[variable[0]] = variable[1]
                }
            })
            doc.settings['doc_version'] = 0
        //case 0:
            // Here we add upgrades from version 0 once there is a higher version
            // number.
    }

    return doc

}

export let modelToEditor = function(doc) {

    // We start with a document of which we use the metadata and contents entries.
    let editorNode = document.createElement('div'),
        titleNode = doc.metadata.title ? obj2Node(doc.metadata.title) : document.createElement('div'),
        contentsNode = obj2Node(doc.contents),
        subtitleNode = doc.metadata.subtitle ? obj2Node(doc.metadata.subtitle) : document.createElement('div'),
        authorsNode = doc.metadata.authors ? obj2Node(doc.metadata.authors) : document.createElement('div'),
        abstractNode = doc.metadata.abstract ? obj2Node(doc.metadata.abstract) : document.createElement('div'),
        keywordsNode = doc.metadata.keywords ? obj2Node(doc.metadata.keywords) : document.createElement('div')

    titleNode.id = 'document-title'
    subtitleNode.id = 'metadata-subtitle'
    authorsNode.id = 'metadata-authors'
    abstractNode.id = 'metadata-abstract'
    keywordsNode.id = 'metadata-keywords'
    contentsNode.id = 'document-contents'

    editorNode.appendChild(titleNode)
    editorNode.appendChild(subtitleNode)
    editorNode.appendChild(authorsNode)
    editorNode.appendChild(abstractNode)
    editorNode.appendChild(keywordsNode)
    editorNode.appendChild(contentsNode)

      let pmDoc = parseDOM(docSchema, editorNode, {
          preserveWhitespace: true
      })

      return pmDoc
}


export let editorToModel = function(pmDoc) {
    // In order to stick with the format used in Fidus Writer 1.1-2.0,
    // we do a few smaller modifications to the node before it is saved.
    let node = pmDoc.content.toDOM()

    // Remove katex contents of <span class="equation" >
    let mathNodes = node.querySelectorAll('span.equation')

    for (let i = 0; i < mathNodes.length; i++) {
        while (mathNodes[i].firstChild) {
            mathNodes[i].removeChild(mathNodes[i].firstChild)
        }
    }

    // Remove all contenteditable attributes
    let ceNodes = node.querySelectorAll('[contenteditable]')

    for (let i = 0; i < ceNodes.length; i++) {
        ceNodes[i].removeAttribute('contenteditable')
    }

    // We convert the node into a json object with two entries: metadata and contents
    let doc = {
        metadata: {}
    }
    doc.metadata.title = node2Obj(node.querySelector('#document-title'))
    doc.metadata.subtitle = node2Obj(node.querySelector('#metadata-subtitle'))
    doc.metadata.authors = node2Obj(node.querySelector('#metadata-authors'))
    doc.metadata.abstract = node2Obj(node.querySelector('#metadata-abstract'))
    doc.metadata.keywords = node2Obj(node.querySelector('#metadata-keywords'))
    doc.contents = node2Obj(node.querySelector('#document-contents'))
    return doc
}

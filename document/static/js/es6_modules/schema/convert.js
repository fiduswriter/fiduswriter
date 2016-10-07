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
    if(doc.settings['doc_version'] === 0) {
        // Doc has current version, return without conversion.
        return doc
    }

    let newDoc = editorToModel(modelToEditor(doc))
    let docCopy = JSON.parse(JSON.stringify(doc))
    docCopy.contents = newDoc.contents
    docCopy.metadata = newDoc.metadata
    docCopy.settings['doc_version'] = 0

    let defaultSettings = [
        ['papersize', 1117],
        ['citationstyle', defaultCitationStyle],
        ['documentstyle', defaultDocumentStyle]
    ]

    defaultSettings.forEach(function(variable) {
        if (docCopy.settings[variable[0]] === undefined) {
            docCopy.settings[variable[0]] = variable[1]
        }
    })

    return docCopy
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

    // In order to stick with the format used in Fidus Writer 1.1-2.0,
    // we do a few smaller modifications to the node before it is saved.

    /*let fnNodes = editorNode.querySelectorAll('span.footnote')

      for (let i = 0; i < fnNodes.length; i++) {
          let newNode = document.createElement('span')
          newNode.setAttribute('contents',fnNodes[i].innerHTML)
          newNode.classList.add('footnote-marker')
          fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
      }*/

      let pmDoc = parseDOM(docSchema, editorNode, {
          preserveWhitespace: true
      })

      return pmDoc
}


export let editorToModel = function(pmDoc) {
    // In order to stick with the format used in Fidus Writer 1.1-2.0,
    // we do a few smaller modifications to the node before it is saved.
    let node = pmDoc.content.toDOM()

    // Turn <span class='footnote-marker' contents='<p>...</p>'></span> into
    // <span classs='footnote'><p>...</p></span>
    /*let fnNodes = node.querySelectorAll('.footnote-marker')

    for (let i = 0; i < fnNodes.length; i++) {
        let newNode = document.createElement('span')
        newNode.innerHTML = fnNodes[i].getAttribute('contents')
        newNode.classList.add('footnote')
        fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
    }

    // Turn <strong>...</strong> into <b>...</b>
    let strongNodes = node.querySelectorAll('strong')

    for (let i = 0; i < strongNodes.length; i++) {
        let newNode = document.createElement('b')
        while (strongNodes[i].firstChild) {
            newNode.appendChild(strongNodes[i].firstChild)
        }
        strongNodes[i].parentNode.replaceChild(newNode, strongNodes[i])
    }

    // Turn <em>...</em> into <i>...</i>
    let emNodes = node.querySelectorAll('em')

    for (let i = 0; i < emNodes.length; i++) {
        let newNode = document.createElement('i')
        while (emNodes[i].firstChild) {
            newNode.appendChild(emNodes[i].firstChild)
        }
        emNodes[i].parentNode.replaceChild(newNode, emNodes[i])
    }*/

    // Remove katex contents of <span class="equation" >
    let mathNodes = node.querySelectorAll('span.equation')

    for (let i = 0; i < mathNodes.length; i++) {
        while (mathNodes[i].firstChild) {
            mathNodes[i].removeChild(mathNodes[i].firstChild)
        }
    }

    // TODO: Possibly enable this, but only for saving on server, not for exports.
    // Remove all rendered contents (equations and images) of figures.
    //let figureNodes = node.querySelectorAll('figure')
    //
    //for (let i = 0; i < figureNodes.length; i++) {
    //    while (figureNodes[i].firstChild) {
    //        figureNodes[i].removeChild(figureNodes[i].firstChild)
    //    }
    //}

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

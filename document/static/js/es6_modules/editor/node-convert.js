/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {node2Obj, obj2Node} from "../exporter/json"
import {serializeTo} from "prosemirror/dist/format"
import {fromDOM} from "prosemirror/dist/format"

export let modelToEditor = function(doc, schema) {
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

    let fnNodes = editorNode.querySelectorAll('span.footnote')

      for (let i = 0; i < fnNodes.length; i++) {
          let newNode = document.createElement('span')
          newNode.setAttribute('contents',fnNodes[i].innerHTML)
          newNode.classList.add('footnote-marker')
          fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
      }

      let pmDoc = fromDOM(schema, editorNode, {
          preserveWhitespace: true
      })

      return pmDoc
}


export let editorToModel = function(pmDoc) {
    // In order to stick with the format used in Fidus Writer 1.1-2.0,
    // we do a few smaller modifications to the node before it is saved.

    let node = serializeTo(pmDoc, 'dom')

    let fnNodes = node.querySelectorAll('.footnote-marker')

    for (let i = 0; i < fnNodes.length; i++) {
        let newNode = document.createElement('span')
        newNode.innerHTML = fnNodes[i].getAttribute('contents')
        newNode.classList.add('footnote')
        fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
    }

    let strongNodes = node.querySelectorAll('strong')

    for (let i = 0; i < strongNodes.length; i++) {
        let newNode = document.createElement('b')
        while (strongNodes[i].firstChild) {
            newNode.appendChild(strongNodes[i].firstChild)
        }
        strongNodes[i].parentNode.replaceChild(newNode, strongNodes[i])
    }

    let emNodes = node.querySelectorAll('em')

    for (let i = 0; i < emNodes.length; i++) {
        let newNode = document.createElement('i')
        while (emNodes[i].firstChild) {
            newNode.appendChild(emNodes[i].firstChild)
        }
        emNodes[i].parentNode.replaceChild(newNode, emNodes[i])
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

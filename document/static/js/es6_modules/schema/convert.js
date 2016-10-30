/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {node2Obj, obj2Node} from "../exporter/tools/json"
import {docSchema} from "./document"

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
        case undefined: // Fidus Writer 1.1-3.0
        //    let newDoc = editorToModel(modelToEditor(doc))
        //    doc = JSON.parse(JSON.stringify(doc))
        //    doc.contents = newDoc.contents
        //    doc.metadata = newDoc.metadata
        //    doc.settings['doc_version'] = 0
        case 0: // Fidus Writer 3.1 prerelease
            let pmContents = htmlJsonToPmJson(doc)
            pmContents.attrs = {
                papersize: doc.settings.papersize === 1020 ? 'US Letter': 'A4',
                documentstyle: doc.settings.documentstyle ? doc.settings.documentstyle : defaultDocumentStyle,
                citationstyle: doc.settings.citationstyle ? doc.settings.citationstyle : defaultCitationStyle
            }
            pmContents.content.forEach(function(docSection){
                if (['subtitle', 'abstract', 'authors', 'keywords'].indexOf(docSection.type) !== -1) {
                    if (doc.settings[`metadata-${docSection.type}`]) {
                        docSection.attrs.hidden = false
                    }
                }
            })
            let pmArticle = docSchema.nodeFromJSON(pmContents)
            let pmMetadata = getMetadata(pmArticle)
            let pmSettings = getSettings(pmArticle)
            doc = JSON.parse(JSON.stringify(doc))
            doc.contents = pmContents
            doc.metadata = pmMetadata
            doc.settings = pmSettings

            //let newNewDoc = editorToModel({firstChild:pmArticle})
            //doc.contents = newNewDoc.contents
            //doc.metadata = newNewDoc.metadata
            // doc.settings = {'doc_version':1}
    }
    return doc
}

export let getMetadata = function(pmDoc) {
    let metadata = {}
    for (let i=0;i<pmDoc.childCount;i++) {
        let pmNode = pmDoc.child(i)
        if (!pmNode.type.isMetadata || pmNode.hidden) {
            return
        }
        let value = pmNode.toDOM().innerHTML
        if (value.length > 0 && value !== "<p></p>") {
            metadata[pmNode.type.name] = value
        }
    }
    return metadata
}

export let getSettings = function(pmDoc) {
    let settings = _.clone(pmDoc.attrs)
    settings.doc_version = 1
    return settings
}

let htmlJsonToPmJson = function(doc) {

    // We start with a document of which we use the metadata and contents entries.
    let editorNode = document.createElement('div'),
        titleNode = doc.metadata.title ? obj2Node(doc.metadata.title) : document.createElement('div'),
        contentsNode = obj2Node(doc.contents),
        subtitleNode = doc.metadata.subtitle ? obj2Node(doc.metadata.subtitle) : document.createElement('div'),
        authorsNode = doc.metadata.authors ? obj2Node(doc.metadata.authors) : document.createElement('div'),
        abstractNode = doc.metadata.abstract ? obj2Node(doc.metadata.abstract) : document.createElement('div'),
        keywordsNode = doc.metadata.keywords ? obj2Node(doc.metadata.keywords) : document.createElement('div')

    editorNode.class = 'article'
    titleNode.class = 'article-title'
    subtitleNode.class = 'article-subtitle'
    authorsNode.class = 'article-authors'
    abstractNode.class = 'article-abstract'
    keywordsNode.class = 'article-keywords'
    contentsNode.class = 'article-body'

    editorNode.appendChild(titleNode)
    editorNode.appendChild(subtitleNode)
    editorNode.appendChild(authorsNode)
    editorNode.appendChild(abstractNode)
    editorNode.appendChild(keywordsNode)
    editorNode.appendChild(contentsNode)


    // Footnotes FW 1.1-3.0
    let fw11Footnotes = [].slice.call(editorNode.querySelectorAll('footnote,span.footnote'))
    fw11Footnotes.forEach(function(footnote){
        let newFn = document.createElement('span')
        newFn.classList.add('footnote-marker')
        newFn.setAttribute('data-footnote',footnote.innerHTML)
        footnote.parentElement.replaceChild(newFn,footnote)
    })

    // Footnotes FW 3.1 pre-release
    let fw31Footnotes = [].slice.call(editorNode.querySelectorAll('footnote-marker'))
    fw31Footnotes.forEach(function(footnote){
        let contents = footnote.getAttribute('contents')
        footnote.setAttribute('data-footnote', contents)
        footnote.removeAttribute('contents')
    })

    let pmDoc = docSchema.parseDOM(editorNode, {
        preserveWhitespace: true
    })

    return pmDoc.firstChild.toJSON()
}


// export let editorToModel = function(pmDoc) {
//     // In order to stick with the format used in Fidus Writer 1.1-2.0,
//     // we do a few smaller modifications to the node before it is saved.
//     let node = pmDoc.firstChild.toDOM()
//
//     // Remove katex contents of <span class="equation" >
//     let mathNodes = node.querySelectorAll('span.equation')
//
//     for (let i = 0; i < mathNodes.length; i++) {
//         while (mathNodes[i].firstChild) {
//             mathNodes[i].removeChild(mathNodes[i].firstChild)
//         }
//     }
//
//     // Remove all contenteditable attributes
//     let ceNodes = node.querySelectorAll('[contenteditable]')
//
//     for (let i = 0; i < ceNodes.length; i++) {
//         ceNodes[i].removeAttribute('contenteditable')
//     }
//
//     // We convert the node into a json object with two entries: metadata and contents
//     let doc = {
//         metadata: {}
//     }
//     doc.metadata.title = node2Obj(node.querySelector('.article-title'))
//     doc.metadata.subtitle = node2Obj(node.querySelector('.article-subtitle'))
//     doc.metadata.authors = node2Obj(node.querySelector('.article-authors'))
//     doc.metadata.abstract = node2Obj(node.querySelector('.article-abstract'))
//     doc.metadata.keywords = node2Obj(node.querySelector('.article-keywords'))
//     doc.contents = node2Obj(node.querySelector('.article-body'))
//     return doc
// }

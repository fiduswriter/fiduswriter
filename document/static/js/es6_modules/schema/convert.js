/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {node2Obj, obj2Node} from "../exporter/tools/json"
import {docSchema} from "./document"

import {defaultDocumentStyle} from "../style/documentstyle-list"
import {defaultCitationStyle} from "../style/citation-definitions"

export let getMetadata = function(pmArticle) {
    let metadata = {}
    for (let i=0;i<pmArticle.childCount;i++) {
        let pmNode = pmArticle.child(i)
        if (pmNode.type.isMetadata || !pmNode.attrs.hidden) {
            let value = pmNode.toDOM().innerHTML
            if (value.length > 0 && value !== "<p></p>") {
                metadata[pmNode.type.name] = value
            }
        }
    }
    return metadata
}

export let getSettings = function(pmArticle) {
    let settings = _.clone(pmArticle.attrs)
    settings.doc_version = 1
    return settings
}

export let updateDoc = function(doc) {
    /* This is to clean documents taking all the accepted formatting from older
       versions and outputting the current version of the doc format.
       Notice that this isn't the same as the version of the FW export file.
       While the FW file version also says something about what files could be
       available inside the FW zip, the doc_version refers to how the data is
       stored in those files.
       In general, an update to the doc_version will likely also trigger an
       update to the version of the FW export file, the reverse is not always
       true.
    */


    let docVersion = doc.settings['doc_version']

    switch(docVersion) {
        case undefined: // Fidus Writer 1.1-3.0
        case 0: // Fidus Writer 3.1 prerelease
            doc = convertDocV0(doc)
    }
    return doc
}



let convertDocV0 = function(doc) {

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

    let docContents = pmDoc.firstChild.toJSON()
    docContents.attrs = {
        papersize: doc.settings.papersize === 1020 ? 'US Letter': 'A4',
        documentstyle: doc.settings.documentstyle ? doc.settings.documentstyle : defaultDocumentStyle,
        citationstyle: doc.settings.citationstyle ? doc.settings.citationstyle : defaultCitationStyle
    }
    docContents.content.forEach(function(docSection){
        if (['subtitle', 'abstract', 'authors', 'keywords'].indexOf(docSection.type) !== -1) {
            if (doc.settings[`metadata-${docSection.type}`]) {
                docSection.attrs.hidden = false
            }
        }
    })
    let pmArticle = docSchema.nodeFromJSON(docContents)
    let pmMetadata = getMetadata(pmArticle)
    let pmSettings = getSettings(pmArticle)
    doc = JSON.parse(JSON.stringify(doc))
    doc.contents = docContents
    doc.metadata = pmMetadata
    doc.settings = pmSettings
    return doc
}

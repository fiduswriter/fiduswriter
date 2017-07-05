/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {obj2Node} from "../exporter/tools/json"
import {docSchema} from "./document"
import {randomHeadingId} from "./common"
import {DOMSerializer, DOMParser} from "prosemirror-model"

export let getMetadata = function(pmArticle) {
    let metadata = {}
    let serializer = DOMSerializer.fromSchema(docSchema)
    for (let i=0; i < pmArticle.childCount; i++) {
        let pmNode = pmArticle.child(i)
        if (pmNode.type.isMetadata || !pmNode.attrs.hidden) {
            let value = serializer.serializeNode(pmNode).innerHTML
            if (value.length > 0 && value !== "<p></p>") {
                metadata[pmNode.type.name] = value
            }
        }
    }
    return metadata
}

export let getSettings = function(pmArticle) {
    let settings = _.clone(pmArticle.attrs)
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
            doc = convertDocV11(doc)
            break
        case 1: // Fidus Writer 3.1 prerelease
            doc = convertDocV1(doc)
            doc = convertDocV11(doc)
            break
        case 1.1: // Fidus Writer 3.1
            doc = convertDocV11(doc)
            break
    }
    return doc
}


let convertCitationsV0 = function(dom) {
    let citations = [].slice.call(dom.querySelectorAll('span.citation'))
    citations.forEach(citation => {
        let hasRefs = citation.getAttribute('data-references')
        if (hasRefs) {
            // has been updated already. abort.
            return
        }
        let prefixes = citation.getAttribute('data-bib-before')
        prefixes = prefixes ? prefixes.split(',,,') : []
        let locators = citation.getAttribute('data-bib-page')
        locators = locators ? locators.split(',,,') : []
        let ids = citation.getAttribute('data-bib-entry')
        ids = ids ? ids.split(',') : []
        let references = ids.map((id, index) => {
            let returnObj = {id: parseInt(id)}
            if (prefixes[index] && prefixes[index] !== '') {
                returnObj['prefix'] = prefixes[index]
            }
            if (locators[index] && locators[index] !== '') {
                returnObj['locator'] = locators[index]
            }
            return returnObj
        })
        citation.removeAttribute('data-bib-before')
        citation.removeAttribute('data-bib-page')
        citation.removeAttribute('data-bib-entry')
        citation.setAttribute('data-references', JSON.stringify(references))
        let format = citation.getAttribute('data-bib-format')
        citation.removeAttribute('data-bib-format')
        citation.setAttribute('data-format', format)
    })
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

    editorNode.classList.add('article')
    titleNode.classList.add('article-title')
    subtitleNode.classList.add('article-subtitle')
    authorsNode.classList.add('article-authors')
    abstractNode.classList.add('article-abstract')
    keywordsNode.classList.add('article-keywords')
    contentsNode.classList.add('article-body')

    editorNode.appendChild(titleNode)
    editorNode.appendChild(subtitleNode)
    editorNode.appendChild(authorsNode)
    editorNode.appendChild(abstractNode)
    editorNode.appendChild(keywordsNode)
    editorNode.appendChild(contentsNode)

    // Footnotes FW 3.1 pre-release
    let fw31Footnotes = [].slice.call(editorNode.querySelectorAll('footnote-marker'))
    fw31Footnotes.forEach(footnote => {
        let contents = footnote.getAttribute('contents')
        let tmpNode = document.createElement('div')
        tmpNode.innerHTML = contents
        convertCitationsV0(tmpNode)
        footnote.setAttribute('data-footnote', tmpNode.innerHTML)
        footnote.removeAttribute('contents')
    })

    // Footnotes FW 1.1-3.0
    let fw11Footnotes = [].slice.call(editorNode.querySelectorAll('footnote,span.footnote'))
    fw11Footnotes.forEach(footnote => {
        let newFn = document.createElement('span')
        newFn.classList.add('footnote-marker')
        convertCitationsV0(footnote)
        newFn.setAttribute('data-footnote', footnote.innerHTML)
        footnote.parentElement.replaceChild(newFn, footnote)
    })

    convertCitationsV0(editorNode)

    let pmDoc = DOMParser.fromSchema(docSchema).parse(editorNode, {
        preserveWhitespace: true
    })

    let docContents = pmDoc.firstChild.toJSON()
    docContents.attrs = {
        papersize: doc.settings.papersize === 1020 ? 'US Letter': 'A4',
        documentstyle: doc.settings.documentstyle ? doc.settings.documentstyle : '',
        citationstyle: doc.settings.citationstyle ? doc.settings.citationstyle : ''
    }
    docContents.content.forEach(docSection => {
        if (['subtitle', 'abstract', 'authors', 'keywords'].indexOf(docSection.type) !== -1) {
            if (doc.settings[`metadata-${docSection.type}`]) {
                docSection.attrs.hidden = false
            }
        }
    })
    let pmArticle = docSchema.nodeFromJSON(docContents)
    let pmMetadata = getMetadata(pmArticle)
    doc = JSON.parse(JSON.stringify(doc))
    doc.contents = docContents
    doc.metadata = pmMetadata
    doc.settings = {doc_version: 1.1}
    return doc
}

let convertDocV11 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    convertNodeV11(returnDoc.contents)
    returnDoc.settings = {doc_version: 1.2}
    return returnDoc
}

let convertNodeV11 = function(node, ids = []) {
    switch (node.type) {
        case 'heading':
            let blockId = node.attrs.id
            while (!blockId || ids.includes(blockId)) {
                blockId = randomHeadingId()
            }
            node.attrs.id = blockId
            ids.push(blockId)
            break
    }
    if (node.content) {
        node.content.forEach(childNode => {
            convertNodeV11(childNode, ids)
        })
    }
}

let convertDocV1 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    convertNodeV1(returnDoc.contents)
    returnDoc.settings.doc_version = 1.1
    return returnDoc
}

let convertNodeV1 = function(node) {
    switch (node.type) {
        case 'citation':
            let prefixes = node.attrs.bibBefore
            prefixes = prefixes ? prefixes.split(',,,') : []
            let locators = node.attrs.bibPage
            locators = locators ? locators.split(',,,') : []
            let ids = node.attrs.bibEntry
            ids = ids ? ids.split(',') : []
            let references = ids.map((id, index) => {
                let returnObj = {id: parseInt(id)}
                if (prefixes[index] && prefixes[index] !== '') {
                    returnObj['prefix'] = prefixes[index]
                }
                if (locators[index] && locators[index] !== '') {
                    returnObj['locator'] = locators[index]
                }
                return returnObj
            })
            node.attrs = {
                format: node.attrs.bibFormat,
                references
            }
            break
        case 'footnote':
            if (node.attrs && node.attrs.footnote) {
                node.attrs.footnote.forEach(childNode => {
                    convertNodeV1(childNode)
                })
            }
            break
    }
    if (node.content) {
        node.content.forEach(childNode => {
            convertNodeV1(childNode)
        })
    }
}

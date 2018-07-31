/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {DOMParser} from "prosemirror-model"

import {obj2Node} from "../exporter/tools/json"
import {docSchema} from "./document"
import {randomHeadingId, randomFigureId} from "./common"

export let getSettings = function(pmArticle) {
    let settings = Object.assign({}, pmArticle.attrs)
    return settings
}

export let updateDoc = function(doc, bibliography, docVersion) {
    /* This is to clean documents taking all the accepted formatting from older
       versions and outputting the current version of the doc format.
       Notice that the docVersion isn't the same as the version of the FW export
       file in Fidus Writer 3.0-3.2 (docVersion/FW file versions versions 0-1.X).
       While the FW file version also says something about what files could be
       available inside the FW zip, the doc_version refers to how the data is
       stored in those files.
       In general, an update to the doc_version will likely also trigger an
       update to the version of the FW export file, the reverse is not always
       true.
    */

    switch(docVersion) {
        case undefined: // Fidus Writer 1.1-3.0
        case 0: // Fidus Writer 3.1 prerelease
            doc = convertDocV0(doc)
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            break
        case 1: // Fidus Writer 3.1 prerelease
            doc = convertDocV1(doc)
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            break
        case 1.1: // Fidus Writer 3.1
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            break
        case 1.2: // Fidus Writer 3.2
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            break
        case 1.3: // Fidus Writer 3.3 prerelease
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            break
        case 2.0: // Fidus Writer 3.3
            doc = convertDocV20(doc)
    }
    return doc
}


let convertCitationsV0 = function(dom) {
    let citations = dom.querySelectorAll('span.citation')
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
    let fw31Footnotes = editorNode.querySelectorAll('footnote-marker')
    fw31Footnotes.forEach(footnote => {
        let contents = footnote.getAttribute('contents')
        let tmpNode = document.createElement('div')
        tmpNode.innerHTML = contents
        convertCitationsV0(tmpNode)
        footnote.setAttribute('data-footnote', tmpNode.innerHTML)
        footnote.removeAttribute('contents')
    })

    // Footnotes FW 1.1-3.0
    let fw11Footnotes = editorNode.querySelectorAll('footnote,span.footnote')
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
    doc = JSON.parse(JSON.stringify(doc))
    doc.contents = docContents
    return doc
}

let convertDocV1 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    convertNodeV1(returnDoc.contents)
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

let convertDocV11 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    convertNodeV11(returnDoc.contents)
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

let convertDocV12 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    convertNodeV12(returnDoc.contents)
    return returnDoc
}

let convertNodeV12 = function(node, ids = []) {
    switch (node.type) {
        case 'figure':
            let blockId = node.attrs.id
            while (!blockId || ids.includes(blockId)) {
                blockId = randomFigureId()
            }
            node.attrs.id = blockId
            ids.push(blockId)
            break
    }
    if (node.content) {
        node.content.forEach(childNode => {
            convertNodeV12(childNode, ids)
        })
    }
}

let convertDocV13 = function(doc, bibliography) {
    let returnDoc = Object.assign({}, doc)
    delete returnDoc.settings
    delete returnDoc.metadata
    returnDoc.bibliography = {}
    returnDoc.imageIds = []
    convertNodeV13(returnDoc.contents, returnDoc.bibliography, bibliography, returnDoc.imageIds)
    return returnDoc
}

let convertNodeV13 = function(node, shrunkBib, fullBib, imageIds) {
    switch (node.type) {
        case 'article':
            node.attrs.language = 'en-US'
            break
        case 'authors':
            let authorsText = node.content ? node.content.reduce(
                    (text, item) => item.type === 'text' ? text + item.text : text,
                    ''
                ) : ''
            node.content = authorsText.split(/[,;]/g).map(authorString => {
                let author = authorString.trim()
                if (!author.length) {
                    return false
                }
                let authorParts = author.split(' ')
                return {
                    type: 'author',
                    attrs: {
                        firstname: authorParts.length > 1 ? authorParts.shift() : false,
                        lastname: authorParts.join(' '),
                        institution: false,
                        email: false
                    }
                }
            }).filter(authorObj => authorObj)
            if (!node.content.length) {
                delete node.content
            }
            break
        case 'citation':
            node.attrs.references.forEach(ref => {
                let item = fullBib[ref.id]
                if (!item) {
                    item = {
                        fields: {"title":[{"type":"text","text":"Deleted"}]},
                        bib_type: "misc",
                        entry_key: "FidusWriter"
                    }
                }
                item = Object.assign({}, item)
                delete item.entry_cat
                shrunkBib[ref.id] = item
            })
            break
        case 'keywords':
                let keywordsText = node.content ? node.content.reduce(
                        (text, item) => item.type === 'text' ? text + item.text : text,
                        ''
                    ) : ''
                node.content = keywordsText.split(/[,;]/g).map(keywordString => {
                    let keyword = keywordString.trim()
                    if (!keyword.length) {
                        return false
                    }
                    return {
                        type: 'keyword',
                        attrs: {
                            keyword
                        }
                    }
                }).filter(keywordObj => keywordObj)
                if (!node.content.length) {
                    delete node.content
                }
                break
        case 'figure':
            if (isNaN(parseInt(node.attrs.image))) {
                node.attrs.image = false
            } else {
                imageIds.push(parseInt(node.attrs.image))
            }
            break
    }
    if (node.content) {
        node.content.forEach(childNode => {
            convertNodeV13(childNode, shrunkBib, fullBib, imageIds)
        })
    }
}

let convertDocV20 = function(doc) {
    let returnDoc = Object.assign({}, doc)
    delete(returnDoc.added)
    delete(returnDoc.is_owner)
    delete(returnDoc.revisions)
    delete(returnDoc.rights)
    delete(returnDoc.updated)
    if(returnDoc.contents.attrs) {
        returnDoc.contents.attrs.tracked = false
    }
    Object.values(returnDoc.comments).forEach(comment => {
        comment.username = comment.userName
        comment.isMajor = comment['review:isMajor']
        delete(comment.userAvatar)
        delete(comment.userName)
        delete(comment['review:isMajor'])
        if (comment.answers) {
            comment.answers.forEach(answer => {
                answer.username = answer.userName
                delete(answer.userAvatar)
                delete(answer.userName)
            })
        }
    })
    return returnDoc
}

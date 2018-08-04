/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/

import {obj2Node} from "../exporter/tools/json"
import {docSchema} from "./document"
import {randomHeadingId, randomFigureId} from "./common"

export let getSettings = function(pmArticle) {
    let settings = JSON.parse(JSON.stringify(pmArticle.attrs))
    return settings
}

export let updateDoc = function(doc, bibliography, docVersion) {
    /* This is to clean documents taking all the accepted formatting from older
       versions and outputting the current version of the doc format.
       Notice that the docVersion isn't the same as the version of the FW export
       file in Fidus Writer < 3.2 (docVersion/FW file versions versions -1.X).
       While the FW file version also says something about what files could be
       available inside the FW zip, the doc_version refers to how the data is
       stored in those files.
       In general, an update to the doc_version will likely also trigger an
       update to the version of the FW export file, the reverse is not always
       true.
    */

    switch(docVersion) {
        // Import from versions up to 3.0 no longer supported starting with Fidus Writer 3.5
        case 1: // Fidus Writer 3.1 prerelease
            doc = convertDocV1(doc)
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            break
        case 1.1: // Fidus Writer 3.1
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            break
        case 1.2: // Fidus Writer 3.2
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            break
        case 1.3: // Fidus Writer 3.3 prerelease
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            break
        case 2.0: // Fidus Writer 3.3
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            break
        case 2.1: // Fidus Writer 3.4
            doc = convertDocV21(doc)
            break
    }
    return doc
}

let convertDocV1 = function(doc) {
    let returnDoc = JSON.parse(JSON.stringify(doc))
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
    let returnDoc = JSON.parse(JSON.stringify(doc))
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
    let returnDoc = JSON.parse(JSON.stringify(doc))
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
    let returnDoc = JSON.parse(JSON.stringify(doc))
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
    let returnDoc = JSON.parse(JSON.stringify(doc))
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

let convertDocV21 = function(doc) {
    let returnDoc = JSON.parse(JSON.stringify(doc))
    Object.entries(returnDoc.comments).forEach(([commentId, comment]) => {
        delete(comment.id)
        comment.comment = comment.comment.split('\n').map(text =>
            ({type: 'paragraph', content: [{type: 'text', text}]})
        )
        if (comment.answers) {
            comment.answers.forEach(answer => {
                answer.id = answer.answerId ? String(answer.answerId) :
                    answer.id && String(answer.id) !== String(commentId) ? String(answer.id) :
                    String(Math.floor(Math.random() * 0xffffffff))
                delete(answer.answerId)
                answer.answer = answer.answer.split('\n').map(text =>
                    ({type: 'paragraph', content: [{type: 'text', text}]})
                )
            })
        }
    })
    return returnDoc
}

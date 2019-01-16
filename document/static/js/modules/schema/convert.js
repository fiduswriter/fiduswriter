/* To convert to and from how the document is stored in the database to how ProseMirror expects it.
 We use the DOM import for ProseMirror as the JSON we store in the database is really jsonized HTML.
*/
import {randomHeadingId, randomFigureId} from "./common"

export const getSettings = function(pmArticle) {
    const settings = JSON.parse(JSON.stringify(pmArticle.attrs))
    return settings
}

export const updateDoc = function(doc, bibliography, docVersion) {
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
            doc = convertDocV22(doc)
            break
        case 1.1: // Fidus Writer 3.1
            doc = convertDocV11(doc)
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            doc = convertDocV22(doc)
            break
        case 1.2: // Fidus Writer 3.2
            doc = convertDocV12(doc)
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            doc = convertDocV22(doc)
            break
        case 1.3: // Fidus Writer 3.3 prerelease
            doc = convertDocV13(doc, bibliography)
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            doc = convertDocV22(doc)
            break
        case 2.0: // Fidus Writer 3.3
            doc = convertDocV20(doc)
            doc = convertDocV21(doc)
            doc = convertDocV22(doc)
            break
        case 2.1: // Fidus Writer 3.4
            doc = convertDocV21(doc)
            doc = convertDocV22(doc)
            break
        case 2.2: // Fidus Writer 3.5.7
            doc = convertDocV22(doc)
            break
    }
    return doc
}

const convertDocV1 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    convertNodeV1(returnDoc.contents)
    return returnDoc
}

const convertNodeV1 = function(node) {
    let prefixes, locators, ids, references
    switch (node.type) {
        case 'citation':
            prefixes = node.attrs.bibBefore ? node.attrs.bibBefore.split(',,,') : []
            locators = node.attrs.bibPage ? node.attrs.bibPage.split(',,,') : []
            ids = node.attrs.bibEntry ? node.attrs.bibEntry.split(',') : []
            references = ids.map((id, index) => {
                const returnObj = {id: parseInt(id)}
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

const convertDocV11 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    convertNodeV11(returnDoc.contents)
    return returnDoc
}

const convertNodeV11 = function(node, ids = []) {
    let blockId
    switch (node.type) {
        case 'heading':
            blockId = node.attrs.id
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

const convertDocV12 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    convertNodeV12(returnDoc.contents)
    return returnDoc
}

const convertNodeV12 = function(node, ids = []) {
    let blockId
    switch (node.type) {
        case 'figure':
            blockId = node.attrs.id
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

const convertDocV13 = function(doc, bibliography) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    delete returnDoc.settings
    delete returnDoc.metadata
    returnDoc.bibliography = {}
    returnDoc.imageIds = []
    convertNodeV13(returnDoc.contents, returnDoc.bibliography, bibliography, returnDoc.imageIds)
    return returnDoc
}

const convertNodeV13 = function(node, shrunkBib, fullBib, imageIds) {
    let authorsText, keywordsText
    switch (node.type) {
        case 'article':
            node.attrs.language = 'en-US'
            break
        case 'authors':
            authorsText = node.content ? node.content.reduce(
                    (text, item) => item.type === 'text' ? text + item.text : text,
                    ''
                ) : ''
            node.content = authorsText.split(/[,;]/g).map(authorString => {
                const author = authorString.trim()
                if (!author.length) {
                    return false
                }
                const authorParts = author.split(' ')
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
                keywordsText = node.content ? node.content.reduce(
                        (text, item) => item.type === 'text' ? text + item.text : text,
                        ''
                    ) : ''
                node.content = keywordsText.split(/[,;]/g).map(keywordString => {
                    const keyword = keywordString.trim()
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

const convertDocV20 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
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

const convertNodeV21 = function(node) {
    let commentMark
    if (node.marks && (commentMark = node.marks.find(mark => mark.type==='comment'))) {
        commentMark.attrs.id = String(commentMark.attrs.id)
    }
    if (node.content) {
        node.content.forEach(childNode => convertNodeV21(childNode))
    }
}

const convertDocV21 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    convertNodeV21(returnDoc.contents)
    Object.entries(returnDoc.comments).forEach(([commentId, comment]) => {
        delete(comment.id)
        comment.assignedUser = false
        comment.assignedUsername = false
        comment.resolved = false
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

const convertNodeV22 = function(node, imageIds) {
    switch (node.type) {
        case 'figure':
            if (!isNaN(parseInt(node.attrs.image))) {
                imageIds.push(parseInt(node.attrs.image))
            }
            break
        default:
            break
    }
    if (node.content) {
        const deleteChildren = []
        node.content.forEach(childNode => {
            if (childNode.type==='text' && !childNode.text.length) {
                deleteChildren.push(childNode)
            } else {
                convertNodeV22(childNode, imageIds)
            }
        })
        node.content = node.content.filter(childNode => !deleteChildren.includes(childNode))
    }
}

const convertDocV22 = function(doc) {
    const returnDoc = JSON.parse(JSON.stringify(doc))
    returnDoc.imageIds = []
    convertNodeV22(returnDoc.contents, returnDoc.imageIds)
    Object.entries(returnDoc.comments).forEach(([_commentId, comment]) => {
        comment.comment.forEach(
            commentNode => convertNodeV22(commentNode, returnDoc.imageIds)
        )
        if (comment.answers) {
            comment.answers.forEach(answer => {
                answer.answer.forEach(
                    answerNode => convertNodeV22(answerNode, returnDoc.imageIds)
                )
            })
        }
    })
    return returnDoc
}

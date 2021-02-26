import {addAlert, postJson} from "../common"
import {getSettings} from "../schema/convert"
import {acceptAllNoInsertions} from "../editor/track"

export const getMissingDocumentListData = function(ids, documentList, schema) {
    // get extra data for the documents identified by the ids and updates the
    // documentList correspondingly.
    const incompleteIds = []

    ids.forEach(id => {
        if (!documentList.find(doc => doc.id === parseInt(id)).hasOwnProperty('contents')) {
            incompleteIds.push(parseInt(id))
        }
    })

    if (incompleteIds.length > 0) {
        return postJson(
            '/api/document/documentlist/extra/',
            {
                ids: incompleteIds.join(',')
            }
        ).then(
            ({json}) => {
                json.documents.forEach(
                    extraValues => {
                        const doc = documentList.find(entry => entry.id === extraValues.id)
                        doc.content = acceptAllNoInsertions(
                            schema.nodeFromJSON(
                                {type: 'doc', content: [extraValues.content]}
                            )
                        ).firstChild.toJSON()
                        doc.comments = extraValues.comments
                        doc.bibliography = extraValues.bibliography
                        doc.images = extraValues.images
                        doc.settings = getSettings(doc.content)
                    }
                )
            }
        ).catch(
            error => {
                addAlert('error', gettext('Could not obtain extra document data'))
                throw error
            }
        )


    } else {
        return Promise.resolve()
    }
}

export const getDocTitle = function(doc) {
    if (!doc.path.length || doc.path.endsWith('/')) {
        return doc.title
    }
    return doc.path.split('/').pop()
}

export const moveFile = function(fileId, title, path, moveUrl) {
    path = path.replace(/\/{2,}/g, '/') // replace multiple backslashes
    if (path.endsWith(title || gettext('Untitled'))) {
        path = path.split('/').slice(0, -1).join('/') + '/'
    }
    if (!path.startsWith('/')) {
        path = '/' + path
    }
    if (path === '/') {
        path = ''
    }
    return new Promise((resolve, reject) => {
        postJson(
            moveUrl,
            {id: fileId, path}
        ).then(
            ({json}) => {
                if (json.done) {
                    resolve(path)
                } else {
                    reject()
                }
            }
        )
    })

}

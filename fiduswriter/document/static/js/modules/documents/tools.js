import {addAlert, postJson} from "../common"
import {getSettings} from "../schema/convert"
import {acceptAllNoInsertions} from "../editor/track"

export const getMissingDocumentListData = function(ids, documentList, schema, rawContent = false) {
    // get extra data for the documents identified by the ids and updates the
    // documentList correspondingly.
    const incompleteIds = []
    ids.forEach(id => {
        if (!documentList.find(doc => doc.id === parseInt(id)).hasOwnProperty('content')) {
            incompleteIds.push(parseInt(id))
        } else if (rawContent && !documentList.find(doc => doc.id === parseInt(id)).hasOwnProperty('rawContent')) {
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
                        if (rawContent) {
                            doc.rawContent = JSON.parse(JSON.stringify(extraValues.content))
                        }
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

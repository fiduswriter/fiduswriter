import {addAlert, postJson} from "../common"
import {getSettings} from "../schema/convert"

export const getMissingDocumentListData = function(ids, documentList) {
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
            '/document/documentlist/extra/',
            {
                ids: incompleteIds.join(',')
            }
        ).then(
            ({json}) => {
                json.documents.forEach(
                    extraValues => {
                        const doc = documentList.find(entry => entry.id === extraValues.id)
                        doc.contents = JSON.parse(extraValues.contents)
                        doc.comments = JSON.parse(extraValues.comments)
                        doc.bibliography = JSON.parse(extraValues.bibliography)
                        doc.images = extraValues.images
                        doc.settings = getSettings(doc.contents)
                    }
                )
            }
        ).catch(
            () => {
                addAlert('error', gettext('Could not obtain extra document data'))
            }
        )


    } else {
        return Promise.resolve()
    }

}

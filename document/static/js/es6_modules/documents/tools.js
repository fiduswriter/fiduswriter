import {addAlert, csrfToken} from "../common"
import {updateDoc} from "../schema/convert"

export let getMissingDocumentListData = function (ids, documentList) {
    // get extra data for the documents identified by the ids and updates the
    // documentList correspondingly.
    let incompleteIds = []

    for (let i = 0; i < ids.length; i++) {
        if (!documentList.find(doc => doc.id === parseInt(ids[i])).hasOwnProperty('contents')) {
            incompleteIds.push(parseInt(ids[i]))
        }
    }
    if (incompleteIds.length > 0) {
        return new Promise((resolve, reject) => {
            jQuery.ajax({
                url: '/document/documentlist/extra/',
                data: {
                    ids: incompleteIds.join(',')
                },
                type: 'POST',
                dataType: 'json',
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) =>
                    xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: (response, textStatus, jqXHR) => {
                    for (let i = 0; i < response.documents.length; i++) {
                        let aDocument = documentList.find(doc => id === response.documents[i].id)
                        let newDoc = updateDoc({
                            contents: JSON.parse(response.documents[i].contents),
                            metadata: JSON.parse(response.documents[i].metadata),
                            comments: JSON.parse(response.documents[i].comments),
                            settings: JSON.parse(response.documents[i].settings)
                        })
                        aDocument.contents = newDoc.contents
                        aDocument.metadata = newDoc.metadata
                        aDocument.comments = newDoc.comments
                        aDocument.settings = newDoc.settings
                    }
                    resolve()
                },
                error: (jqXHR, textStatus, errorThrown) => {
                    addAlert('error', jqXHR.responseText)
                    reject()
                }
            })
        })

    } else {
        return Promise.resolve()
    }

}

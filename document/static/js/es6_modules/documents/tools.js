import {addAlert, csrfToken} from "../common"
import {getSettings} from "../schema/convert"

export let getMissingDocumentListData = function (ids, documentList) {
    // get extra data for the documents identified by the ids and updates the
    // documentList correspondingly.
    let incompleteIds = []

    ids.forEach(id => {
        if (!documentList.find(doc => doc.id === parseInt(id)).hasOwnProperty('contents')) {
            incompleteIds.push(parseInt(id))
        }
    })

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
                    response.documents.forEach(
                        extraValues => {
                            let doc = documentList.find(entry => entry.id === extraValues.id)
                            doc.contents = JSON.parse(extraValues.contents)
                            doc.comments = JSON.parse(extraValues.comments)
                            doc.bibliography = JSON.parse(extraValues.bibliography)
                            doc.images = extraValues.images
                            doc.settings = getSettings(doc.contents)
                        }
                    )
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

import {addAlert, csrfToken} from "../common"
import {getSettings} from "../schema/convert"

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
                        let aDocument = documentList.find(doc => doc.id === response.documents[i].id)
                        aDocument.contents = JSON.parse(response.documents[i].contents)
                        aDocument.comments = JSON.parse(response.documents[i].comments)
                        aDocument.bibliography = JSON.parse(response.documents[i].bibliography)
                        aDocument.settings = getSettings(aDocument.contents)
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

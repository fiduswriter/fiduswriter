import {addAlert, csrfToken} from "../common/common"

export let getMissingDocumentListData = function (ids, documentList, callback) {
    // get extra data for the documents identified by the ids and updates the
    // documentList correspondingly.
    let incompleteIds = []

    for (let i = 0; i < ids.length; i++) {
        if (!(_.findWhere(documentList, {
            id: parseInt(ids[i])
        }).hasOwnProperty('contents'))) {
            incompleteIds.push(parseInt(ids[i]))
        }
    }
    if (incompleteIds.length > 0) {
        jQuery.ajax({
            url: '/document/documentlist/extra/',
            data: {
                ids: incompleteIds.join(',')
            },
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                for (let i = 0; i < response.documents.length; i++) {
                    let aDocument = _.findWhere(documentList, {
                        id: response.documents[i].id
                    })
                    aDocument.contents = JSON.parse(response.documents[i].contents)
                    aDocument.comments = JSON.parse(response.documents[i].comments)
                    aDocument.metadata = JSON.parse(response.documents[
                        i].metadata)
                    aDocument.settings = JSON.parse(response.documents[
                        i].settings)
                }
                if (callback) {
                    callback()
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', jqXHR.responseText)
            },
        })
    } else {
        callback()
    }

}

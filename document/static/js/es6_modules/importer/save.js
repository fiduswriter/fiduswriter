export let createNewDocument = function (aDocument) {
    let postData = {
        title: aDocument.title,
        contents: JSON.stringify(aDocument.contents),
        settings: JSON.stringify(aDocument.settings),
        metadata: JSON.stringify(aDocument.metadata)
    }
    jQuery.ajax({
            url: '/document/import/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (data, textStatus, jqXHR) {
                jQuery.addAlert('info', aDocument.title + gettext(
                        ' successfully imported.'))
                let aDocumentValues = {
                    last_diffs: [],
                    is_owner: true,
                    rights: 'w',
                    changed: false,
                    titleChanged: false
                }
                aDocument.id = data['document_id']
                if (window.theEditor) {
                    aDocument.owner = {
                        id: theEditor.user.id,
                        name: theEditor.user.name,
                        avatar: theEditor.user.avatar
                    }
                } else {
                    aDocument.owner = {
                        id: theUser.id,
                        name: theUser.name,
                        avatar: theUser.avatar
                    }
                }
                aDocument.version = 0
                aDocument.comment_version = 0
                aDocument.added = data['added']
                aDocument.updated = data['updated']
                aDocument.revisions = []
                if (typeof (theDocumentList) !== 'undefined') {
                    theDocumentList.push(aDocument)
                    documentHelpers.stopDocumentTable()
                    jQuery('#document-table tbody').append(
                        tmp_documents_list_item({
                                aDocument: aDocument
                            }))
                    documentHelpers.startDocumentTable()
                } else if (typeof (theEditor) !== 'undefined') {
                    if (theEditor.docInfo.rights ==='r') {
                        // We only had right access to the document, so the editing elements won't show. We therefore need to reload the page to get them.
                        window.location = '/document/'+aDocument.id+'/'
                    } else {
                        window.theEditor.doc = aDocument
                        window.theEditor.docInfo = aDocumentValues
                        window.history.pushState("", "", "/document/"+theEditor.doc.id+"/")
                    }
                }
            },
            error: function () {
                jQuery.addAlert('error', gettext('Could not save ') +
                    aDocument.title)
            },
            complete: function () {
                jQuery.deactivateWait()
            }
        })
}

import {exportNative} from "./native"
import {ImportNative} from "../importer/native"


let afterCopy = function(noErrors, returnValue, editor, callback) {
    $.deactivateWait();
    if (noErrors) {
        let aDocument = returnValue.aDocument
        let aDocInfo = returnValue.aDocumentValues
        jQuery.addAlert('info', aDocument.title + gettext(
                ' successfully copied.'));
        if (editor) {
            if (editor.docInfo.rights ==='r') {
                // We only had right access to the document, so the editing elements won't show. We therefore need to reload the page to get them.
                window.location = '/document/'+aDocument.id+'/'
            } else {
                editor.doc = aDocument
                editor.docInfo = aDocInfo
                window.history.pushState("", "", "/document/"+editor.doc.id+"/")
            }
        }
        if (callback) {
            callback(returnValue)
        }
    } else {
        jQuery.addAlert('error', returnValue)
    }
}

let importAsUser = function(aDocument, shrunkImageDB, shrunkBibDB,
    images, editor, user, callback) {
    // switch to user's own ImageDB and BibDB:
    if (editor) {
        editor.doc.owner = editor.user
        delete window.ImageDB
        delete window.BibDB
    }

    new ImportNative(aDocument, shrunkBibDB, shrunkImageDB, images, user, function(noErrors, returnValue) {
        afterCopy(noErrors, returnValue, editor, callback)
    })
}

export let savecopy = function(aDocument, editor, user, callback) {
    if (editor) {
        exportNative(aDocument, ImageDB, BibDB, function(aDocument, shrunkImageDB, shrunkBibDB, images){
            importAsUser(aDocument, shrunkImageDB, shrunkBibDB, images, editor, user, callback)
        })
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function(
            aBibDB) {
            usermediaHelpers.getAnImageDB(aDocument.owner,
                function(anImageDB) {
                    exportNative(aDocument, anImageDB,
                        aBibDB, function(aDocument, shrunkImageDB, shrunkBibDB, images){
                            importAsUser(aDocument, shrunkImageDB, shrunkBibDB, images, false, user, callback)
                        })
                })
        })
    }

}

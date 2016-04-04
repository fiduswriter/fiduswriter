import {exportNative} from "./native"
import {ImportNative} from "../importer/native"
import {BibliographyDB} from "../bibliography/database"

let afterCopy = function(noErrors, returnValue, callback) {
    $.deactivateWait();
    if (noErrors) {
        let aDocument = returnValue.aDocument
        let aDocInfo = returnValue.aDocumentValues
        jQuery.addAlert('info', aDocument.title + gettext(
                ' successfully copied.'));
        if (callback) {
            callback(aDocument, aDocInfo)
        }
    } else {
        jQuery.addAlert('error', returnValue)
    }
}

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export let savecopy = function(doc, oldBibDB, oldImageDB, newBibDB, newImageDB, newUser, callback) {
    exportNative(doc, oldImageDB, oldBibDB, function(doc, shrunkImageDB, shrunkBibDB, images){
        new ImportNative(doc, shrunkBibDB, shrunkImageDB, newBibDB, newImageDB, images, newUser,
            function(noErrors, returnValue) {
                afterCopy(noErrors, returnValue, callback)
            }
        )
    })
}

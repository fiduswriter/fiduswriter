import {exportNative} from "./index"
import {ImportNative} from "../../importer/native"
import {BibliographyDB} from "../../bibliography/database"
import {deactivateWait, addAlert} from "../../common/common"


let afterCopy = function(noErrors, returnValue, callback) {
    deactivateWait()
    if (noErrors) {
        let [doc, docInfo] = returnValue

        addAlert('info', doc.title + gettext(
                ' successfully copied.'))
        if (callback) {
            callback(doc, docInfo)
        }
    } else {
        addAlert('error', returnValue)
    }
}

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export let savecopy = function(doc, oldBibDB, oldImageDB, newBibDB, newImageDB, newUser, callback) {
    exportNative(
        doc,
        oldImageDB,
        oldBibDB,
        (doc, shrunkImageDB, shrunkBibDB, images) => {
            new ImportNative(
                doc,
                shrunkBibDB,
                shrunkImageDB,
                images,
                newUser,
                newBibDB,
                newImageDB,
                (noErrors, returnValue) => afterCopy(noErrors, returnValue, callback)
            )
        }
    )
}

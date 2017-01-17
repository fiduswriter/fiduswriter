import {exportNative} from "./index"
import {ImportNative} from "../../importer/native"
import {deactivateWait, addAlert} from "../../common"


//let afterCopy = function({doc, docInfo}) {
//    deactivateWait()
    //if (noErrors) {
    //    let [doc, docInfo] = returnValue

//    addAlert('info', doc.title + gettext(' successfully copied.'))
//    return Promise.resolve({doc, docInfo})
    //} else {
    //    addAlert('error', returnValue)
    //    return Promise.reject()
    //}
//}

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export let saveCopy = function(
    doc,
    oldBibDB,
    oldImageDB,
    newBibDB,
    newImageDB,
    newUser
) {
    return exportNative(
        doc,
        oldImageDB,
        oldBibDB
    ).then(
        ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
            let importer = new ImportNative(
                doc,
                shrunkBibDB,
                shrunkImageDB,
                httpIncludes,
                newUser,
                newBibDB,
                newImageDB
            )
            return importer.init()
    }).then(
        ({doc, docInfo}) => {
            addAlert('info', doc.title + gettext(' successfully copied.'))
            return Promise.resolve({doc, docInfo})
        }
    )
}

import {ImportNative} from "../../importer/native"
import {deactivateWait, addAlert} from "../../common"
import {ShrinkFidus} from "./shrink"


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
    let shrinker = new ShrinkFidus(doc, oldImageDB, oldBibDB)
    return shrinker.init().then(
        ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
            console.log([doc, shrunkImageDB, newUser])

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

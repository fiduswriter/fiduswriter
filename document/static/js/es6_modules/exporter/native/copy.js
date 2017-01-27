import {ImportNative} from "../../importer/native"
import {deactivateWait, addAlert} from "../../common"
import {ShrinkFidus} from "./shrink"

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export class SaveCopy {
    constructor (doc, oldBibDB, oldImageDB, newBibDB, newImageDB, newUser) {
        this.doc = doc
        this.oldBibDB = oldBibDB
        this.oldImageDB = oldImageDB
        this.newBibDB = newBibDB
        this.newImageDB = newImageDB
        this.newUser = newUser
    }

    init() {
        let shrinker = new ShrinkFidus(this.doc, this.oldImageDB, this.oldBibDB)
        return shrinker.init().then(
            ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                let importer = new ImportNative(
                    doc,
                    shrunkBibDB,
                    shrunkImageDB,
                    httpIncludes,
                    this.newUser,
                    this.newBibDB,
                    this.newImageDB
                )
                return importer.init()
        }).then(
            ({doc, docInfo}) => {
                addAlert('info', doc.title + gettext(' successfully copied.'))
                return Promise.resolve({doc, docInfo})
            }
        )
    }
}

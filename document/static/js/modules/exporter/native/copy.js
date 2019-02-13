import {ImportNative} from "../../importer/native"
import {addAlert} from "../../common"
import {ShrinkFidus} from "./shrink"

/* Saves a copy of the document. The owner may change in that process, if the
  old document was owned by someone else than the current user.
*/
export class SaveCopy {
    constructor(doc, bibDB, imageDB, newUser) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.newUser = newUser
    }

    init() {
        const shrinker = new ShrinkFidus(this.doc, this.imageDB, this.bibDB)
        return shrinker.init().then(
            ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                const importer = new ImportNative(
                    doc,
                    shrunkBibDB,
                    shrunkImageDB,
                    httpIncludes,
                    this.newUser
                )
                return importer.init()
        }).then(
            ({doc, docInfo}) => {
                addAlert('info', `${doc.title} ${gettext(' successfully copied.')}`)
                return Promise.resolve({doc, docInfo})
            }
        )
    }
}

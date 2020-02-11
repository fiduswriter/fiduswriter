import {ZipFidus} from "./zip"
import {ShrinkFidus} from "./shrink"
import {createSlug} from "../tools/file"
import {addAlert, postJson} from "../../common"


/** Create a Fidus Writer document and upload it to the server as a backup.
 * @function uploadNative
 * @param editor The editor from which to upload the document.
 */

export class SaveRevision {
    constructor(doc, imageDB, bibDB, note) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.note = note
    }

    init() {
        const shrinker = new ShrinkFidus(
            this.doc,
            this.imageDB,
            this.bibDB
        )

        shrinker.init().then(
            ({shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                const zipper = new ZipFidus(this.doc, shrunkImageDB, shrunkBibDB, httpIncludes)
                return zipper.init()
            }
        ).then(
            blob => this.uploadRevision(blob)
        ).catch(
            (error)=>{
                addAlert('error', gettext("Revision file could not be generated."))
                throw (error)
            }
        )
    }

    uploadRevision(blob) {

        postJson('/api/document/upload/', {
            note: this.note,
            file: {
                file: blob,
                filename: createSlug(this.doc.title) + '.fidus'
            },
            document_id: this.doc.id
        }).then(
            () => {
                addAlert('success', gettext('Revision saved'))
            },
            () => addAlert('error', gettext('Revision could not be saved.'))
        ).catch(
            (error)=>{
                throw (error)
            }
        )
    }

}

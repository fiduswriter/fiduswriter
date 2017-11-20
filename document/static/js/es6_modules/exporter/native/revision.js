import {ZipFidus} from "./zip"
import {ShrinkFidus} from "./shrink"
import {createSlug} from "../tools/file"
import {addAlert, csrfToken} from "../../common"

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
        let shrinker = new ShrinkFidus(
            this.doc,
            this.imageDB,
            this.bibDB
        )

        shrinker.init().then(
            ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                let zipper = new ZipFidus(this.doc, shrunkImageDB, shrunkBibDB, httpIncludes)
                return zipper.init()
            }
        ).then(
            blob => this.uploadRevision(blob)
        )
    }

    uploadRevision(blob) {

        let data = new window.FormData()
        data.append('note', this.note)
        data.append('file', blob, createSlug(this.doc.title) + '.fidus')
        data.append('document_id', this.doc.id)
        data.append('csrfmiddlewaretoken', csrfToken)

        fetch('/document/upload/', {
                method: 'POST',
                credentials: 'same-origin',
                body: data
            }).then(
                () => addAlert('success', gettext('Revision saved')),
                () => addAlert('error', gettext('Revision could not be saved.'))
            )
    }

}

import {ProseMirror} from "prosemirror/dist/edit/main"
import {Step} from "prosemirror/dist/transform"
import {collabEditing} from "prosemirror/dist/collab"
import {modelToEditor, editorToModel, updateDoc, setDocDefaults} from "../../schema/convert"
import {docSchema} from "../../schema/document"
import {addAlert, csrfToken} from "../../common/common"

// To apply all diffs to documents.

export class UpdateAllDocs {
    constructor() {
        this.batch = 1
    }

    init() {
        this.getNewBatch()
    }

    getNewBatch() {
        let that = this
        jQuery.ajax({
          url: "/document/update_all/get_all/",
          type: 'POST',
          dataType: 'json',
          crossDomain: false, // obviates need for sameOrigin test
          beforeSend: function(xhr, settings) {
              xhr.setRequestHeader("X-CSRFToken", csrfToken)
          },
          data: {
              batch: this.batch++
          },
          success: function(data) {
              let docs = window.JSON.parse(data.docs)
              if (docs.length) {
                  addAlert('info', gettext('Downloaded batch: ') + that.batch)
                  docs.forEach(function(doc){
                      that.fixDoc(doc)
                  })
                  that.getNewBatch()
              }
          }
        })
    }

    fixDoc(doc) {
        let newDoc = {
            contents: window.JSON.parse(doc.fields.contents),
            diff_version: doc.fields.diff_version,
            last_diffs: window.JSON.parse(doc.fields.last_diffs),
            metadata: window.JSON.parse(doc.fields.metadata),
            settings: window.JSON.parse(doc.fields.settings),
            title: doc.fields.title,
            version: doc.fields.version,
            id: doc.pk
        }

        // updates doc to the newest evrsion
        doc = updateDoc(newDoc)

        // only proceed with saving if the doc update has changed something or there
        // are last diffs
        if (doc !== newDoc || doc.last_diffs.length > 0) {
            setDocDefaults(doc)
            if (doc.last_diffs.length > 0) {
                this.applyDiffs(doc)
            }
            this.saveDoc(doc)
        }



    }

    applyDiffs(doc) {

        let pm = new ProseMirror({
            place: null,
            schema: docSchema,
            plugins: [collabEditing.config({version: 0})]
        })
        // add mod to give us simple access to internals removed in PM 0.8.0
        pm.mod = {}
        pm.mod.collab = collabEditing.get(pm)
        // Ignore setDoc
        pm.on.beforeSetDoc.remove(pm.mod.collab.onSetDoc)
        pm.mod.collab.onSetDoc = function (){}
        // Trigger reset on setDoc
        pm.mod.collab.afterSetDoc = function (){
            // Reset all collab values and set document version
            let collab = pm.mod.collab
            collab.versionDoc = pm.doc
            collab.unconfirmedSteps = []
            collab.unconfirmedMaps = []
        }
        pm.on.setDoc.add(pm.mod.collab.afterSetDoc)

        let pmDoc = modelToEditor({contents: doc.contents, metadata: doc.metadata})
        pm.setDoc(pmDoc)
        let unappliedDiffs = doc.diff_version - doc.version

        doc.last_diffs = doc.last_diffs.slice(doc.last_diffs.length - unappliedDiffs)
        while (doc.last_diffs.length > 0) {
            let diff = doc.last_diffs.shift()
            let steps = [diff].map(j => Step.fromJSON(docSchema, j))
            let client_ids = [diff].map(j => j.client_id)
            pm.mod.collab.receive(steps, client_ids)
        }
        let newDoc = editorToModel(pm.doc)
        doc.contents = newDoc.contents
        doc.metadata = newDoc.metadata
        doc.version = doc.diff_version
        return
    }

    saveDoc(doc) {
        let that = this

        doc.contents = window.JSON.stringify(doc.contents)
        doc.metadata = window.JSON.stringify(doc.metadata)
        doc.settings = window.JSON.stringify(doc.settings)
        doc.last_diffs = window.JSON.stringify(doc.last_diffs)
        jQuery.ajax({
            url: "/document/update_all/save_doc/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
              xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            data: doc,
            success: function(data) {
             addAlert('success', gettext('The document has been updated: ') + doc.id)
            }
        })
    }
}

export let applyAllDiffs = function(contents, metadata, last_diffs) {


}

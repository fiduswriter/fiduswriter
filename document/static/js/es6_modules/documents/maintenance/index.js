import {ProseMirror} from "prosemirror/dist/edit/main"
import {Step} from "prosemirror/dist/transform"
import {collabEditing} from "prosemirror/dist/collab"
import {modelToEditor, editorToModel, updateDoc, setDocDefaults} from "../../schema/convert"
import {docSchema} from "../../schema/document"
import {addAlert, csrfToken} from "../../common/common"
import {Menu} from "../../menu/menu"

// To apply all diffs to documents.

export class DocMaintenance {
    constructor() {
        this.batch = 1
        this.button = false
        this.batchesDone = false
        this.savesLeft = 0
        new Menu('maintenance')
    }

    bind() {
        let that = this
        jQuery(document).on('click', 'button#update:not(.disabled)', function(){
            that.button = this
            jQuery(that.button).addClass('disabled fw-dark')
            jQuery(that.button).removeClass('fw-orange')
            jQuery(that.button).html(gettext('Updating'))
            that.init()
        })
    }

    init() {
        this.getNewBatch()
    }

    getNewBatch() {
        let that = this
        jQuery.ajax({
          url: "/document/maintenance/get_all/",
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
              } else {
                  that.batchesDone = true
                  if (that.savesLeft===0) {
                      that.done()
                  }
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
            try {
                let diff = doc.last_diffs.shift()
                let steps = [diff].map(j => Step.fromJSON(docSchema, j))
                let client_ids = [diff].map(j => j.client_id)
                pm.mod.collab.receive(steps, client_ids)
            } catch (error) {
                addAlert('error', gettext('Discarded useless diffs for: ') + doc.id)
                doc.last_diffs = []
            }
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
        this.savesLeft++
        jQuery.ajax({
            url: "/document/maintenance/save_doc/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            data: doc,
            success: function(data) {
                addAlert('success', gettext('The document has been updated: ') + doc.id)
                that.savesLeft--
                if (that.savesLeft===0 && that.batchesDone) {
                    that.done()
                }
            }
        })
    }

    done() {
        jQuery(this.button).html(gettext('Update done!'))
    }
}

export let applyAllDiffs = function(contents, metadata, last_diffs) {


}

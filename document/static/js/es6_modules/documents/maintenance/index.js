import {ProseMirror} from "prosemirror/dist/edit/main"
import {Step} from "prosemirror/dist/transform"
import {collabEditing} from "prosemirror/dist/collab"
import {updateFileDoc} from "../../importer/file"
import {modelToEditor, editorToModel, setDocDefaults, updateDoc} from "../../schema/convert"
import {docSchema} from "../../schema/document"
import {addAlert, csrfToken} from "../../common/common"
import {Menu} from "../../menu/menu"
import {FW_FILETYPE_VERSION} from "../../exporter/native"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

// To apply all diffs to documents.

export class DocMaintenance {
    constructor() {
        this.batch = 1
        this.button = false
        this.batchesDone = false
        this.docSavesLeft = 0
        this.revSavesLeft = 0
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
        this.getDocBatch()
    }

    getDocBatch() {
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
                  that.getDocBatch()
              } else {
                  that.batchesDone = true
                  if (that.docSavesLeft===0) {
                      that.updateRevisions()
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

        // updates doc to the newest version
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
        this.docSavesLeft++
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
                that.docSavesLeft--
                if (that.docSavesLeft===0 && that.batchesDone) {
                    addAlert('success', gettext('All documents updated!'))
                    that.updateRevisions()
                }
            }
        })
    }

    updateRevisions() {
        let that = this
        addAlert('info', gettext('Updating saved revisions.'))
        jQuery.ajax({
            url: "/document/maintenance/get_all_revision_ids/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            data: {},
            success: function(data) {
                that.revSavesLeft = data.revision_ids.length
                if (that.revSavesLeft) {
                    data.revision_ids.forEach(function(revId){
                        that.updateRevision(revId)
                    })
                } else {
                    that.done()
                }
            }
        })
    }

    updateRevision(id) {
        let that = this
        JSZipUtils.getBinaryContent(`/document/get_revision/${id}/`, function(err, fidusFile) {
            let zipfs = new JSZip()
            zipfs.loadAsync(fidusFile).then(function(){
                let openedFiles = {}, p = []
                // We don't open other files as they currently don't need to be changed.
                let fileNames = ["filetype-version","document.json"]

                fileNames.forEach((fileName) => {
                    p.push(zipfs.files[fileName].async("text").then((fileContent) => {
                        openedFiles[fileName] = fileContent
                    }))
                })
                window.Promise.all(p).then(function(){
                    let doc = window.JSON.parse(openedFiles["document.json"])
                    let filetypeVersion = openedFiles["filetype-version"]
                    let newDoc = updateFileDoc(doc, filetypeVersion)
                    if (newDoc !== doc || filetypeVersion !== FW_FILETYPE_VERSION) {
                        zipfs.file("filetype-version", FW_FILETYPE_VERSION)
                        zipfs.file("document.json", window.JSON.stringify(newDoc))
                        that.saveRevision(id, zipfs)
                    } else {
                        that.revSavesLeft--
                        if (that.revSavesLeft===0) {
                            that.done()
                        }
                    }

                })
            })
        })
    }

    saveRevision(id, zipfs) {
        let that = this
        zipfs.generateAsync({type:"blob"}).then(function(blob) {
            let data = new window.FormData()
            data.append('file', blob, 'some_file.fidus')
            data.append('id', id)

            jQuery.ajax({
                url: '/document/maintenance/update_revision/',
                data: data,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: function(xhr, settings) {
                    xhr.setRequestHeader("X-CSRFToken", csrfToken)
                },
                success: function() {
                    addAlert('success', gettext('The revision has been updated: ') + id)
                    that.revSavesLeft--
                    if (that.revSavesLeft===0) {
                        that.done()
                    }
                }
            })
        })
    }

    done() {
        jQuery(this.button).html(gettext('All documents and revisions updated!'))
    }


}

export let applyAllDiffs = function(contents, metadata, last_diffs) {


}

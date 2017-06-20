import {ProseMirror} from "prosemirror-old/dist/edit/main"
import {Step} from "prosemirror-old/dist/transform"
import {collabEditing} from "prosemirror-old/dist/collab"
import {updateFileDoc, updateFileBib} from "../importer/file"
import {updateDoc, getMetadata, getSettings} from "../schema/convert"
import {docSchema} from "../schema/document"
import {addAlert, csrfToken} from "../common"
import {Menu} from "../menu"
import {FW_FILETYPE_VERSION} from "../exporter/native"
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
        jQuery(document).on('click', 'button#update:not(.disabled)', () => {
            this.button = this
            jQuery(this.button).addClass('disabled fw-dark')
            jQuery(this.button).removeClass('fw-orange')
            jQuery(this.button).html(gettext('Updating'))
            this.init()
        })
    }

    init() {
        this.getDocBatch()
    }

    getDocBatch() {
        jQuery.ajax({
          url: "/document/maintenance/get_all/",
          type: 'POST',
          dataType: 'json',
          crossDomain: false, // obviates need for sameOrigin test
          beforeSend: (xhr, settings) =>
              xhr.setRequestHeader("X-CSRFToken", csrfToken),
          data: {
              batch: this.batch++
          },
          success: data => {
              let docs = window.JSON.parse(data.docs)
              if (docs.length) {
                  addAlert('info', gettext('Downloaded batch: ') + this.batch)
                  docs.forEach(doc => this.fixDoc(doc))
                  this.getDocBatch()
              } else {
                  this.batchesDone = true
                  if (this.docSavesLeft===0) {
                      this.updateRevisions()
                  }
              }
          }
        })
    }

    fixDoc(doc) {
        let oldDoc = {
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
        doc = updateDoc(oldDoc)

        // only proceed with saving if the doc update has changed something or there
        // are last diffs
        if (doc !== oldDoc || doc.last_diffs.length > 0) {
            if (doc.last_diffs.length > 0) {
                this.applyDiffs(doc)
            }
            this.saveDoc(doc)
        }



    }

    applyDiffs(doc) {
        let pm = new ProseMirror({
            place: null,
            schema: docSchema
        })

        pm.setDoc(
            docSchema.nodeFromJSON({type:'doc', content:[doc.contents]})
        )
        let pmCollab = collabEditing.config({version: 0})
        pmCollab.attach(pm)
        let unappliedDiffs = doc.diff_version - doc.version

        doc.last_diffs = doc.last_diffs.slice(doc.last_diffs.length - unappliedDiffs)
        while (doc.last_diffs.length > 0) {
            try {
                let diff = doc.last_diffs.shift()
                let steps = [diff].map(j => Step.fromJSON(docSchema, j))
                let client_ids = [diff].map(j => j.client_id)
                pmCollab.receive(steps, client_ids)
            } catch (error) {
                addAlert('error', gettext('Discarded useless diffs for: ') + doc.id)
                doc.last_diffs = []
            }
        }
        let pmArticle = pm.doc.firstChild
        doc.contents = pmArticle.toJSON()
        doc.metadata = getMetadata(pmArticle)
        Object.assign(doc.settings, getSettings(pmArticle))
        doc.version = doc.diff_version
    }


    saveDoc(doc) {
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
            beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
            data: doc,
            success: data => {
                addAlert('success', gettext('The document has been updated: ') + doc.id)
                this.docSavesLeft--
                if (this.docSavesLeft===0 && this.batchesDone) {
                    addAlert('success', gettext('All documents updated!'))
                    this.updateRevisions()
                }
            }
        })
    }

    updateRevisions() {
        addAlert('info', gettext('Updating saved revisions.'))
        jQuery.ajax({
            url: "/document/maintenance/get_all_revision_ids/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
            data: {},
            success: data => {
                this.revSavesLeft = data.revision_ids.length
                if (this.revSavesLeft) {
                    data.revision_ids.forEach(revId => this.updateRevision(revId))
                } else {
                    this.done()
                }
            }
        })
    }

    updateRevision(id) {
        JSZipUtils.getBinaryContent(
            `/document/get_revision/${id}/`,
            (err, fidusFile) => {
            let zipfs = new JSZip()
            zipfs.loadAsync(fidusFile).then(() => {
                let openedFiles = {}, p = []
                // We don't open other files as they currently don't need to be changed.
                let fileNames = ["filetype-version","document.json","bibliography.json"]

                fileNames.forEach(fileName => {
                    p.push(zipfs.files[fileName].async("text").then((fileContent) => {
                        openedFiles[fileName] = fileContent
                    }))
                })
                Promise.all(p).then(() => {
                    let filetypeVersion = openedFiles["filetype-version"]
                    if (filetypeVersion !== FW_FILETYPE_VERSION) {
                        let doc = window.JSON.parse(openedFiles["document.json"])
                        let bib = window.JSON.parse(openedFiles["bibliography.json"])
                        let newDoc = updateFileDoc(doc, filetypeVersion)
                        let newBib = updateFileBib(bib, filetypeVersion)
                        zipfs.file("filetype-version", FW_FILETYPE_VERSION)
                        zipfs.file("document.json", window.JSON.stringify(newDoc))
                        zipfs.file("bibliography.json", window.JSON.stringify(newBib))
                        this.saveRevision(id, zipfs)
                    } else {
                        this.revSavesLeft--
                        if (this.revSavesLeft===0) {
                            this.done()
                        }
                    }

                })
            })
        })
    }

    saveRevision(id, zipfs) {
        zipfs.generateAsync({type:"blob"}).then(blob => {
            let data = new window.FormData()
            data.append('file', blob, 'some_file.fidus')
            data.append('id', id)

            jQuery.ajax({
                url: '/document/maintenance/update_revision/',
                data,
                type: 'POST',
                cache: false,
                contentType: false,
                processData: false,
                crossDomain: false, // obviates need for sameOrigin test
                beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
                success: () => {
                    addAlert('success', gettext('The revision has been updated: ') + id)
                    this.revSavesLeft--
                    if (this.revSavesLeft===0) {
                        this.done()
                    }
                }
            })
        })
    }

    done() {
        jQuery(this.button).html(gettext('All documents and revisions updated!'))
    }


}

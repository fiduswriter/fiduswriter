import {Step} from "prosemirror-transform"

import {updateFileDoc, updateFileBib} from "../importer/update"
import {updateDoc, getSettings} from "../schema/convert"
import {docSchema} from "../schema/document"
import {addAlert, csrfToken} from "../common"
import {FW_FILETYPE_VERSION} from "../exporter/native"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

// To upgrade all docs and document revions to the newest version

export class DocMaintenance {
    constructor() {
        this.batch = 0
        this.batchesDone = false
        this.docSavesLeft = 0
        this.revSavesLeft = 0
    }

    bind() {
        jQuery(document).on('click', 'button#update:not(.disabled)', () => {
            jQuery('button#update').prop('disabled', true)
            jQuery('button#update').html(gettext('Updating...'))
            this.init()
        })
    }

    init() {
        this.getDocBatch()
    }

    getDocBatch() {
        this.batch++
        jQuery.ajax({
          url: "/document/maintenance/get_all/",
          type: 'POST',
          dataType: 'json',
          crossDomain: false, // obviates need for sameOrigin test
          beforeSend: (xhr, settings) =>
              xhr.setRequestHeader("X-CSRFToken", csrfToken),
          data: {
              batch: this.batch
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
            last_diffs: window.JSON.parse(doc.fields.last_diffs),
            title: doc.fields.title,
            version: doc.fields.version,
            id: doc.pk
        }
        let docVersion = parseFloat(doc.fields.doc_version)
        return new Promise((resolve, reject) => {
            if (docVersion < 2) {
                // In version 0 - 1.x, the bibliography had to be loaded from
                // the document user.
                jQuery.ajax({
                    url: '/document/maintenance/get_user_biblist/',
                    data: {
                        'user_id': doc.fields.owner
                    },
                    type: 'POST',
                    dataType: 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) =>
                        xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success: (response, textStatus, jqXHR) => {
                        let bibDB = response.bibList.reduce((db, item) => {
                            let id = item['id']
                            let bibDBEntry = {}
                            bibDBEntry['fields'] = JSON.parse(item['fields'])
                            bibDBEntry['bib_type'] = item['bib_type']
                            bibDBEntry['entry_key'] = item['entry_key']
                            db[id] = bibDBEntry
                            return db
                        }, {})
                        resolve(bibDB)
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        addAlert('error', jqXHR.responseText)
                        reject()
                    }
                })
            } else {
                resolve(doc.bibliography)
            }
        }).then(bibliography => {
            // updates doc to the newest version
            doc = updateDoc(oldDoc, bibliography, docVersion)
            // only proceed with saving if the doc update has changed something
            if (doc !== oldDoc) {
                this.saveDoc(doc)
            }
        })
    }


    saveDoc(doc) {
        this.docSavesLeft++
        let p1 = new Promise(resolve => jQuery.ajax({
            url: "/document/maintenance/save_doc/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
            data: {
                id: doc.id,
                contents: window.JSON.stringify(doc.contents),
                bibliography: window.JSON.stringify(doc.bibliography),
                doc_version: parseFloat(FW_FILETYPE_VERSION),
                version: doc.version,
                last_diffs: window.JSON.stringify(doc.last_diffs)
            },
            success: () => resolve()
        })),
            p2 = new Promise(resolve => jQuery.ajax({
            url: "/document/maintenance/add_images_to_doc/",
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
            data: {
                doc_id: doc.id,
                ids: doc.imageIds
            },
            success: () => resolve()
        }))
        Promise.all([p1, p2]).then(() => {
            addAlert('success', `${gettext('The document has been updated')}: ${doc.id}`)
            this.docSavesLeft--
            if (this.docSavesLeft===0 && this.batchesDone) {
                addAlert('success', gettext('All documents updated!'))
                this.done()
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
                        let newBib = updateFileBib(bib, filetypeVersion)
                        let newDoc = updateFileDoc(doc, newBib, filetypeVersion)
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
        jQuery('button#update').html(gettext('All documents and revisions updated!'))
    }

}

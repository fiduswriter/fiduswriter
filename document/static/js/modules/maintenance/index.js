import {Step} from "prosemirror-transform"
import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {updateFileDoc, updateFileBib} from "../importer/update"
import {updateDoc, getSettings} from "../schema/convert"
import {docSchema} from "../schema/document"
import {addAlert, post, postJson, findTarget} from "../common"
import {FW_FILETYPE_VERSION} from "../exporter/native"

// To upgrade all docs and document revions to the newest version

export class DocMaintenance {
    constructor() {
        this.batch = 0
        this.batchesDone = false
        this.docSavesLeft = 0
        this.revSavesLeft = 0
    }

    bind() {
        document.addEventListener('click', event => {
            let el = {}
            switch (true) {
                case findTarget(event, 'button#update:not(.disabled)', el):
                    document.querySelector('button#update').disabled = true
                    document.querySelector('button#update').innerHTML = gettext('Updating...')
                    this.init()
                    break
                default:
                    break
            }
        })
    }

    init() {
        this.getDocBatch()
    }

    getDocBatch() {
        this.batch++
        postJson(
            '/document/maintenance/get_all/', {batch: this.batch}
        ).then(
            data => {
                let docs = window.JSON.parse(data.docs)
                if (docs.length) {
                    addAlert('info', `${gettext('Downloaded batch')}: ${this.batch}`)
                    docs.forEach(doc => this.fixDoc(doc))
                    this.getDocBatch()
                } else {
                    this.batchesDone = true
                    if (this.docSavesLeft===0) {
                        this.updateRevisions()
                    }
                }
            }
        ).catch(
            error => {
                addAlert('error', `${gettext('Could not download batch')}: ${this.batch}`)
                throw(error)
            }
        )
    }

    fixDoc(doc) {
        let oldDoc = {
            contents: window.JSON.parse(doc.fields.contents),
            last_diffs: window.JSON.parse(doc.fields.last_diffs),
            bibliography: window.JSON.parse(doc.fields.bibliography),
            comments: window.JSON.parse(doc.fields.comments),
            title: doc.fields.title,
            version: doc.fields.version,
            id: doc.pk
        }
        let docVersion = parseFloat(doc.fields.doc_version)
        return new Promise((resolve, reject) => {
            if (docVersion < 2) {
                // In version 0 - 1.x, the bibliography had to be loaded from
                // the document user.

                postJson(
                    '/document/maintenance/get_user_biblist/',
                    {
                        user_id: doc.fields.owner
                    }
                ).then(
                    response => {
                        resolve(response.bibList.reduce((db, item) => {
                            let id = item['id']
                            let bibDBEntry = {}
                            bibDBEntry['fields'] = JSON.parse(item['fields'])
                            bibDBEntry['bib_type'] = item['bib_type']
                            bibDBEntry['entry_key'] = item['entry_key']
                            db[id] = bibDBEntry
                            return db
                        }, {}))
                    }
                ).catch(
                    () => reject()
                )
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
        let p1 = post(
            '/document/maintenance/save_doc/',
            {
                id: doc.id,
                contents: window.JSON.stringify(doc.contents),
                bibliography: window.JSON.stringify(doc.bibliography),
                comments: window.JSON.stringify(doc.comments),
                doc_version: parseFloat(FW_FILETYPE_VERSION),
                version: doc.version,
                last_diffs: window.JSON.stringify(doc.last_diffs)
            }
        )
        let p2 = post(
            '/document/maintenance/add_images_to_doc/',
            {
                doc_id: doc.id,
                ids: doc.imageIds
            }
        )
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
        postJson(
            '/document/maintenance/get_all_revision_ids/'
        ).then(
            data => {
                this.revSavesLeft = data.revision_ids.length
                if (this.revSavesLeft) {
                    data.revision_ids.forEach(revId => this.updateRevision(revId))
                } else {
                    this.done()
                }
            }
        )
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
                    let filetypeVersion = parseFloat(openedFiles["filetype-version"])
                    if (filetypeVersion !== parseFloat(FW_FILETYPE_VERSION)) {
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
        zipfs.generateAsync({type:"blob", mimeType: "application/fidus+zip"}).then(blob => {

            post(
                '/document/maintenance/update_revision/',
                {
                    id,
                    file: {
                        file: blob,
                        filename: 'some_file.fidus'
                    }
                }
            ).then(
                () => {
                    addAlert('success', gettext('The revision has been updated: ') + id)
                    this.revSavesLeft--
                    if (this.revSavesLeft===0) {
                        this.done()
                    }
                }
            )
        })
    }

    done() {
        document.querySelector('button#update').innerHTML = gettext('All documents and revisions updated!')
    }

}

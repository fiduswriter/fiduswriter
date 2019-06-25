import JSZip from "jszip"
import JSZipUtils from "jszip-utils"

import {updateFile} from "../importer/update"
import {updateDoc} from "../schema/convert"
import {addAlert, post, postJson, findTarget, whenReady} from "../common"
import {FW_FILETYPE_VERSION} from "../exporter/native"

import {recreateBibliography} from "./tools"

// To upgrade all docs and document revions to the newest version

export class DocMaintenance {
    constructor({staticUrl}) {
        this.staticUrl = staticUrl
        this.batch = 0
        this.batchesDone = false
        this.docSavesLeft = 0
        this.revSavesLeft = 0
    }

    init() {
        whenReady().then(
            () => document.body.addEventListener('click', event => {
                const el = {}
                switch (true) {
                    case findTarget(event, 'input#update:not(.disabled)', el):
                        document.querySelector('input#update').disabled = true
                        document.querySelector('input#update').value = gettext('Updating...')
                        this.getDocBatch()
                        break
                    default:
                        break
                }
            })
        )

    }

    getDocBatch() {
        this.batch++
        postJson(
            '/document/maintenance/get_all/', {batch: this.batch}
        ).then(
            ({json}) => {
                const docs = window.JSON.parse(json.docs)
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
                throw (error)
            }
        )
    }

    fixDoc(doc) {
        const oldDoc = {
            contents: window.JSON.parse(doc.fields.contents),
            last_diffs: window.JSON.parse(doc.fields.last_diffs),
            bibliography: window.JSON.parse(doc.fields.bibliography),
            comments: window.JSON.parse(doc.fields.comments),
            title: doc.fields.title,
            version: doc.fields.version,
            id: doc.pk
        }
        const docVersion = parseFloat(doc.fields.doc_version)
        let p
        if (docVersion < 2) {
            // In version 0 - 1.x, the bibliography had to be loaded from
            // the document user.

            p = postJson(
                '/document/maintenance/get_user_biblist/',
                {
                    user_id: doc.fields.owner
                }
            ).then(
                ({json}) => {
                    return json.bibList.reduce((db, item) => {
                        const id = item['id']
                        const bibDBEntry = {}
                        bibDBEntry['fields'] = JSON.parse(item['fields'])
                        bibDBEntry['bib_type'] = item['bib_type']
                        bibDBEntry['entry_key'] = item['entry_key']
                        db[id] = bibDBEntry
                        return db
                    }, {})
                }
            )
        } else {
            p = Promise.resolve(doc.bibliography)
        }
        p.then(bibliography => {
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
        const p1 = post(
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
        ), promises = [p1]
        if (doc.imageIds) {
            const p2 = post(
                '/document/maintenance/add_images_to_doc/',
                {
                    doc_id: doc.id,
                    ids: doc.imageIds
                }
            )
            promises.push(p2)
        }
        Promise.all(promises).then(() => {
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
            '/document/maintenance/get_all_revisions/'
        ).then(
            ({json}) => {
                this.revSavesLeft = json.revisions.length
                if (this.revSavesLeft) {
                    json.revisions.forEach(([revId, ownerId]) => this.updateRevision(revId, ownerId))
                } else {
                    this.done()
                }
            }
        )
    }

    updateRevision(id, ownerId) {
        JSZipUtils.getBinaryContent(
            `/document/get_revision/${id}/`,
            (err, fidusFile) => {
            const zipfs = new JSZip()
            zipfs.loadAsync(fidusFile).then(() => {
                const openedFiles = {}, p = []
                // We don't open other files as they currently don't need to be changed.
                const fileNames = ["filetype-version", "document.json", "bibliography.json"]

                fileNames.forEach(fileName => {
                    p.push(zipfs.files[fileName].async("text").then((fileContent) => {
                        openedFiles[fileName] = fileContent
                    }))
                })
                Promise.all(p).then(
                    () => {
                        let mustUpdate = false
                        if (!openedFiles["bibliography.json"].length) {
                            mustUpdate = true
                            // File is corrupted. We try to recreate the bibliography
                            return postJson(
                                '/document/maintenance/get_user_biblist/',
                                {
                                    user_id: ownerId
                                }
                            ).then(
                                ({json}) => {
                                    const fullBib = json.bibList.reduce((db, item) => {
                                        const id = item['id']
                                        const bibDBEntry = {}
                                        bibDBEntry['fields'] = JSON.parse(item['fields'])
                                        bibDBEntry['bib_type'] = item['bib_type']
                                        bibDBEntry['entry_key'] = item['entry_key']
                                        db[id] = bibDBEntry
                                        return db
                                    }, {})
                                    const shrunkBib = {}
                                    const doc = window.JSON.parse(openedFiles["document.json"])
                                    recreateBibliography(shrunkBib, fullBib, doc.contents)
                                    openedFiles["bibliography.json"] = window.JSON.stringify(shrunkBib)
                                    return Promise.resolve({mustUpdate})
                                }
                            )
                        } else {
                            if (openedFiles["filetype-version"] !== parseFloat(FW_FILETYPE_VERSION)) {
                                mustUpdate = true
                            }
                            return Promise.resolve({mustUpdate})
                        }
                    }
                ).then(
                    ({mustUpdate}) => {
                    if (mustUpdate) {
                        const filetypeVersion = parseFloat(openedFiles["filetype-version"])
                        const {bibliography, doc} = updateFile(
                            window.JSON.parse(openedFiles["document.json"]),
                            window.JSON.parse(openedFiles["bibliography.json"]),
                            filetypeVersion
                        )
                        zipfs.file("filetype-version", FW_FILETYPE_VERSION)
                        zipfs.file("document.json", window.JSON.stringify(doc))
                        zipfs.file("bibliography.json", window.JSON.stringify(bibliography))
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
        document.querySelector('input#update').value = gettext('All documents and revisions updated!')
    }

}

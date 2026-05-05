/*
 Class to provide similar functionality for the document's imageDB to what the
 user's imageDb provides but using the document's websocket connection.
 Notice: It is not possible to directly upload images via this interface as
 images should not be uploaded via websocket. To add a new image to a document,
 the image needs to be uploaded first to the user's imageDB and can then be
 copied to the doc's imageDB. The IDs used are the same for user and document,
 as they originate from the Image model (not UserImage or DocumentImage).
 For E2EE documents, images are encrypted client-side and uploaded directly
 via a dedicated endpoint to an EncryptedDocumentImage model.
*/
import {addAlert, get, jsonPost, postJson} from "../../common"
export class ModImageDB {
    constructor(mod) {
        mod.imageDB = this
        this.mod = mod
        this.db = false
        this.unsent = []
        // cats always remain empty, as we don't use categories in doc images
        this.cats = []
    }

    setDB(db) {
        this.db = db
        this.unsent = []
    }

    mustSend() {
        // Set a timeout so that the update can be combines with other updates
        // if they happen more or less simultaneously.
        window.setTimeout(
            () => this.mod.editor.mod.collab.doc.sendToCollaborators(),
            100
        )
    }

    // This function only makes real sense in the user's imageDB. It is kept here
    // for compatibility reasons.
    getDB() {
        return new Promise(resolve => {
            window.setTimeout(() => resolve([]), 100)
        })
    }

    // Save an image directly for this document (E2EE only).
    // The image file is expected to be already encrypted client-side.
    saveImage(imageData) {
        const isE2EE = this.mod.editor.e2ee?.encrypted === true
        if (!isE2EE) {
            // Non-E2EE documents must use the user's imageDB
            return this.mod.editor.app.imageDB.saveImage(imageData)
        }

        // E2EE path: upload encrypted image directly to the document
        const postData = {
            doc_id: this.mod.editor.docInfo.id,
            title: imageData.title,
            copyright: JSON.stringify(imageData.copyright),
            checksum: imageData.checksum || 0
        }
        if (imageData.original_file_type) {
            postData.original_file_type = imageData.original_file_type
        }

        // postBare expects files wrapped as {file, filename}
        if (imageData.image) {
            postData.image = {
                file: imageData.image,
                filename: imageData.original_file_type
                    ? `image.${imageData.original_file_type.split("/").pop()}`
                    : "image.bin"
            }
        }

        return postJson("/api/document/e2ee_image/", postData)
            .then(({json}) => {
                const dbEntry = {
                    id: json.id,
                    title: imageData.title,
                    copyright: imageData.copyright,
                    image: json.image || "",
                    file_type: "application/octet-stream",
                    original_file_type:
                        json.original_file_type ||
                        imageData.original_file_type ||
                        "image/png",
                    checksum: imageData.checksum || 0,
                    cats: []
                }
                this.db[json.id] = dbEntry
                this.setImage(json.id, dbEntry)
                return json.id
            })
            .catch(error => {
                addAlert("error", gettext("Could not save encrypted image"))
                throw error
            })
    }

    // Add or update an in the image database both remotely and locally.
    setImage(id, imageData) {
        this.setLocalImage(id, imageData)
        this.unsent.push({
            type: "update",
            id
        })
        this.mustSend()
    }

    // Add or update an image only locally.
    setLocalImage(id, imageData) {
        this.db[id] = imageData
    }

    deleteImage(id) {
        this.deleteLocalImage(id)
        const wasDeleted = !this.db[id]
        if (wasDeleted && this.mod.editor.e2ee?.encrypted) {
            // For E2EE documents, also delete the encrypted image record
            // from the server. The diff-based delete is only for client
            // sync; the server cannot decrypt it to know what to remove.
            this.deleteE2EEImageFromServer(id)
        }
        this.unsent.push({
            type: "delete",
            id
        })
        this.mustSend()
    }

    deleteE2EEImageFromServer(id) {
        jsonPost("/api/document/delete_e2ee_image/", {
            doc_id: this.mod.editor.docInfo.id,
            image_id: id
        }).catch(() => {
            // Silently ignore — orphaned image records are acceptable
        })
    }

    deleteLocalImage(id) {
        const usedImages = []
        this.mod.editor.view.state.doc.descendants(node => {
            if (node.type.name === "figure" && node.attrs.image) {
                usedImages.push(node.attrs.image)
            }
        })
        if (!usedImages.includes(Number.parseInt(id))) {
            delete this.db[id]
            return
        }
        if (this.mod.editor.e2ee?.encrypted === true) {
            // E2EE images are per-document. If the image is still used in the
            // document, keep the local entry as-is. We cannot recover from the
            // shared user image DB because E2EE images are encrypted with this
            // document's unique key and are not reusable across documents.
            return
        }
        if (Object.keys(this.mod.editor.app.imageDB.db).includes(id)) {
            // Just directly reset the image as we already have the image present in user Image DB
            this.setImage(id, this.mod.editor.app.imageDB.db[id])
        } else {
            // If image is not present in both the userImage DB and docDB we can safely assume that we have to upload again.
            this.reUploadImage(
                id,
                this.db[id].image,
                this.db[id].title,
                this.db[id].copyright
            ).then(
                ({id, _newId}) => delete this.db[id],
                id => {
                    delete this.db[id]
                    const transaction = this.mod.editor.view.state.tr
                    this.mod.editor.view.state.doc.descendants((node, pos) => {
                        if (
                            node.type.name === "figure" &&
                            node.attrs.image == id
                        ) {
                            const attrs = Object.assign({}, node.attrs)
                            attrs["image"] = false
                            const nodeType =
                                this.mod.editor.currentView.state.schema.nodes[
                                    "figure"
                                ]
                            transaction.setNodeMarkup(pos, nodeType, attrs)
                        }
                    })
                    this.mod.editor.view.dispatch(transaction)
                    addAlert(
                        "error",
                        gettext(
                            "One of the Image(s) you copied could not be found on the server. Please try uploading it again."
                        )
                    )
                }
            )
        }
    }

    reUploadImage(id, imageUrl, title, copyright) {
        const isE2EE = this.mod.editor.e2ee?.encrypted === true
        if (isE2EE) {
            // E2EE images cannot be re-uploaded from a URL because the server
            // stores encrypted opaque bytes. If the image is missing locally,
            // the user must re-insert it manually.
            return Promise.reject(id)
        }

        const newPromise = new Promise((resolve, reject) => {
            // Depends on the fact that service worker is working and cached the image basically.
            get(imageUrl)
                .then(response => response.blob())
                .then(blob => {
                    const filename = imageUrl.split("/").pop()
                    const file = new File([blob], filename, {type: blob.type})
                    const x = {
                        image: file,
                        title: title,
                        cats: [],
                        copyright: copyright
                    }
                    this.mod.editor.app.imageDB.saveImage(x).then(
                        newId => {
                            const imageData = JSON.parse(
                                JSON.stringify(
                                    this.mod.editor.app.imageDB.db[newId]
                                )
                            )
                            this.setImage(newId, imageData)
                            this.mod.editor.view.state.doc.descendants(
                                (node, pos) => {
                                    if (
                                        node.type.name === "image" &&
                                        node.attrs.image == id
                                    ) {
                                        const attrs = Object.assign(
                                            {},
                                            node.attrs
                                        )
                                        attrs["image"] = newId
                                        const nodeType =
                                            this.mod.editor.currentView.state
                                                .schema.nodes["image"]
                                        const transaction =
                                            this.mod.editor.view.state.tr.setNodeMarkup(
                                                pos,
                                                nodeType,
                                                attrs
                                            )
                                        this.mod.editor.view.dispatch(
                                            transaction
                                        )
                                    }
                                }
                            )
                            resolve({id: id, newId: newId})
                        },
                        _error => reject(id)
                    )
                })
                .catch(_error => {
                    reject(id)
                })
        })
        return newPromise
    }

    hasUnsentEvents() {
        return this.unsent.length
    }

    unsentEvents() {
        return this.unsent.map(event => {
            if (event.type === "delete") {
                return event
            } else if (event.type === "update") {
                // Check image entry still exists. Otherwise ignore.
                const image = this.db[event.id]
                if (image) {
                    return {
                        type: "update",
                        id: event.id,
                        image
                    }
                } else {
                    return {
                        type: "ignore"
                    }
                }
            }
        })
    }

    eventsSent(n) {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events) {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalImage(event.id)
            } else if (event.type == "update") {
                this.setLocalImage(event.id, event.image)
            }
        })
    }

    findImage(imageData) {
        return Object.keys(this.db).find(
            id => this.db[id].checksum === imageData.checksum
        )
    }

    hasImage(imageData) {
        if (this.findImage(imageData) !== undefined) {
            return true
        } else {
            return false
        }
    }
}

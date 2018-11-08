/*
 Class to provide similar functionality for the document's imageDB to what the
 user's imageDb provides but using the document's websocket connection.
 Notice: It is not possible to directly upload images via this interface as
 images should not be uploaded via websocket. To add a new image to a document,
 the image needs to be uploaded first to the user's imageDB and can then be
 copied to the doc's imageDB. The IDs used are the same for user and document,
 as they originate from the Image model (not UserImage or DocumentImage).
*/

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
            () => this.mod.editor.mod.collab.docChanges.sendToCollaborators(),
            100
        )
    }

    // This function only makes real sense in the user's imageDB. It is kept here
    // for compatibility reasons.
    getDB() {
        return new Promise(resolve => {
            window.setTimeout(
                () => resolve([]),
                100
            )
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
        this.unsent.push({
            type: "delete",
            id
        })
        this.mustSend()
    }

    deleteLocalImage(id) {
        delete this.db[id]
    }


    hasUnsentEvents() {
        return this.unsent.length
    }

    unsentEvents() {
        return this.unsent.map(
            event => {
                if (event.type === 'delete') {
                    return event
                } else if (event.type === 'update') {
                    // Check image entry still exists. Otherwise ignore.
                    const image = this.db[event.id]
                    if (image) {
                        return {
                            type: 'update',
                            id: event.id,
                            image
                        }
                    } else {
                        return {
                            type: 'ignore'
                        }
                    }

                }
            }
        )
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

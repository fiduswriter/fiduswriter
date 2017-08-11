function randomID() {
    return Math.floor(Math.random() * 0xffffffff)
}

export class ModBibliographyDB {
    constructor(mod) {
        mod.bibDB = this
        this.mod = mod
        this.db = {}
        this.unsent = []
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

    // function saveBibEntries is the same as in user's individual BibliographyDB.
    // Function added to make document's and user's bibDBs be connectable to the
    // same interface functions.
    saveBibEntries(tmpDB, isNew) {
        let idTranslations = []
        Object.keys(tmpDB).forEach(bibKey => {
            let reference = tmpDB[bibKey]
            delete reference.entry_cat
            if (isNew) {
                let id = this.addReference(bibKey, reference)
                idTranslations.push([bibKey, id])
            } else {
                this.updateReference(bibKey, reference)
                idTranslations.push([bibKey, bibKey])
            }
            // We don't use entry_cats in the document internal bibDB, so just
            // to make sure, we remove it.
        })
        return Promise.resolve(idTranslations)
    }

    // Function added here for compatibility with user's bibDB. See comment at
    // saveBibEntries function.
    deleteBibEntries(ids) {
        ids.forEach(id => this.deleteReference(id))
        return Promise.resolve(ids)
    }

    addReference(id, reference) {
        while(!id || this.db[id]) {
            id = randomID()
        }
        this.updateReference(id, reference)
        return id
    }

    // Add or update a reference to the bibliography database both remotely and locally.
    updateReference(id, reference) {
        this.updateLocalReference(id, reference)
        this.unsent.push({
            type: "update",
            id,
            reference
        })
        this.mustSend()
    }

    // Add or update a reference only locally.
    updateLocalReference(id, reference) {
        this.db[id] = reference
    }

    deleteReference(id) {
        this.deleteLocalReference(id)
        this.unsent.push({
            type: "delete",
            id
        })
        this.mustSend()
    }

    deleteLocalReference(id) {
        delete this.db[id]
    }


    hasUnsentEvents() {
        return this.unsent.length
    }

    unsentEvents() {
        return this.unsent
    }

    eventsSent(n) {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events) {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalReference(event.id)
            } else if (event.type == "update") {
                this.updateLocalReference(event.id, event.reference)
            }
        })

    }

}

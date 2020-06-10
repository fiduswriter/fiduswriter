export class indexedDB {
    constructor(app) {
        this.app = app
        this.init()
    }

    init() {
        this.app['db_config'] = {
            "db_name": this.app.config.user.username,
        }

        // Open/Create db if it doesn't exist
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = function(_event) {
            //
        }

        request.onsuccess = (event) => {
            const database = event.target.result
            this.app.db_config['version'] = database.version
            database.close()
            if (this.app.db_config.version < 2)
                this.createDBSchema()
        }
    }

    createDBSchema() {
        this.app.db_config.version += 1
        const new_request = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
        new_request.onupgradeneeded = function(event) {
            const db = event.target.result
            db.createObjectStore("documents", {
                keyPath: "id"
            })
            db.createObjectStore("document_templates", {
                keyPath: "pk"
            })
            db.createObjectStore("team_members", {
                keyPath: "id"
            })
            db.createObjectStore("document_styles", {
                keyPath: "title"
            })
            db.createObjectStore("contacts_list", {
                keyPath: "id"
            })
            db.close()
        }
    }

    createObjectStore(name, options) {
        this.app.db_config.version += 1
        const new_request = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
        new_request.onupgradeneeded = function(event) {
            const db = event.target.result
            db.createObjectStore(name, options)
        }
    }

    updateData(objectStoreName, data) {
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = function(_event) {
            //
        }

        request.onsuccess = (event) => {
            const db = event.target.result
            const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
            for (const d in data) {
                objectStore.put(d)
            }
        }
    }

    insertData(objectStoreName, data) {
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = function(_event) {
            //
        }
        request.onsuccess = (event) => {
            const db = event.target.result
            const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
            if (data !== undefined) {
                data.forEach(function(document) {
                    objectStore.put(document)
                })
            }
        }
    }

    clearData(objectStoreName) {
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = function(_event) {
            //
        }
        request.onsuccess = (event) => {
            const db = event.target.result
            const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
            objectStore.clear()
        }
    }

    readAllData(objectStoreName) {
        const new_promise = new Promise((resolve, _reject) => {
            const request = window.indexedDB.open(this.app.db_config.db_name)
            request.onerror = function(_event) {
                //
            }
            request.onsuccess = (event) => {
                const db = event.target.result
                const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
                const read_all_request = objectStore.getAll()
                read_all_request.onerror = function(_event) {
                    // Handle errors!
                }
                read_all_request.onsuccess = function(_event) {
                    // Do something with the request.result!
                    resolve(read_all_request.result)
                }
            }
        })
        return new_promise
    }
}
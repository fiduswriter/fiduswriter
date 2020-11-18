export class IndexedDB {
    constructor(app) {
        this.app = app
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
            if (this.app.db_config.version < 2) {
                this.createDBSchema()
            }
        }
    }

    createDBSchema() {
        // Return a promise which will be resolved after the Indexed DB
        // and the object stores are created.
        return new Promise(resolve => {
            this.app.db_config.version += 1
            const newRequest = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
            newRequest.onupgradeneeded = event => {
                const db = event.target.result
                Object.entries(this.app.routes).forEach(
                    ([route, props]) => {
                        if (props.dbTables) {
                            Object.entries(props.dbTables).forEach(
                                ([tableName, tableProperties]) => db.createObjectStore(`${route}_${tableName}`, tableProperties)
                            )
                        }
                    }
                )
                db.close()
                resolve()
            }
        })
    }

    createObjectStore(name, options) {
        this.app.db_config.version += 1
        const newRequest = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
        newRequest.onupgradeneeded = function(event) {
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

    insertData(objectStoreName, data, retry = true) {
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = function(_event) {
            //
        }
        request.onsuccess = (event) => {
            const db = event.target.result
            try {
                const transaction = db.transaction(objectStoreName, 'readwrite')
                const objectStore = transaction.objectStore(objectStoreName)
                if (data !== undefined) {
                    data.forEach(document => {
                        objectStore.put(document)
                    })
                }
            } catch (error) {
                if (retry) {
                    // Before resetting IndexedDB make sure to close connections to avoid blocking the
                    // delete IndexedDB process
                    db.close()
                    this.reset().then(() =>
                        this.insertData(objectStoreName, data, false)
                    )
                    return
                } else {
                    throw error
                }

            }
        }
    }

    reset() {
        return new Promise(resolve => {
            const delRequest = window.indexedDB.deleteDatabase(this.app.db_config.db_name)
            delRequest.onsuccess = () => {
                // Resolve the promise after the indexedDB is set up.
                this.createDBSchema().then(() => resolve())
            }
        })

    }

    clearData(objectStoreName) {
        return new Promise(resolve => {
            const request = window.indexedDB.open(this.app.db_config.db_name)
            request.onerror = () => {}
            request.onsuccess = event => {
                const db = event.target.result
                try {
                    const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
                    const objectStoreReq = objectStore.clear()
                    objectStoreReq.onsuccess = () => {
                        db.close()
                        // Resolve the promise after the ObjectStore has been cleared.
                        resolve()
                    }
                } catch (error) {
                    // Before resetting IndexedDB make sure to close connections to avoid blocking the
                    // delete IndexedDB process
                    db.close()
                    if (error.name === 'NotFoundError') {
                        // Resolve the promise after indexed DB is set up.
                        this.reset().then(() => resolve())
                    } else {
                        throw error
                    }
                }
            }
        })
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

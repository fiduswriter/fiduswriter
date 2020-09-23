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
        }
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
            const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
            if (data !== undefined) {
                data.forEach(document => {
                    try {
                        objectStore.put(document)
                    } catch (error) {
                        if (retry) {
                            this.reset().then(
                                this.insertData(objectStoreName, data, false)
                            )
                        } else {
                            throw error
                        }
                    }

                })
            }
        }
    }

    reset() {
        return new Promise(resolve => {
            const delRequest = window.indexedDB.deleteDatabase(this.app.db_config.db_name)
            delRequest.onsuccess = () => {
                this.createDBSchema()
                resolve()
            }
        })

    }

    clearData(objectStoreName) {
        const request = window.indexedDB.open(this.app.db_config.db_name)
        request.onerror = () => {}
        request.onsuccess = event => {
            const db = event.target.result
            try {
                const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
                objectStore.clear()
            } catch (error) {
                if (error.name === 'NotFoundError') {
                    this.reset()
                } else {
                    throw error
                }
            }

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

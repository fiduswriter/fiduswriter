export class indexedDB {
  constructor(app) {
    this.app = app
    this.init()
  }

  init() {
    this.app['db_config'] = {
      "db_name":this.app.config.user.username,
    }

    // Open/Create db if it doesn't exist
    const request = window.indexedDB.open(this.app.db_config.db_name)
    request.onerror = function(event) {
      //
    }

    request.onsuccess = (event) => {
        const database = event.target.result
        this.app.db_config['version']=database.version
        database.close()
        if (this.app.db_config.version<2)
          this.createDBSchema()
    }
  }

  createDBSchema() {
    this.app.db_config.version+=1
    const new_request = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
    new_request.onupgradeneeded = function(event) {
        const db = event.target.result
        db.createObjectStore("documents", {keyPath: "id"})
        db.createObjectStore("document_templates", {keyPath: "pk"})
        db.createObjectStore("team_members", {keyPath: "id"})
        db.createObjectStore("export_templates")
        db.createObjectStore("document_styles", {keyPath : "title"})
        db.createObjectStore("contacts_list", {keyPath : "id"})
        db.createObjectStore("image_db", {keyPath : "name"})
        db.close()
    }
  }

  createObjectStore(name, options) {
    this.app.db_config.version+=1
    const new_request = window.indexedDB.open(this.app.db_config.db_name, this.app.db_config.version)
    new_request.onupgradeneeded = function(event) {
        const db = event.target.result
        db.createObjectStore(name, options)
    }
  }

  updateData(objectStoreName, data) {
    const request = window.indexedDB.open(this.app.db_config.db_name)
    request.onerror = function(event) {
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
    request.onerror = function(event) {
      //
    }
    request.onsuccess = (event) => {
      const db = event.target.result
      const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
      if (data !== undefined) {
        data.forEach(function(document) {
          objectStore.add(document)
        })
      }
    }
  }

  clearData(objectStoreName) {
    const request = window.indexedDB.open(this.app.db_config.db_name)
    request.onerror = function(event) {
      //
    }
    request.onsuccess = (event) => {
      const db = event.target.result
      const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
      objectStore.clear()
    }
  }

  readAllData(objectStoreName) {
    const new_promise = new Promise((resolve, reject)=>{
      const request = window.indexedDB.open(this.app.db_config.db_name)
      request.onerror = function(event) {
        //
      }
      request.onsuccess = (event) => {
        const db = event.target.result
        const objectStore = db.transaction(objectStoreName, 'readwrite').objectStore(objectStoreName)
        const read_all_request = objectStore.getAll()
          read_all_request.onerror = function(event) {
            // Handle errors!
          }
          read_all_request.onsuccess = function(event) {
            // Do something with the request.result!
            resolve(read_all_request.result)
          }
      }
    })
    return new_promise
  }

  saveImage(imageData, filename) {
    const request = window.indexedDB.open(this.app.db_config.db_name)
    request.onerror = function(event) {
      //
    }
    request.onsuccess = (event) => {
      const db = event.target.result
      const reader = new FileReader()
      reader.readAsDataURL(imageData)
      reader.onload = function(e) {
        //alert(e.target.result);
        const bits = e.target.result
        const ob = {
          name:filename.split('/').pop(),
          data:bits
        }

        const trans = db.transaction(['image_db'], 'readwrite')
        const addReq = trans.objectStore('image_db').put(ob)

        addReq.onerror = function(e) {
          //
        }

        trans.oncomplete = function(e) {
          //
        }
      }
    }
  }

  readImage(name) {
    const new_promise = new Promise((resolve, reject)=>{
      const request = window.indexedDB.open(this.app.db_config.db_name)
      request.onerror = function(event) {
        //
      }
      request.onsuccess = (event) => {
        const db = event.target.result
        const trans = db.transaction(['image_db'], 'readonly')
        //hard coded id
        const req = trans.objectStore('image_db').get(name)
        req.onsuccess = function(e) {
          const record = e.target.result
          resolve(record.data)
        }
      }
    })
    return new_promise
  }

  checkImagePresent(name) {
    const new_promise = new Promise((resolve, reject)=>{
      const request = window.indexedDB.open(this.app.db_config.db_name)
      request.onerror = function(event) {
        //
      }
      request.onsuccess = (event) => {
        const db = event.target.result
        const trans = db.transaction(['image_db'], 'readonly')
        //hard coded id
        const count_req = trans.objectStore('image_db').count(name)
        count_req.onsuccess = function(e) {
          const record = e.target.result
          if (record == 1) resolve(true)
          else resolve(false)
        }
      }
    })
    return new_promise
  }

  updateExportTemplate(blob) {
    const request = window.indexedDB.open(this.app.db_config.db_name)
    request.onerror = function(event) {
      //
    }

    request.onsuccess = (event) => {
      const db = event.target.result
      const objectStore = db.transaction('export_templates', 'readwrite').objectStore('export_templates')
      objectStore.put(blob, blob.filepath)
    }
  }

  readTemplate(url) {
    const new_promise = new Promise((resolve, reject)=>{
      const request = window.indexedDB.open(this.app.db_config.db_name)
      request.onerror = function(event) {
        //
      }
      request.onsuccess = (event) => {
        const db = event.target.result
        const trans = db.transaction(['export_templates'], 'readonly')
        const req = trans.objectStore('export_templates').get(url)
        req.onsuccess = function(e) {
          const record = e.target.result
          resolve(record)
        }
      }
    })
    return new_promise

  }
}
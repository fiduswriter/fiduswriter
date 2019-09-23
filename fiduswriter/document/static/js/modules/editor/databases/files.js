/*
 Class to provide similar functionality for the document's imageDB to what the
 user's imageDb provides but using the document's websocket connection.
 Notice: It is not possible to directly upload images via this interface as
 images should not be uploaded via websocket. To add a new image to a document,
 the image needs to be uploaded first to the user's imageDB and can then be
 copied to the doc's imageDB. The IDs used are the same for user and document,
 as they originate from the Image model (not UserImage or DocumentImage).
*/

export class ModFileDB {
  constructor(mod) {
      console.log("this inside ModFileDB :-", mod)
      mod.fileDB = this
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

  // Add or update a file in the file database both remotely and locally.
  setFile(id, fileData) {
      this.setLocalImage(id, fileData)
      this.unsent.push({
          type: "update",
          id
      })
      this.mustSend()
  }

  // Add or update an image only locally.
  setLocalFile(id, fileData) {
      this.db[id] = fileData
  }

  deleteFile(id) {
      this.deleteLocalFile(id)
      this.unsent.push({
          type: "delete",
          id
      })
      this.mustSend()
  }

  deleteLocalFile(id) {
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
                  const file = this.db[event.id]
                  if (file) {
                      return {
                          type: 'update',
                          id: event.id,
                          file
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
              this.deleteLocalFile(event.id)
          } else if (event.type == "update") {
              this.setLocalFile(event.id, event.file)
          }
      })
  }

  findFile(fileData) {
      return Object.keys(this.db).find(
          id => this.db[id].checksum === fileData.checksum
      )
  }

  hasFile(fileData) {
      if (this.findFile(fileData) !== undefined) {
          return true
      } else {
          return false
      }
  }

}

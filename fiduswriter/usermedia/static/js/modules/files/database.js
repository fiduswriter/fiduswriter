import {activateWait, deactivateWait, postJson, addAlert} from "../common"

/* A class that holds information about images uploaded by the user. */

export class FileDB {
    constructor() {
        this.db = {}
    }

    getDB() {
        this.db = {}

        activateWait()

        return postJson('/api/usermedia/attachments/').then(
            ({json}) => {
                console.log("Attachments :- ", json.attachments)
                json.attachments.forEach(
                    file => {
                        this.db[file.id] = file.name
                    }

                )
                console.log("this db :- ", this.db)
                deactivateWait()
                return
            }
        )
    }


}
